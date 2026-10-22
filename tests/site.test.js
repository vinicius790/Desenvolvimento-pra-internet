// Verificação de integridade do site estático, nas duas línguas (raiz em português e
// en/ em inglês): referências locais, IDs usados pelo JavaScript, regras básicas de
// HTML/acessibilidade, pares pt/en, dados em JSON, índice da busca e codificação.
// Rodar com: node --test
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { gerarArquivos, linksDeIdioma, URL_DO_SITE } = require('../scripts/gerar-indice.js');

const RAIZ = path.join(__dirname, '..');
const htmlDe = (pasta) => fs.readdirSync(path.join(RAIZ, pasta)).filter((nome) => nome.endsWith('.html')).sort();
const PAGINAS_PT = htmlDe('.');
const PAGINAS_EN = htmlDe('en').map((nome) => `en/${nome}`);
const PAGINAS = [...PAGINAS_PT, ...PAGINAS_EN];
// Páginas exibidas no quadro do raio-X: não têm cabeçalho, menu nem rodapé.
const QUADROS = ['google-glass.html', 'en/google-glass.html'];
const BUSCAS = ['busca.html', 'en/search.html'];
const FOLHAS = fs.readdirSync(path.join(RAIZ, '_css')).filter((nome) => nome.endsWith('.css'));

const ler = (relativo) => fs.readFileSync(path.join(RAIZ, relativo), 'utf8');
const idiomaDe = (nome) => (nome.startsWith('en/') ? 'en' : 'pt-BR');
/** Caminho, a partir da raiz, de uma URL relativa escrita na página dada. */
const resolver = (pagina, url) => path.posix.normalize(path.posix.join(path.posix.dirname(pagina), url));
/** Como resolver(), mas aceita também as URLs absolutas do site (com URL_DO_SITE preenchida no gerador). */
const caminhoDoLink = (pagina, url) => (URL_DO_SITE && url.startsWith(URL_DO_SITE)
	? url.slice(URL_DO_SITE.length).replace(/(^|\/)$/, '$1index.html')
	: resolver(pagina, url));

/** Extrai as tags de abertura de um HTML como { nome, attrs }. */
function tags(html) {
	const semComentarios = html.replace(/<!--[\s\S]*?-->/g, '');
	const lista = [];
	const reTag = /<([a-zA-Z][\w-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>]+))?)*)\s*\/?>/g;
	const reAttr = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>]+)))?/g;
	for (const tag of semComentarios.matchAll(reTag)) {
		const attrs = {};
		for (const attr of tag[2].matchAll(reAttr)) {
			attrs[attr[1].toLowerCase()] = attr[2] ?? attr[3] ?? attr[4] ?? '';
		}
		lista.push({ nome: tag[1].toLowerCase(), attrs });
	}
	return lista;
}

const paginas = Object.fromEntries(PAGINAS.map((nome) => {
	const html = ler(nome);
	const lista = tags(html);
	const ids = lista.filter((tag) => 'id' in tag.attrs).map((tag) => tag.attrs.id);
	return [nome, { html, tags: lista, ids }];
}));

/** Página equivalente na outra língua, lida do <link rel="alternate" hreflang>. */
function parDe(nome) {
	const outro = idiomaDe(nome) === 'en' ? 'pt-BR' : 'en';
	const link = paginas[nome].tags.find((tag) => tag.nome === 'link' && tag.attrs.rel === 'alternate' && tag.attrs.hreflang === outro);
	return link ? caminhoDoLink(nome, link.attrs.href) : undefined;
}

/** Confere se o caminho existe respeitando maiúsculas/minúsculas (o GitHub Pages roda em Linux). */
function existeExato(relativo) {
	let atual = RAIZ;
	for (const parte of relativo.split('/')) {
		if (parte === '.' || parte === '') {
			continue;
		}
		if (parte === '..') {
			return false;
		}
		if (!fs.existsSync(atual) || !fs.statSync(atual).isDirectory() || !fs.readdirSync(atual).includes(parte)) {
			return false;
		}
		atual = path.join(atual, parte);
	}
	return true;
}

const ehExterna = (url) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url);

test('o site tem 9 páginas em português e as mesmas 9 em inglês', () => {
	assert.equal(PAGINAS_PT.length, 9);
	assert.equal(PAGINAS_EN.length, 9);
});

test('toda referência local das páginas aponta para arquivo e âncora existentes', () => {
	const problemas = [];
	let conferidas = 0;
	for (const [nome, pagina] of Object.entries(paginas)) {
		for (const tag of pagina.tags) {
			for (const atributo of ['href', 'src', 'poster', 'data-icone', 'data-dados', 'action']) {
				const url = tag.attrs[atributo];
				if (url === undefined || ehExterna(url)) {
					continue;
				}
				conferidas += 1;
				const [arquivo, ancora] = url.split('#');
				const alvo = arquivo === '' ? nome : resolver(nome, decodeURI(arquivo));
				if (!existeExato(alvo)) {
					problemas.push(`${nome}: ${atributo}="${url}" não existe`);
				} else if (ancora && paginas[alvo] && !paginas[alvo].ids.includes(ancora)) {
					problemas.push(`${nome}: âncora #${ancora} não existe em ${alvo}`);
				}
			}
		}
	}
	assert.deepEqual(problemas, []);
	assert.ok(conferidas > 400, `poucas referências conferidas: ${conferidas}`);
});

test('toda url() dos CSS aponta para arquivo existente e não há @import externo', () => {
	const problemas = [];
	for (const folha of FOLHAS) {
		const css = ler(`_css/${folha}`).replace(/\/\*[\s\S]*?\*\//g, '');
		if (/@import/i.test(css)) {
			problemas.push(`${folha}: usa @import`);
		}
		for (const achado of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
			if (!ehExterna(achado[1]) && !existeExato(path.posix.join('_css', achado[1]))) {
				problemas.push(`${folha}: url(${achado[1]}) não existe`);
			}
		}
	}
	assert.deepEqual(problemas, []);
});

test('todos os arquivos de _css, _javascript, _imagens e _dados são usados por alguma página ou CSS', () => {
	const fontes = [...PAGINAS.map(ler), ...FOLHAS.map((folha) => ler(`_css/${folha}`))].join('\n');
	const orfaos = [];
	for (const pasta of ['_css', '_javascript', '_imagens', '_dados']) {
		for (const arquivo of fs.readdirSync(path.join(RAIZ, pasta))) {
			// Os JSON de _dados/ são a fonte dos scripts gerados (_dados/x.js), que as páginas carregam.
			const usado = arquivo.endsWith('.json') ? `${pasta}/${arquivo.replace(/\.json$/, '.js')}` : `${pasta}/${arquivo}`;
			if (!fontes.includes(usado)) {
				orfaos.push(`${pasta}/${arquivo}`);
			}
		}
	}
	assert.deepEqual(orfaos, []);
});

test('os IDs que o JavaScript procura existem nas páginas que carregam cada script', () => {
	const problemas = [];
	for (const [nome, pagina] of Object.entries(paginas)) {
		const scripts = pagina.tags.filter((tag) => tag.nome === 'script' && tag.attrs.src).map((tag) => tag.attrs.src);
		for (const script of scripts) {
			const codigo = ler(resolver(nome, script));
			const procurados = [
				...codigo.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g),
				...codigo.matchAll(/querySelector(?:All)?\(\s*['"]#([\w-]+)/g),
			].map((achado) => achado[1]);
			for (const id of procurados) {
				// O botão de tema é opcional: as páginas do quadro carregam tema.js sem ter o botão.
				if (!pagina.ids.includes(id) && !(['alternar-tema', 'alternar-contraste', 'alternar-fonte'].includes(id) && QUADROS.includes(nome))) {
					problemas.push(`${nome}: ${script} procura #${id}, que não existe`);
				}
			}
		}
	}
	assert.deepEqual(problemas, []);
});

test('IDs são únicos e as referências entre elementos (for, aria-*, list) existem', () => {
	const problemas = [];
	for (const [nome, pagina] of Object.entries(paginas)) {
		const repetidos = pagina.ids.filter((id, indice) => pagina.ids.indexOf(id) !== indice);
		if (repetidos.length > 0) {
			problemas.push(`${nome}: IDs repetidos ${repetidos.join(', ')}`);
		}
		for (const tag of pagina.tags) {
			for (const atributo of ['for', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'list']) {
				for (const id of (tag.attrs[atributo] || '').split(/\s+/).filter(Boolean)) {
					if (!pagina.ids.includes(id)) {
						problemas.push(`${nome}: ${atributo}="${id}" aponta para ID inexistente`);
					}
				}
			}
		}
	}
	assert.deepEqual(problemas, []);
});

test('cada página tem idioma, viewport, título e descrição próprios e um único h1', () => {
	const titulos = new Set();
	const descricoes = new Set();
	for (const [nome, pagina] of Object.entries(paginas)) {
		const html = pagina.tags.find((tag) => tag.nome === 'html');
		assert.equal(html.attrs.lang, idiomaDe(nome), `${nome}: lang`);
		assert.ok(pagina.tags.some((tag) => tag.nome === 'meta' && tag.attrs.charset === 'utf-8'), `${nome}: charset`);
		assert.ok(pagina.tags.some((tag) => tag.nome === 'meta' && tag.attrs.name === 'viewport'), `${nome}: viewport`);

		const titulo = /<title>([^<]+)<\/title>/.exec(pagina.html);
		assert.ok(titulo && titulo[1].trim().length > 10, `${nome}: título`);
		titulos.add(titulo[1]);

		const descricao = pagina.tags.find((tag) => tag.nome === 'meta' && tag.attrs.name === 'description');
		assert.ok(descricao && descricao.attrs.content.length > 40, `${nome}: descrição`);
		descricoes.add(descricao.attrs.content);

		assert.equal(pagina.tags.filter((tag) => tag.nome === 'h1').length, 1, `${nome}: quantidade de h1`);
		assert.equal(pagina.tags.filter((tag) => tag.nome === 'main').length, 1, `${nome}: quantidade de main`);
	}
	assert.equal(titulos.size, PAGINAS.length, 'títulos repetidos');
	assert.equal(descricoes.size, PAGINAS.length, 'descrições repetidas');
});

test('os títulos não pulam níveis (h1, h2, h3...)', () => {
	for (const [nome, pagina] of Object.entries(paginas)) {
		let anterior = 0;
		for (const tag of pagina.tags.filter((item) => /^h[1-6]$/.test(item.nome))) {
			const nivel = Number(tag.nome[1]);
			assert.ok(nivel <= anterior + 1, `${nome}: <${tag.nome}> depois de h${anterior}`);
			anterior = nivel;
		}
	}
});

test('acessibilidade básica: alt nas imagens, título no iframe, links externos seguros', () => {
	for (const [nome, pagina] of Object.entries(paginas)) {
		for (const tag of pagina.tags) {
			if (tag.nome === 'img') {
				assert.ok('alt' in tag.attrs, `${nome}: <img src="${tag.attrs.src}"> sem alt`);
				assert.ok(tag.attrs.width && tag.attrs.height, `${nome}: <img src="${tag.attrs.src}"> sem width/height`);
			}
			if (tag.nome === 'iframe') {
				assert.ok(tag.attrs.title, `${nome}: iframe sem title`);
				assert.equal('scrolling' in tag.attrs, false, `${nome}: iframe com scrolling`);
			}
			if (tag.nome === 'button') {
				assert.ok(tag.attrs.type, `${nome}: <button> sem type`);
			}
			if (tag.attrs.target === '_blank') {
				assert.match(tag.attrs.rel || '', /noopener/, `${nome}: link externo sem rel="noopener"`);
			}
			assert.notEqual(tag.attrs.target, 'blank', `${nome}: target="blank" (o correto é "_blank")`);
		}
	}
});

test('regressão: nada de handlers inline, script solto, hgroup, mailto ou campo de senha', () => {
	for (const [nome, pagina] of Object.entries(paginas)) {
		for (const tag of pagina.tags) {
			const inline = Object.keys(tag.attrs).filter((atributo) => /^on[a-z]+$/.test(atributo));
			assert.deepEqual(inline, [], `${nome}: handler inline em <${tag.nome}>`);
			assert.equal('style' in tag.attrs, false, `${nome}: estilo inline em <${tag.nome}>`);
			assert.notEqual(tag.nome, 'hgroup', `${nome}: usa hgroup`);
			assert.notEqual(tag.attrs.type, 'password', `${nome}: campo de senha`);
			assert.equal('language' in tag.attrs, false, `${nome}: atributo language`);
			if (tag.nome === 'script') {
				assert.ok(tag.attrs.src, `${nome}: script embutido na página`);
			}
		}
		assert.doesNotMatch(pagina.html, /mailto:/i, `${nome}: contém mailto`);
		assert.doesNotMatch(pagina.html, /[\w.+-]+@(?!exemplo\.com|example\.com)[\w-]+\.[\w.]+/, `${nome}: contém endereço de e-mail`);
		assert.ok(pagina.html.indexOf('<script') === -1 || pagina.html.lastIndexOf('<script') < pagina.html.indexOf('</head>'),
			`${nome}: script fora do <head>`);
	}
});

test('mídias existem e usam player nativo com controls e preload="none"', () => {
	const porLingua = { 'pt-BR': 0, en: 0 };
	for (const [nome, pagina] of Object.entries(paginas)) {
		for (const tag of pagina.tags.filter((item) => item.nome === 'video' || item.nome === 'audio')) {
			porLingua[idiomaDe(nome)] += 1;
			assert.ok('controls' in tag.attrs, `${nome}: <${tag.nome}> sem controls`);
			assert.equal(tag.attrs.preload, 'none', `${nome}: <${tag.nome}> sem preload="none"`);
			assert.equal('autoplay' in tag.attrs, false, `${nome}: <${tag.nome}> com autoplay`);
		}
	}
	assert.deepEqual(porLingua, { 'pt-BR': 4, en: 4 }, 'esperados 3 vídeos e 1 áudio em cada língua');
});

test('o formulário lista as 27 unidades da federação, sem repetição, nas duas línguas', () => {
	const esperadas = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
		'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
	for (const nome of ['fale-conosco.html', 'en/contact.html']) {
		const select = /<select[^>]*id="cEst"[\s\S]*?<\/select>/.exec(paginas[nome].html)[0];
		const siglas = [...select.matchAll(/<option value="([A-Z]{2})">/g)].map((achado) => achado[1]);
		assert.deepEqual([...siglas].sort(), esperadas, nome);
		assert.match(select, />Tocantins</, nome);
	}
});

test('arquivos de texto estão em UTF-8 válido, sem BOM e sem mojibake', () => {
	const IGNORAR = new Set(['.git', 'node_modules', '_media', 'BACKUP_ORIGINAL_antes_de_organizar.zip', 'LOG_REORGANIZACAO.txt']);
	const TEXTO = new Set(['.html', '.css', '.js', '.json', '.md', '.svg', '.yml', '.txt', '']);
	// Sinal típico de UTF-8 lido como Latin-1/Windows-1252: "A" com til ou circunflexo seguido de um
	// símbolo (em português legítimo, como em "BOTÃO", vem uma letra depois), além do caractere de substituição.
	const mojibake = /[\u00C3\u00C2][\u0080-\u00BF\u0152-\u0192\u02C6\u02DC\u2013-\u203A\u20AC\u2122]|\uFFFD/;
	const problemas = [];
	let conferidos = 0;

	(function percorrer(pasta) {
		for (const item of fs.readdirSync(pasta, { withFileTypes: true })) {
			if (IGNORAR.has(item.name)) {
				continue;
			}
			const caminho = path.join(pasta, item.name);
			if (item.isDirectory()) {
				percorrer(caminho);
			} else if (TEXTO.has(path.extname(item.name).toLowerCase())) {
				const bytes = fs.readFileSync(caminho);
				const relativo = path.relative(RAIZ, caminho);
				conferidos += 1;
				if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
					problemas.push(`${relativo}: tem BOM`);
				}
				let texto;
				try {
					texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
				} catch {
					problemas.push(`${relativo}: não é UTF-8 válido`);
					continue;
				}
				if (mojibake.test(texto)) {
					problemas.push(`${relativo}: contém mojibake`);
				}
			}
		}
	})(RAIZ);

	assert.deepEqual(problemas, []);
	assert.ok(conferidos > 80, `poucos arquivos conferidos: ${conferidos}`);
});

test('regressão: o quadro do raio-X abre sem âncora no src', () => {
	// Com src="google-glass.html#topo", o navegador rolava a própria specs.html até o quadro
	// ao carregar (174 px no desktop, 630 px em 375 px), escondendo o menu e o título.
	for (const nome of ['specs.html', 'en/specs.html']) {
		const quadros = paginas[nome].tags.filter((tag) => tag.nome === 'iframe');
		assert.equal(quadros.length, 1, nome);
		assert.doesNotMatch(quadros[0].attrs.src, /#/, nome);
	}
});

test('os workflows de CI e publicação no GitHub Pages estão configurados e conferem o índice da busca', () => {
	const workflows = fs.readdirSync(path.join(RAIZ, '.github', 'workflows')).sort();
	assert.deepEqual(workflows, ['ci.yml', 'static.yml']);
	const workflowStatic = ler('.github/workflows/static.yml');
	assert.match(workflowStatic, /node --test/);
	assert.match(workflowStatic, /node scripts\/gerar-indice\.js --verificar/);
	// A publicação só roda na branch principal (nem em PR, nem em execução manual de outra branch).
	assert.match(workflowStatic, /if: github\.event_name != 'pull_request' && github\.ref == 'refs\/heads\/main'/);
	const workflowCi = ler('.github/workflows/ci.yml');
	assert.match(workflowCi, /node --test/);
	assert.match(workflowCi, /node scripts\/gerar-indice\.js --verificar/);
});

// ---------- Duas línguas ----------

test('cada página declara hreflang pt-BR, en e x-default, e o par aponta de volta', () => {
	for (const nome of PAGINAS) {
		const alternativas = Object.fromEntries(paginas[nome].tags
			.filter((tag) => tag.nome === 'link' && tag.attrs.rel === 'alternate')
			.map((tag) => [tag.attrs.hreflang, caminhoDoLink(nome, tag.attrs.href)]));
		assert.deepEqual(Object.keys(alternativas).sort(), ['en', 'pt-BR', 'x-default'], `${nome}: hreflang`);
		assert.equal(alternativas[idiomaDe(nome)], nome, `${nome}: hreflang da própria língua`);
		assert.equal(alternativas['x-default'], alternativas['pt-BR'], `${nome}: x-default`);

		const par = parDe(nome);
		assert.ok(paginas[par], `${nome}: o par ${par} não existe`);
		assert.notEqual(idiomaDe(par), idiomaDe(nome), `${nome}: par na mesma língua`);
		assert.equal(parDe(par), nome, `${nome}: ${par} não aponta de volta`);
	}
});

test('o seletor de idioma leva à mesma página na outra língua', () => {
	for (const nome of PAGINAS.filter((pagina) => !QUADROS.includes(pagina))) {
		const seletores = paginas[nome].tags.filter((tag) => tag.nome === 'a' && tag.attrs.class === 'idioma');
		assert.equal(seletores.length, 1, `${nome}: seletor de idioma`);
		const [seletor] = seletores;
		assert.equal(resolver(nome, seletor.attrs.href), parDe(nome), `${nome}: destino do seletor`);
		assert.equal(seletor.attrs.hreflang, idiomaDe(parDe(nome)), `${nome}: hreflang do seletor`);
		assert.equal(seletor.attrs.lang, seletor.attrs.hreflang, `${nome}: lang do seletor`);
	}
});

test('as duas línguas têm os mesmos recursos: IDs, scripts, folhas de estilo e itens de menu', () => {
	const arquivos = (nome, seletor) => paginas[nome].tags.filter(seletor).map((tag) => path.posix.basename(tag.attrs.src || tag.attrs.href));
	const ehScript = (tag) => tag.nome === 'script';
	const ehFolha = (tag) => tag.nome === 'link' && tag.attrs.rel === 'stylesheet';
	const icones = (nome) => paginas[nome].tags.filter((tag) => tag.attrs['data-icone']).map((tag) => path.posix.basename(tag.attrs['data-icone']));
	for (const nome of PAGINAS_PT) {
		const par = parDe(nome);
		assert.deepEqual(paginas[par].ids, paginas[nome].ids, `${nome} x ${par}: IDs`);
		assert.deepEqual(arquivos(par, ehScript), arquivos(nome, ehScript), `${nome} x ${par}: scripts`);
		assert.deepEqual(arquivos(par, ehFolha), arquivos(nome, ehFolha), `${nome} x ${par}: folhas de estilo`);
		assert.deepEqual(icones(par), icones(nome), `${nome} x ${par}: menu`);
	}
});

test('o menu tem os 7 itens em todas as páginas e marca a página atual', () => {
	for (const nome of PAGINAS.filter((pagina) => !QUADROS.includes(pagina))) {
		const itens = paginas[nome].tags.filter((tag) => tag.nome === 'a' && tag.attrs['data-icone']);
		assert.equal(itens.length, 7, `${nome}: itens de menu`);
		const atuais = itens.filter((tag) => tag.attrs['aria-current'] === 'page');
		if (BUSCAS.includes(nome)) {
			assert.equal(atuais.length, 0, `${nome}: a busca não está no menu`);
		} else {
			assert.equal(atuais.length, 1, `${nome}: aria-current`);
			assert.equal(resolver(nome, atuais[0].attrs.href), nome, `${nome}: aria-current na página errada`);
		}
	}
});

// ---------- Modo escuro ----------

test('toda página carrega tema.js antes da pintura e as que têm cabeçalho trazem o botão acessível', () => {
	for (const nome of PAGINAS) {
		const scripts = paginas[nome].tags.filter((tag) => tag.nome === 'script');
		assert.match(scripts[0].attrs.src, /_javascript\/tema\.js$/, `${nome}: tema.js deve ser o primeiro script`);
		assert.equal('defer' in scripts[0].attrs || 'async' in scripts[0].attrs, false, `${nome}: tema.js não pode ser adiado`);

		const botoes = paginas[nome].tags.filter((tag) => tag.attrs.id === 'alternar-tema');
		if (QUADROS.includes(nome)) {
			assert.equal(botoes.length, 0, `${nome}: o quadro não tem botão de tema`);
			continue;
		}
		assert.equal(botoes.length, 1, `${nome}: botão de tema`);
		assert.equal(botoes[0].nome, 'button', `${nome}: o alternador é um <button>`);
		assert.equal(botoes[0].attrs.type, 'button', `${nome}: type do botão de tema`);
		assert.equal(botoes[0].attrs['aria-pressed'], 'false', `${nome}: aria-pressed inicial`);
		const nomeAcessivel = new RegExp(`id="alternar-tema"[^>]*>.*<span class="so-leitor">(${idiomaDe(nome) === 'en' ? 'Dark mode' : 'Modo escuro'})</span>`);
		assert.match(paginas[nome].html, nomeAcessivel, `${nome}: nome acessível do botão de tema`);
		const botoesContraste = paginas[nome].tags.filter((tag) => tag.attrs.id === 'alternar-contraste');
		assert.equal(botoesContraste.length, 1, `${nome}: botão de alto contraste`);
		assert.equal(botoesContraste[0].nome, 'button', `${nome}: controle nativo de teclado`);
		assert.equal(botoesContraste[0].attrs.type, 'button', `${nome}: type do botão de contraste`);
		assert.equal(botoesContraste[0].attrs['aria-pressed'], 'false', `${nome}: estado inicial do contraste`);
		assert.equal(botoesContraste[0].attrs['aria-label'], idiomaDe(nome) === 'en' ? 'High contrast' : 'Alto contraste', `${nome}: rótulo localizado do contraste`);
		const botoesFonte = paginas[nome].tags.filter((tag) => tag.attrs.id === 'alternar-fonte');
		assert.equal(botoesFonte.length, 1, `${nome}: botão de alternância de tamanho de fonte`);
		assert.equal(botoesFonte[0].nome, 'button', `${nome}: controle nativo de teclado`);
		assert.equal(botoesFonte[0].attrs.type, 'button', `${nome}: type do botão de fonte`);
		assert.equal(botoesFonte[0].attrs['aria-pressed'], 'false', `${nome}: estado inicial da fonte`);
	}
});

/** Variáveis de cor (--nome: #rrggbb) declaradas em um bloco de CSS. */
function variaveis(bloco) {
	return Object.fromEntries([...bloco.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((achado) => [achado[1], achado[2]]));
}

/** Razão de contraste da WCAG 2 entre duas cores #rrggbb. */
function contraste(corA, corB) {
	const luminancia = (cor) => {
		const [r, g, b] = [1, 3, 5].map((inicio) => parseInt(cor.slice(inicio, inicio + 2), 16) / 255)
			.map((canal) => (canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4));
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	const [clara, escura] = [luminancia(corA), luminancia(corB)].sort((a, b) => b - a);
	return (clara + 0.05) / (escura + 0.05);
}

test('a paleta de alto contraste mantém pelo menos 7:1 nas combinações de texto dos dois temas', () => {
	const css = ler('_css/estilo.css');
	const blocoClaro = /:root\[data-contraste="alto"\]\s*\{([\s\S]*?)\n\}/.exec(css);
	const blocoEscuro = /:root\[data-tema="escuro"\]\[data-contraste="alto"\]\s*\{([\s\S]*?)\n\}/.exec(css);
	assert.ok(blocoClaro, 'paleta clara de alto contraste ausente');
	assert.ok(blocoEscuro, 'paleta escura de alto contraste ausente');
	const claro = variaveis(blocoClaro[1]);
	const escuro = variaveis(blocoEscuro[1]);
	const paresTexto = [
		['preto', 'branco'], ['preto', 'cinza-claro'], ['preto', 'cinza-medio'], ['preto', 'fundo-suave'],
		['cinza-texto', 'branco'], ['cinza-texto', 'cinza-claro'], ['cinza-texto', 'fundo-suave'],
		['cinza-forte', 'branco'], ['cinza-forte', 'cinza-claro'], ['branco', 'cinza-forte'],
		['branco', 'cinza-escuro'], ['cinza-escuro', 'branco'], ['erro', 'branco'], ['vermelho', 'branco'],
	];
	for (const [nome, cores] of [['claro', claro], ['escuro', escuro]]) {
		for (const [texto, fundo] of paresTexto) {
			assert.ok(contraste(cores[texto], cores[fundo]) >= 7, `${nome}: --${texto} sobre --${fundo} não atinge AAA`);
		}
		for (const cor of ['foco', 'borda-campo', 'vermelho']) {
			assert.ok(contraste(cores[cor], cores.branco) >= 3, `${nome}: --${cor} não atinge 3:1 sobre --branco`);
		}
	}

	const fallbackClaro = /@media \(prefers-contrast: more\)\s*\{\s*:root:not\(\[data-contraste\]\)\s*\{([\s\S]*?)\n\t\}/.exec(css);
	const fallbackEscuro = /:root\[data-tema="escuro"\]:not\(\[data-contraste\]\)\s*\{([\s\S]*?)\n\t\}/.exec(css);
	const fallbackSistemaEscuro = /@media \(prefers-contrast: more\) and \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-tema\]\):not\(\[data-contraste\]\)\s*\{([\s\S]*?)\n\t\}/.exec(css);
	assert.ok(fallbackClaro && fallbackEscuro && fallbackSistemaEscuro, 'fallback sem JavaScript para prefers-contrast incompleto');
	assert.deepEqual(variaveis(fallbackClaro[1]), claro, 'fallback claro difere da paleta controlável');
	assert.deepEqual(variaveis(fallbackEscuro[1]), escuro, 'fallback escuro difere da paleta controlável');
	assert.deepEqual(variaveis(fallbackSistemaEscuro[1]), escuro, 'fallback do sistema escuro difere da paleta controlável');
});
test('o tema escuro redefine as mesmas variáveis com e sem JavaScript e mantém contraste AA', () => {
	const css = ler('_css/estilo.css');
	const claro = variaveis(/:root \{([\s\S]*?)\n\}/.exec(css)[1]);
	const escuro = variaveis(/:root\[data-tema="escuro"\] \{([\s\S]*?)\n\}/.exec(css)[1]);
	const semJs = variaveis(/@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-tema\]\) \{([\s\S]*?)\n\t\}/.exec(css)[1]);
	assert.deepEqual(semJs, escuro, 'o bloco de prefers-color-scheme deve repetir o do tema escuro');
	assert.ok(Object.keys(escuro).length >= 12, 'poucas variáveis no tema escuro');
	for (const nome of Object.keys(escuro)) {
		assert.ok(nome in claro, `--${nome} não existe no tema claro`);
	}

	// Pares texto x fundo usados no site (os dois temas usam as mesmas variáveis).
	const pares = [
		['preto', 'branco'], ['preto', 'cinza-claro'], ['preto', 'cinza-medio'], ['preto', 'fundo-suave'],
		['cinza-texto', 'branco'], ['cinza-texto', 'cinza-claro'], ['cinza-texto', 'fundo-suave'],
		['cinza-forte', 'branco'], ['cinza-forte', 'cinza-claro'], ['branco', 'cinza-forte'],
		['branco', 'cinza-escuro'], ['cinza-escuro', 'branco'], ['erro', 'branco'],
		// Número dos pontos do raio-X (specs.css): texto --branco sobre fundo --vermelho.
		['branco', 'vermelho'],
	];
	for (const [tema, cores] of [['claro', claro], ['escuro', escuro]]) {
		for (const [texto, fundo] of pares) {
			const razao = contraste(cores[texto], cores[fundo]);
			assert.ok(razao >= 4.5, `tema ${tema}: --${texto} sobre --${fundo} tem contraste ${razao.toFixed(2)}`);
		}
		// Elementos de interface (foco, bordas de campo, marca ≠ e barra das diferenças do
		// comparador sobre o cabeçalho de linha cinza-claro): mínimo de 3:1.
		for (const [cor, fundo] of [['foco', 'branco'], ['borda-campo', 'branco'], ['vermelho', 'branco'], ['vermelho', 'cinza-claro']]) {
			const razao = contraste(cores[cor], cores[fundo]);
			assert.ok(razao >= 3, `tema ${tema}: --${cor} sobre --${fundo} tem contraste ${razao.toFixed(2)}`);
		}
	}
});

// ---------- Busca ----------

test('toda página com cabeçalho tem um formulário de busca rotulado que leva à página de busca', () => {
	for (const nome of PAGINAS.filter((pagina) => !QUADROS.includes(pagina))) {
		const forms = paginas[nome].tags.filter((tag) => tag.nome === 'form' && tag.attrs.role === 'search');
		assert.equal(forms.length, 1, `${nome}: formulário de busca`);
		assert.equal(resolver(nome, forms[0].attrs.action), idiomaDe(nome) === 'en' ? 'en/search.html' : 'busca.html', `${nome}: action`);
		const campos = paginas[nome].tags.filter((tag) => tag.nome === 'input' && tag.attrs.type === 'search');
		assert.equal(campos.length, 1, `${nome}: campo de busca`);
		assert.equal(campos[0].attrs.name, 'q', `${nome}: name do campo de busca`);
		assert.ok(paginas[nome].tags.some((tag) => tag.nome === 'label' && tag.attrs.for === campos[0].attrs.id), `${nome}: rótulo do campo de busca`);
	}
});

test('os arquivos gerados (índice, dados em script, links de idioma) estão em dia', () => {
	const desatualizados = Object.entries(gerarArquivos()).filter(([caminho, conteudo]) => ler(caminho) !== conteudo).map(([caminho]) => caminho);
	assert.deepEqual(desatualizados, [], 'rode "node scripts/gerar-indice.js"');
});

test('os dados em script são os mesmos dos JSON e nenhum script depende de fetch', () => {
	for (const nome of ['modelos', 'linha-do-tempo', 'indice-busca']) {
		const janela = {};
		vm.runInNewContext(ler(`_dados/${nome}.js`), { window: janela });
		// JSON.stringify: os objetos criados no vm têm outro protótipo de Object.
		assert.deepEqual(JSON.parse(JSON.stringify(janela.dadosDoSite[nome])), JSON.parse(ler(`_dados/${nome}.json`)), nome);
	}
	for (const script of fs.readdirSync(path.join(RAIZ, '_javascript'))) {
		assert.doesNotMatch(ler(`_javascript/${script}`), /\bfetch\(/, `${script} usa fetch (não funciona em file://)`);
	}
});

test('com URL_DO_SITE preenchida, hreflang e canonical saem absolutos; sem ela, relativos', () => {
	const base = 'https://exemplo.github.io/glass/';
	assert.equal(linksDeIdioma('en/index.html', base), [
		'\t<link rel="canonical" href="https://exemplo.github.io/glass/en/">\n',
		'\t<link rel="alternate" hreflang="pt-BR" href="https://exemplo.github.io/glass/">\n',
		'\t<link rel="alternate" hreflang="en" href="https://exemplo.github.io/glass/en/">\n',
		'\t<link rel="alternate" hreflang="x-default" href="https://exemplo.github.io/glass/">\n',
	].join(''));
	assert.match(linksDeIdioma('comparar.html', base),
		/canonical" href="https:\/\/exemplo\.github\.io\/glass\/comparar\.html"[\s\S]*hreflang="en" href="https:\/\/exemplo\.github\.io\/glass\/en\/compare\.html"/);
	assert.equal(linksDeIdioma('en/google-glass.html', ''), [
		'\t<link rel="alternate" hreflang="pt-BR" href="../google-glass.html">\n',
		'\t<link rel="alternate" hreflang="en" href="google-glass.html">\n',
		'\t<link rel="alternate" hreflang="x-default" href="../google-glass.html">\n',
	].join(''));
	assert.throws(() => linksDeIdioma('index.html', 'http://exemplo.com/'), /https/);
	assert.throws(() => linksDeIdioma('index.html', 'https://exemplo.com'), /terminar/);
	// Canonical só existe com endereço absoluto configurado, e então em todas as páginas.
	for (const [nome, pagina] of Object.entries(paginas)) {
		const canonicos = pagina.tags.filter((tag) => tag.nome === 'link' && tag.attrs.rel === 'canonical');
		assert.equal(canonicos.length, URL_DO_SITE ? 1 : 0, `${nome}: canonical`);
	}
});

test('o índice cobre as duas línguas e só aponta para páginas e âncoras que existem', () => {
	const indice = JSON.parse(ler('_dados/indice-busca.json'));
	const eventos = JSON.parse(ler('_dados/linha-do-tempo.json')).map((evento) => evento.id);
	const cobertas = new Set();
	for (const entrada of indice) {
		assert.ok(paginas[entrada.url], `página inexistente no índice: ${entrada.url}`);
		assert.equal(entrada.idioma, idiomaDe(entrada.url) === 'en' ? 'en' : 'pt', `${entrada.url}: idioma`);
		assert.ok(entrada.titulo && entrada.texto, `${entrada.url}: entrada sem título ou texto`);
		assert.doesNotMatch(entrada.texto, /<|&[a-z]+;/, `${entrada.url}: sobrou HTML no texto`);
		if (entrada.ancora) {
			// As âncoras da linha do tempo são os ids dos eventos, abertos por linha-do-tempo.js.
			assert.ok(paginas[entrada.url].ids.includes(entrada.ancora) || eventos.includes(entrada.ancora),
				`${entrada.url}: âncora #${entrada.ancora} não existe`);
		}
		cobertas.add(entrada.url);
	}
	const esperadas = PAGINAS.filter((nome) => !BUSCAS.includes(nome));
	assert.deepEqual([...cobertas].sort(), [...esperadas].sort());
});

test('o índice da busca só tem texto visível, sem espaço solto antes de pontuação', () => {
	const indice = JSON.parse(ler('_dados/indice-busca.json'));
	for (const entrada of indice) {
		// Texto alternativo de <video>/<audio> e o resumo escondido (hidden) do formulário.
		assert.doesNotMatch(entrada.texto, /Seu navegador não reproduz|Your browser cannot play/, `${entrada.url}: texto de fallback de mídia`);
		assert.notEqual(entrada.ancora, 'resumo-titulo', `${entrada.url}: seção escondida no índice`);
		assert.doesNotMatch(`${entrada.secao} ${entrada.texto}`, / [.,;:!?)]/, `${entrada.url}: espaço antes de pontuação`);
	}
});

// ---------- Dados do comparador e da linha do tempo ----------

const bilingue = (valor) => typeof valor === 'object' && valor !== null
	&& typeof valor.pt === 'string' && valor.pt.trim() !== '' && typeof valor.en === 'string' && valor.en.trim() !== '';
const textoOuBilingue = (valor) => (typeof valor === 'string' ? valor.trim() !== '' : bilingue(valor));

test('modelos.json: todo modelo tem valor para todo campo, em português e em inglês', () => {
	const dados = JSON.parse(ler('_dados/modelos.json'));
	assert.ok(dados.modelos.length >= 3, 'o comparador precisa de pelo menos 3 modelos');
	const chaves = dados.campos.map((campo) => campo.chave);
	assert.equal(new Set(chaves).size, chaves.length, 'chaves de campo repetidas');
	for (const campo of dados.campos) {
		assert.ok(bilingue(campo.rotulo), `rótulo do campo ${campo.chave}`);
	}
	const ids = dados.modelos.map((modelo) => modelo.id);
	assert.equal(new Set(ids).size, ids.length, 'ids de modelo repetidos');
	for (const modelo of dados.modelos) {
		assert.match(modelo.id, /^[a-z0-9-]+$/, `id ${modelo.id}`);
		assert.ok(textoOuBilingue(modelo.nome), `nome de ${modelo.id}`);
		assert.deepEqual(Object.keys(modelo.valores).sort(), [...chaves].sort(), `campos de ${modelo.id}`);
		for (const chave of chaves) {
			assert.ok(textoOuBilingue(modelo.valores[chave]), `${modelo.id}.${chave}`);
		}
	}
});

test('linha-do-tempo.json: eventos com id único, data ISO válida e textos nas duas línguas', () => {
	const eventos = JSON.parse(ler('_dados/linha-do-tempo.json'));
	assert.ok(eventos.length >= 5);
	const ids = eventos.map((evento) => evento.id);
	assert.equal(new Set(ids).size, ids.length, 'ids repetidos');
	for (const evento of eventos) {
		assert.match(evento.id, /^[a-z0-9-]+$/, `id ${evento.id}`);
		assert.match(evento.data, /^\d{4}-\d{2}-\d{2}$/, `data de ${evento.id}`);
		assert.equal(new Date(`${evento.data}T00:00:00Z`).toISOString().slice(0, 10), evento.data, `data de ${evento.id} não existe`);
		assert.ok(bilingue(evento.titulo), `título de ${evento.id}`);
		assert.ok(bilingue(evento.texto), `texto de ${evento.id}`);
		// Os ids viram âncoras (#id) na página: não podem colidir com ids do HTML.
		assert.equal(paginas['linha-do-tempo.html'].ids.includes(evento.id), false, `id ${evento.id} colide com o HTML`);
	}
});

test('as páginas com dados carregam o script de dados antes de dados.js e têm aviso sem JavaScript', () => {
	let comDados = 0;
	for (const [nome, pagina] of Object.entries(paginas)) {
		const elemento = pagina.tags.find((tag) => tag.attrs['data-dados']);
		if (!elemento) {
			continue;
		}
		comDados += 1;
		assert.match(pagina.html, /<noscript>/, `${nome}: falta <noscript>`);
		assert.match(elemento.attrs['data-dados'], /_dados\/[a-z-]+\.js$/, `${nome}: data-dados deve apontar o script gerado`);
		const scripts = pagina.tags.filter((tag) => tag.nome === 'script').map((tag) => tag.attrs.src);
		const posDados = scripts.indexOf(elemento.attrs['data-dados']);
		const posApoio = scripts.findIndex((src) => /_javascript\/dados\.js$/.test(src));
		assert.ok(posDados >= 0, `${nome}: não carrega ${elemento.attrs['data-dados']}`);
		assert.ok(posApoio > posDados, `${nome}: dados.js deve vir depois do script de dados`);
	}
	assert.equal(comDados, 6);
});

test('as especificações e as datas têm fontes públicas registradas', () => {
	const modelos = JSON.parse(ler('_dados/modelos.json'));
	assert.ok(modelos.fontes.length >= 3, 'poucas fontes no comparador');
	for (const fonte of modelos.fontes) {
		assert.ok(bilingue(fonte.nome), `nome da fonte ${fonte.url}`);
		assert.match(fonte.url, /^https:\/\/[^\s"<>]+$/, `url da fonte ${fonte.url}`);
	}
	for (const evento of JSON.parse(ler('_dados/linha-do-tempo.json'))) {
		assert.match(evento.fonte || '', /^https:\/\/[^\s"<>]+$/, `fonte de ${evento.id}`);
	}
	// Com tudo conferido, a nota do comparador não fala mais em valores aproximados.
	assert.doesNotMatch(paginas['comparar.html'].html, /aproximad/);
	assert.doesNotMatch(paginas['en/compare.html'].html, /approximate/);
});

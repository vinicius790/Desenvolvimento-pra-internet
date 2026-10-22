// Gera os arquivos derivados do site, sem dependências:
//   - _dados/indice-busca.json: índice da busca interna, a partir das páginas em português
//     (raiz) e em inglês (en/) e dos dados do comparador e da linha do tempo;
//   - _dados/modelos.js, _dados/linha-do-tempo.js e _dados/indice-busca.js: os mesmos dados
//     dos JSON em forma de script, que as páginas carregam com <script> (sem fetch), para
//     funcionarem também abertas direto do disco (file://). Os JSON continuam sendo a fonte;
//   - os <link rel="alternate" hreflang> (e o canonical) do <head> das 18 páginas.
// Uso:
//   node scripts/gerar-indice.js              grava o que estiver desatualizado
//   node scripts/gerar-indice.js --verificar  só confere se está tudo em dia
// Rode sempre que mudar o texto de uma página ou um arquivo de _dados/.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ---------- Configuração ----------
// Endereço público do site, com barra no fim (ex.: 'https://usuario.github.io/repositorio/').
// Vazio: os hreflang ficam relativos e as páginas não declaram canonical, porque o endereço de
// publicação não aparece em lugar nenhum do projeto. Preenchido: hreflang e canonical passam a
// usar URLs absolutas, como pedem os buscadores. Depois de mudar, rode este script.
const URL_DO_SITE = '';

const RAIZ = path.join(__dirname, '..');
const DESTINO = '_dados/indice-busca.json';

// A página de busca fica de fora: ela não tem conteúdo próprio.
const FORA = new Set(['busca.html', 'search.html']);
const COMPARADOR = { pt: 'comparar.html', en: 'en/compare.html' };
const LINHA_DO_TEMPO = { pt: 'linha-do-tempo.html', en: 'en/timeline.html' };
// Cada página em português e o seu par em inglês.
const PARES = {
	'index.html': 'en/index.html',
	'specs.html': 'en/specs.html',
	'google-glass.html': 'en/google-glass.html',
	'comparar.html': 'en/compare.html',
	'linha-do-tempo.html': 'en/timeline.html',
	'fotos.html': 'en/photos.html',
	'multimidia.html': 'en/multimedia.html',
	'fale-conosco.html': 'en/contact.html',
	'busca.html': 'en/search.html',
};
// JSON de _dados/ que viram script (o índice da busca é gerado aqui mesmo).
const DADOS = ['modelos', 'linha-do-tempo', 'indice-busca'];

const ENTIDADES = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	rsaquo: '›',
	lsaquo: '‹',
	copy: '©',
	bull: '•',
	rsh: '↳',
	larr: '←',
	rarr: '→',
	uarr: '↑',
	darr: '↓',
	minus: '−',
	times: '×',
	deg: '°',
	hellip: '…',
	ndash: '–',
	mdash: '—',
	lsquo: '‘',
	rsquo: '’',
	ldquo: '“',
	rdquo: '”',
};

/**
 * Texto visível de um trecho de HTML: sem tags, com as entidades trocadas e espaços simples.
 * Cada tag vira espaço (para blocos vizinhos não grudarem), e o espaço que isso deixa antes
 * de pontuação ("<a>Glass</a>, ..." -> "Glass , ...") é retirado.
 */
function textoDe(html) {
	return html
		.replace(/<[^>]+>/g, ' ')
		.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
		.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&([a-zA-Z]+);/g, (tudo, nome) => ENTIDADES[nome.toLowerCase()] ?? tudo)
		.replace(/\s+/g, ' ')
		.replace(/ ([.,;:!?)])/g, '$1')
		.trim();
}

function paginasDe(raiz) {
	const html = (pasta) => fs.readdirSync(path.join(raiz, pasta)).filter((nome) => nome.endsWith('.html') && !FORA.has(nome)).sort();
	return [
		...html('.').map((nome) => ({ idioma: 'pt', url: nome })),
		...html('en').map((nome) => ({ idioma: 'en', url: `en/${nome}` })),
	];
}

/** Uma entrada por seção (<h2>) de cada página, mais uma para o texto antes da primeira seção. */
function entradasDaPagina(raiz, { idioma, url }) {
	const html = fs.readFileSync(path.join(raiz, url), 'utf8');
	const titulo = textoDe(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)[1]);
	const principal = /<main[^>]*>([\s\S]*?)<\/main>/.exec(html)[1]
		// Fica de fora o que não é texto de leitura ou o que só aparece para leitores de tela:
		// o texto alternativo de <video>/<audio> (só aparece em navegador sem player) e os
		// blocos com o atributo hidden (como o resumo do formulário, vazio até o envio).
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<(header|noscript|dialog|select|datalist|h1|video|audio)\b[\s\S]*?<\/\1>/g, ' ')
		.replace(/<([a-z]+)\b[^>]*\shidden(?=[\s>=])[^>]*>[\s\S]*?<\/\1>/g, ' ')
		.replace(/<span class="so-leitor">[\s\S]*?<\/span>/g, ' ');

	const entradas = [];
	const partes = principal.split(/(?=<h2\b)/);
	partes.forEach((parte, indice) => {
		const h2 = /^<h2\b([^>]*)>([\s\S]*?)<\/h2>/.exec(parte);
		const secao = h2 ? textoDe(h2[2]) : '';
		const texto = textoDe(h2 ? parte.slice(h2[0].length) : parte);
		if (texto === '') {
			return;
		}
		// Âncora: o id do próprio <h2> ou o do bloco (section, aside...) aberto logo antes dele.
		let ancora = '';
		if (h2) {
			const proprio = /\bid="([^"]+)"/.exec(h2[1]);
			const bloco = /<[a-z]+\b[^>]*\bid="([^"]+)"[^>]*>\s*$/.exec(partes[indice - 1] || '');
			ancora = proprio ? proprio[1] : bloco ? bloco[1] : '';
		}
		entradas.push({ idioma, url, titulo, secao, ancora, texto });
	});
	return entradas;
}

/** O conteúdo que as páginas montam a partir do JSON também entra na busca. */
function entradasDosDados(raiz) {
	const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(raiz, '_dados', arquivo), 'utf8'));
	const valor = (item, idioma) => (item && typeof item === 'object' ? item[idioma] : item);
	const tituloDe = (url) => textoDe(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(fs.readFileSync(path.join(raiz, url), 'utf8'))[1]);
	const modelos = ler('modelos.json');
	const eventos = ler('linha-do-tempo.json');
	const entradas = [];
	for (const idioma of ['pt', 'en']) {
		for (const modelo of modelos.modelos) {
			entradas.push({
				idioma,
				url: COMPARADOR[idioma],
				titulo: tituloDe(COMPARADOR[idioma]),
				secao: valor(modelo.nome, idioma),
				ancora: '',
				texto: modelos.campos
					.map((campo) => `${valor(campo.rotulo, idioma)}: ${valor(modelo.valores[campo.chave], idioma)}`)
					.join('. ') + '.',
			});
		}
		for (const evento of eventos) {
			entradas.push({
				idioma,
				url: LINHA_DO_TEMPO[idioma],
				titulo: tituloDe(LINHA_DO_TEMPO[idioma]),
				secao: `${evento.data.slice(0, 4)}: ${evento.titulo[idioma]}`,
				ancora: evento.id,
				texto: evento.texto[idioma],
			});
		}
	}
	return entradas;
}

function gerarIndice(raiz = RAIZ) {
	return [...paginasDe(raiz).flatMap((pagina) => entradasDaPagina(raiz, pagina)), ...entradasDosDados(raiz)];
}

/** Uma entrada por linha: o arquivo fica legível e os diffs, pequenos. */
function serializar(indice) {
	return `[\n${indice.map((entrada) => `\t${JSON.stringify(entrada)}`).join(',\n')}\n]\n`;
}

/** Script que entrega os dados de _dados/<nome>.json em window.dadosDoSite[nome] (lido por dados.js). */
function moduloDeDados(nome, dados) {
	return `// Gerado por scripts/gerar-indice.js a partir de _dados/${nome}.json: não edite à mão.\n`
		+ '// É um script, e não um fetch do JSON, para a página funcionar também aberta direto do disco.\n'
		+ 'window.dadosDoSite = window.dadosDoSite || {};\n'
		+ `window.dadosDoSite[${JSON.stringify(nome)}] = ${JSON.stringify(dados)};\n`;
}

/**
 * Bloco do <head> com os pares de idioma da página (e o canonical, se houver endereço):
 * relativo à página quando base é vazio, absoluto (com "index.html" omitido) quando não é.
 */
function linksDeIdioma(pagina, base = URL_DO_SITE) {
	if (base !== '' && !/^https:\/\/[^\s"<>]+\/$/.test(base)) {
		throw new Error(`URL_DO_SITE deve começar com https:// e terminar com "/": ${base}`);
	}
	const pt = Object.keys(PARES).find((nome) => nome === pagina || PARES[nome] === pagina);
	const en = PARES[pt];
	const endereco = (caminho) => (base
		? base + caminho.replace(/(^|\/)index\.html$/, '$1')
		: path.posix.relative(path.posix.dirname(pagina), caminho));
	return [
		...(base ? [`<link rel="canonical" href="${endereco(pagina)}">`] : []),
		`<link rel="alternate" hreflang="pt-BR" href="${endereco(pt)}">`,
		`<link rel="alternate" hreflang="en" href="${endereco(en)}">`,
		`<link rel="alternate" hreflang="x-default" href="${endereco(pt)}">`,
	].map((linha) => `\t${linha}\n`).join('');
}

/** Todos os arquivos derivados, como { caminho relativo: conteúdo esperado }. */
function gerarArquivos(raiz = RAIZ, base = URL_DO_SITE) {
	const indice = gerarIndice(raiz);
	const arquivos = { [DESTINO]: serializar(indice) };
	for (const nome of DADOS) {
		const dados = nome === 'indice-busca' ? indice : JSON.parse(fs.readFileSync(path.join(raiz, '_dados', `${nome}.json`), 'utf8'));
		arquivos[`_dados/${nome}.js`] = moduloDeDados(nome, dados);
	}
	for (const pagina of Object.entries(PARES).flat()) {
		const html = fs.readFileSync(path.join(raiz, pagina), 'utf8');
		const bloco = /(?:\t<link rel="(?:canonical|alternate)"[^>]*>\n)+/;
		if (!bloco.test(html)) {
			throw new Error(`${pagina}: não achei os <link rel="alternate"> no <head>`);
		}
		arquivos[pagina] = html.replace(bloco, linksDeIdioma(pagina, base));
	}
	return arquivos;
}

module.exports = { gerarIndice, gerarArquivos, linksDeIdioma, serializar, textoDe, URL_DO_SITE };

if (require.main === module) {
	const desatualizados = Object.entries(gerarArquivos()).filter(([caminho, conteudo]) => {
		const arquivo = path.join(RAIZ, caminho);
		return !fs.existsSync(arquivo) || fs.readFileSync(arquivo, 'utf8') !== conteudo;
	});
	if (process.argv.includes('--verificar')) {
		if (desatualizados.length > 0) {
			console.error(`Desatualizado: ${desatualizados.map(([caminho]) => caminho).join(', ')}. Rode: node scripts/gerar-indice.js`);
			process.exit(1);
		}
		console.log('Índice da busca, dados em script e links de idioma estão em dia.');
	} else {
		for (const [caminho, conteudo] of desatualizados) {
			fs.writeFileSync(path.join(RAIZ, caminho), conteudo);
			console.log(`${caminho} gravado.`);
		}
		if (desatualizados.length === 0) {
			console.log('Nada a gravar: tudo em dia.');
		}
	}
}

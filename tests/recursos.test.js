// Testes das regras sem DOM dos recursos novos: tema (modo escuro), comparador,
// linha do tempo e busca. Os dados usados são os reais, de _dados/.
// Rodar com: node --test
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { resolverTema, resolverContraste, resolverFonte } = require('../_javascript/tema.js');
const { MINIMO, MAXIMO, texto, selecaoValida, selecaoDaUrl, linkDaComparacao, montarLinhas } = require('../_javascript/comparar.js');
const { ordenarEventos, formatarDataEvento, indiceParaTecla, indiceDoHash, nomeDaFonte } = require('../_javascript/linha-do-tempo.js');
const { normalizar, termosDe, montarTrecho, buscar } = require('../_javascript/busca.js');

const dados = (arquivo) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_dados', arquivo), 'utf8'));
const modelos = dados('modelos.json');
const eventos = dados('linha-do-tempo.json');
const indice = dados('indice-busca.json');

// ---------- Tema ----------

test('tema: a escolha salva vence a preferência do sistema', () => {
	assert.equal(resolverTema('escuro', false), 'escuro');
	assert.equal(resolverTema('claro', true), 'claro');
});

test('tema: sem escolha salva (ou com valor estranho) vale o prefers-color-scheme', () => {
	assert.equal(resolverTema(null, true), 'escuro');
	assert.equal(resolverTema(null, false), 'claro');
	assert.equal(resolverTema('roxo', true), 'escuro');
	assert.equal(resolverTema('', false), 'claro');
});

test('alto contraste: escolha explícita vence a preferência do sistema e valores inválidos seguem o sistema', () => {
	assert.equal(resolverContraste('alto', false), 'alto');
	assert.equal(resolverContraste('normal', true), 'normal');
	assert.equal(resolverContraste(null, true), 'alto');
	assert.equal(resolverContraste(null, false), 'normal');
	assert.equal(resolverContraste('invalido', true), 'alto');
	assert.equal(resolverContraste('', false), 'normal');
});

test('tamanho da fonte: escolha explícita grande é respeitada e valor inválido cai no normal', () => {
	assert.equal(resolverFonte('grande'), 'grande');
	assert.equal(resolverFonte('normal'), 'normal');
	assert.equal(resolverFonte(null), 'normal');
	assert.equal(resolverFonte('invalido'), 'normal');
});
// ---------- Comparador ----------

test('comparador: a seleção vale com 2 ou 3 modelos, não com 0, 1 ou 4', () => {
	assert.equal(MINIMO, 2);
	assert.equal(MAXIMO, 3);
	assert.equal(selecaoValida([]), false);
	assert.equal(selecaoValida(['a']), false);
	assert.equal(selecaoValida(['a', 'b']), true);
	assert.equal(selecaoValida(['a', 'b', 'c']), true);
	assert.equal(selecaoValida(['a', 'b', 'c', 'd']), false);
});

test('comparador: links restauram modelos válidos, sem IDs desconhecidos nem repetições', () => {
	assert.deepEqual(selecaoDaUrl('?modelos=enterprise-2019,explorer-2013,enterprise-2019,nao-existe', modelos),
		['enterprise-2019', 'explorer-2013']);
	assert.deepEqual(selecaoDaUrl('?modelos=desconhecido', modelos), modelos.modelos.slice(0, 2).map((modelo) => modelo.id));
	const link = new URL(linkDaComparacao('https://exemplo.test/en/compare.html?origem=perfil#comparador',
		['enterprise-2017', 'explorer-2014']));
	assert.equal(link.searchParams.get('origem'), 'perfil');
	assert.equal(link.hash, '#comparador');
	assert.deepEqual(selecaoDaUrl(link.search, modelos), ['enterprise-2017', 'explorer-2014']);
});

test('comparador: texto() escolhe o idioma e aceita valor simples', () => {
	assert.equal(texto({ pt: 'Tela', en: 'Display' }, 'en'), 'Display');
	assert.equal(texto({ pt: 'Tela', en: 'Display' }, 'pt'), 'Tela');
	assert.equal(texto('32 GB', 'en'), '32 GB');
	assert.equal(texto({ pt: 'só pt' }, 'en'), 'só pt');
	assert.equal(texto(undefined, 'pt'), '');
});

test('comparador: as duas edições Explorer diferem só em lançamento, público, RAM, áudio e sistema', () => {
	const linhas = montarLinhas(modelos, ['explorer-2013', 'explorer-2014'], 'pt');
	assert.equal(linhas.length, modelos.campos.length);
	assert.deepEqual(linhas.filter((linha) => linha.diferente).map((linha) => linha.chave),
		['ano', 'publico', 'ram', 'audio', 'sistema']);
	const ram = linhas.find((linha) => linha.chave === 'ram');
	assert.deepEqual(ram, { chave: 'ram', rotulo: 'Memória RAM', valores: ['1 GB', '2 GB'], diferente: true });
});

test('comparador: com 3 modelos, as colunas seguem a ordem do arquivo e os textos saem em inglês', () => {
	const linhas = montarLinhas(modelos, ['enterprise-2019', 'explorer-2013', 'enterprise-2017'], 'en');
	const camera = linhas.find((linha) => linha.chave === 'camera');
	assert.equal(camera.rotulo, 'Camera');
	assert.deepEqual(camera.valores, ['5 MP, 720p video', '5 MP, 720p video, recording light', '8 MP, 1080p video']);
	assert.equal(camera.diferente, true);
	// A resolução da tela é a mesma nas duas edições Enterprise.
	const tela = montarLinhas(modelos, ['enterprise-2017', 'enterprise-2019'], 'en').find((linha) => linha.chave === 'tela');
	assert.equal(tela.diferente, false);
});

test('comparador: um modelo só (ou nenhum) não tem diferença', () => {
	assert.equal(montarLinhas(modelos, ['explorer-2013'], 'pt').some((linha) => linha.diferente), false);
	assert.equal(montarLinhas(modelos, [], 'pt').some((linha) => linha.diferente), false);
});

// ---------- Linha do tempo ----------

test('linha do tempo: os eventos ficam em ordem cronológica sem alterar a lista original', () => {
	const embaralhados = [eventos[3], eventos[0], eventos[9], eventos[1]];
	const copia = [...embaralhados];
	assert.deepEqual(ordenarEventos(embaralhados).map((evento) => evento.data),
		['2012-04-04', '2012-06-27', '2013-04-15', '2023-03-15']);
	assert.deepEqual(embaralhados, copia);
	assert.deepEqual(ordenarEventos(eventos), eventos, 'o arquivo de dados já deve estar em ordem');
});

test('linha do tempo: a data sai por extenso em cada língua, sem escorregar de dia pelo fuso', () => {
	assert.equal(formatarDataEvento('2013-04-15', 'pt'), '15 de abril de 2013');
	assert.equal(formatarDataEvento('2013-04-15', 'en'), 'April 15, 2013');
	assert.equal(formatarDataEvento('2023-01-01', 'pt'), '1 de janeiro de 2023');
	assert.equal(formatarDataEvento('2012-12-31', 'en'), 'December 31, 2012');
	assert.equal(formatarDataEvento('2013-04-15', 'en', true), 'Apr 2013');
	assert.match(formatarDataEvento('2013-04-15', 'pt', true), /^abr\.? de 2013$/);
	assert.equal(formatarDataEvento('15/04/2013', 'pt'), '');
	assert.equal(formatarDataEvento(undefined, 'pt'), '');
});

test('linha do tempo: setas, Home e End navegam e dão a volta nas pontas', () => {
	assert.equal(indiceParaTecla('ArrowRight', 0, 10), 1);
	assert.equal(indiceParaTecla('ArrowDown', 4, 10), 5);
	assert.equal(indiceParaTecla('ArrowRight', 9, 10), 0);
	assert.equal(indiceParaTecla('ArrowLeft', 0, 10), 9);
	assert.equal(indiceParaTecla('ArrowUp', 5, 10), 4);
	assert.equal(indiceParaTecla('Home', 7, 10), 0);
	assert.equal(indiceParaTecla('End', 2, 10), 9);
	assert.equal(indiceParaTecla('Enter', 2, 10), null);
	assert.equal(indiceParaTecla('Tab', 2, 10), null);
});

test('linha do tempo: só hash de evento troca o evento aberto (o "#conteudo" do pular-conteúdo não)', () => {
	assert.equal(indiceDoHash(eventos, '#anuncio'), 0);
	assert.equal(indiceDoHash(eventos, `#${eventos.at(-1).id}`), eventos.length - 1);
	assert.equal(indiceDoHash(eventos, '#conteudo'), -1);
	assert.equal(indiceDoHash(eventos, ''), -1);
	assert.equal(indiceDoHash(eventos, 'anuncio'), -1);
});

test('linha do tempo: o link da fonte mostra só o domínio', () => {
	assert.equal(nomeDaFonte('https://www.droid-life.com/2014/05/13/x/'), 'droid-life.com');
	assert.equal(nomeDaFonte('https://9to5google.com/2017/07/18/y/'), '9to5google.com');
	for (const evento of eventos) {
		assert.ok(nomeDaFonte(evento.fonte).includes('.'), evento.id);
	}
});

// ---------- Busca ----------

test('busca: normalizar tira acentos e maiúsculas sem mudar o tamanho do texto', () => {
	assert.equal(normalizar('Câmera AÇÃO'), 'camera acao');
	const frase = 'Especificações Técnicas: “Glass” é ótimo';
	assert.equal(normalizar(frase).length, frase.length);
});

test('busca: termos curtos e repetidos são descartados', () => {
	assert.deepEqual(termosDe('  Câmera  de  5 MP câmera '), ['camera', 'de', 'mp']);
	assert.deepEqual(termosDe('a'), []);
	assert.deepEqual(termosDe('   '), []);
});

test('busca: acha sem acento, só na língua pedida, e põe primeiro quem tem o termo no título', () => {
	const pt = buscar(indice, 'camera', 'pt');
	assert.ok(pt.length >= 3, `poucos resultados: ${pt.length}`);
	assert.ok(pt.every((resultado) => resultado.idioma === 'pt'));
	assert.deepEqual([pt[0].url, pt[0].ancora], ['google-glass.html', 'camera']);

	const en = buscar(indice, 'camera', 'en');
	assert.ok(en.every((resultado) => resultado.url.startsWith('en/')));
	assert.deepEqual([en[0].url, en[0].ancora], ['en/google-glass.html', 'camera']);
});

test('busca: só entra quem tem todos os termos; consulta vazia ou sem resultado devolve lista vazia', () => {
	const resultados = buscar(indice, 'snapdragon usb-c', 'pt');
	assert.ok(resultados.length >= 1);
	for (const resultado of resultados) {
		const tudo = normalizar(`${resultado.titulo} ${resultado.secao} ${resultado.texto}`);
		assert.ok(tudo.includes('snapdragon') && tudo.includes('usb-c'), resultado.url);
	}
	assert.deepEqual(buscar(indice, 'snapdragon paralelepipedo', 'pt'), []);
	assert.deepEqual(buscar(indice, '', 'pt'), []);
	assert.deepEqual(buscar(indice, 'x', 'pt'), []);
});

test('busca: acha os eventos da linha do tempo e os modelos do comparador', () => {
	const evento = buscar(indice, 'paraquedas', 'pt')[0];
	assert.deepEqual([evento.url, evento.ancora], ['linha-do-tempo.html', 'google-io']);
	const event = buscar(indice, 'skydivers', 'en')[0];
	assert.deepEqual([event.url, event.ancora], ['en/timeline.html', 'google-io']);
	assert.ok(buscar(indice, 'Snapdragon XR1', 'en').some((resultado) => resultado.url === 'en/compare.html'));
});

test('busca: o trecho marca os termos como estão no texto original e não corta palavras', () => {
	const textoLongo = `${'Palavras de enchimento antes do termo. '.repeat(6)}A câmera tira fotos de 5 megapixels. ${'Mais texto depois do termo. '.repeat(6)}`;
	const partes = montarTrecho(textoLongo, ['camera', 'fotos']);
	assert.deepEqual(partes.filter((parte) => parte.destaque).map((parte) => parte.texto), ['câmera', 'fotos']);
	assert.equal(partes[0].texto, '… ');
	assert.equal(partes.at(-1).texto, ' …');
	const miolo = partes.slice(1, -1).map((parte) => parte.texto).join('');
	assert.ok(textoLongo.includes(miolo), 'o trecho deve ser um pedaço contínuo do texto');
	assert.ok(miolo.length < 260, `trecho longo demais: ${miolo.length}`);
	assert.match(miolo, /^\S.*\S$/, 'o trecho começa e termina em palavra inteira');
});

test('busca: termos sobrepostos viram uma só marca e emoji não desalinha as posições', () => {
	assert.deepEqual(montarTrecho('Google Glass', ['gla', 'ass']), [
		{ texto: 'Google ', destaque: false },
		{ texto: 'Glass', destaque: true },
	]);
	assert.deepEqual(montarTrecho('Glass', ['glass', 'gl']), [{ texto: 'Glass', destaque: true }]);
	const comEmoji = '😎 Óculos com câmera';
	assert.equal(normalizar(comEmoji).length, comEmoji.length);
	assert.deepEqual(montarTrecho(comEmoji, ['camera']).filter((parte) => parte.destaque).map((parte) => parte.texto), ['câmera']);
});

test('busca: texto curto vira trecho inteiro, sem reticências; termo só no título não quebra', () => {
	assert.deepEqual(montarTrecho('Wi-Fi e Bluetooth', ['bluetooth']), [
		{ texto: 'Wi-Fi e ', destaque: false },
		{ texto: 'Bluetooth', destaque: true },
	]);
	assert.deepEqual(montarTrecho('Texto sem o termo.', ['camera']), [{ texto: 'Texto sem o termo.', destaque: false }]);
});

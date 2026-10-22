// Testes unitários do Simulador de Performance AR/VR e do Quiz Técnico XR
// Rodar com: node --test tests/xr-simulador-quiz.test.js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
	PRESETS_XR,
	calcularFrameBudget,
	calcularLatenciaM2P,
	calcularPPD,
	calcularClassificacaoPPD,
	calcularAutonomiaMinutos,
	formatarAutonomia,
	calcularNivelTermico,
} = require('../_javascript/simulador-perf.js');

const {
	PERGUNTAS_QUIZ,
	calcularResultadoQuiz,
	gerarHashCertificado,
} = require('../_javascript/quiz.js');

// ---------- Simulador de Performance AR/VR ----------

test('simulador-perf: todos os presets XR possuem atributos numéricos válidos e nomes bilíngues', () => {
	const chaves = Object.keys(PRESETS_XR);
	assert.ok(chaves.length >= 5, 'esperados ao menos 5 presets XR');

	for (const chave of chaves) {
		const preset = PRESETS_XR[chave];
		assert.equal(preset.id, chave);
		assert.ok(preset.nome && preset.nome.pt && preset.nome.en);
		assert.ok(preset.fps >= 30 && preset.fps <= 144, `${chave}: fps inválido`);
		assert.ok(preset.fov >= 5 && preset.fov <= 150, `${chave}: fov inválido`);
		assert.ok(preset.resolucaoH > 0 && preset.resolucaoV > 0, `${chave}: resolução inválida`);
		assert.ok(preset.bateriaMah > 0, `${chave}: bateria inválida`);
		assert.ok(preset.potenciaWatts > 0, `${chave}: potência inválida`);
		assert.ok(preset.sensorMs > 0 && preset.cpuMs > 0 && preset.gpuMs > 0, `${chave}: pipeline inválido`);
	}
});

test('simulador-perf: calcularFrameBudget calcula o tempo de quadro em milissegundos corretamente', () => {
	assert.equal(calcularFrameBudget(60), 16.67);
	assert.equal(calcularFrameBudget(90), 11.11);
	assert.equal(calcularFrameBudget(120), 8.33);
	assert.equal(calcularFrameBudget(0), 16.67);
	assert.equal(calcularFrameBudget(-10), 16.67);
});

test('simulador-perf: calcularLatenciaM2P reflete a redução por reprojeção assíncrona (ATW)', () => {
	const bruta = calcularLatenciaM2P(60, 5, 6, 8, false);
	const comAtw = calcularLatenciaM2P(60, 5, 6, 8, true);
	assert.ok(bruta > 20, `latência bruta esperada > 20ms: ${bruta}`);
	assert.ok(comAtw < bruta, 'reprojeção deve reduzir latência perceptual');
	assert.ok(comAtw <= 15, `reprojeção deve atingir nível confortável <= 15ms: ${comAtw}`);
});

test('simulador-perf: calcularPPD e classificação de acuidade angular', () => {
	const ppdGlass = calcularPPD(640, 13);
	assert.equal(ppdGlass, 49.2);
	assert.match(calcularClassificacaoPPD(ppdGlass, 'pt'), /Alta Fidelidade/);

	const ppdVision = calcularPPD(3660, 50);
	assert.ok(ppdVision >= 60);
	assert.match(calcularClassificacaoPPD(ppdVision, 'en'), /Retinal Acuity/);

	const ppdQuest = calcularPPD(2064, 100);
	assert.ok(ppdQuest >= 20 && ppdQuest < 30);
	assert.match(calcularClassificacaoPPD(ppdQuest, 'pt'), /VR Imersivo Padrão/);
});

test('simulador-perf: autonomia da bateria e formatação humanamente legível', () => {
	// 570 mAh a 3.85V = 2.1945 Wh. A 1.8W -> ~1.219h -> ~73 minutos.
	const minGlass = calcularAutonomiaMinutos(570, 1.8);
	assert.ok(minGlass >= 70 && minGlass <= 75, `minutos calculados: ${minGlass}`);
	assert.equal(formatarAutonomia(minGlass, 'pt'), '1h 13min');
	assert.equal(formatarAutonomia(45, 'en'), '45 min');
	assert.equal(formatarAutonomia(120, 'pt'), '2h');

	// Valores inválidos não geram erro nem NaN
	assert.equal(calcularAutonomiaMinutos(0, 5), 0);
	assert.equal(calcularAutonomiaMinutos(1000, 0), 0);
	assert.equal(formatarAutonomia(0), '0 min');
});

test('simulador-perf: calcularNivelTermico classifica por faixas de potência em Watts', () => {
	assert.equal(calcularNivelTermico(1.5, 'pt').nivel, 'baixo');
	assert.equal(calcularNivelTermico(5.5, 'pt').nivel, 'moderado');
	assert.equal(calcularNivelTermico(12.0, 'en').nivel, 'alto');
});

// ---------- Quiz Técnico XR & Certificado ----------

test('quiz: conjunto de questões cobre 5 disciplinas XR fundamentais com opções válidas', () => {
	assert.equal(PERGUNTAS_QUIZ.length, 5);
	for (const p of PERGUNTAS_QUIZ) {
		assert.ok(p.id);
		assert.ok(p.categoria);
		assert.ok(p.pergunta.pt && p.pergunta.en);
		assert.equal(p.opcoes.pt.length, 4);
		assert.equal(p.opcoes.en.length, 4);
		assert.ok(p.correta >= 0 && p.correta <= 3);
		assert.ok(p.explicacao.pt && p.explicacao.en);
	}
});

test('quiz: calcularResultadoQuiz avalia aprovação com mínimo de 70% (4 de 5)', () => {
	const gabaritoPerfeito = { p1: 1, p2: 0, p3: 1, p4: 2, p5: 0 };
	const rPerfeito = calcularResultadoQuiz(gabaritoPerfeito);
	assert.equal(rPerfeito.acertos, 5);
	assert.equal(rPerfeito.porcentagem, 100);
	assert.equal(rPerfeito.aprovado, true);

	// 4 de 5 (80%) -> Aprovado
	const gabarito80 = { p1: 1, p2: 0, p3: 1, p4: 2, p5: 3 };
	const r80 = calcularResultadoQuiz(gabarito80);
	assert.equal(r80.acertos, 4);
	assert.equal(r80.porcentagem, 80);
	assert.equal(r80.aprovado, true);

	// 3 de 5 (60%) -> Reprovado
	const gabarito60 = { p1: 1, p2: 0, p3: 1, p4: 0, p5: 3 };
	const r60 = calcularResultadoQuiz(gabarito60);
	assert.equal(r60.acertos, 3);
	assert.equal(r60.porcentagem, 60);
	assert.equal(r60.aprovado, false);

	// Respostas vazias -> 0%
	const rVazio = calcularResultadoQuiz({});
	assert.equal(rVazio.acertos, 0);
	assert.equal(rVazio.porcentagem, 0);
	assert.equal(rVazio.aprovado, false);
});

test('quiz: gerarHashCertificado produz identificador alfanumérico estruturado XR-XXXX-XXXX', () => {
	const hash1 = gerarHashCertificado('Ada Lovelace');
	const hash2 = gerarHashCertificado('Alan Turing');
	assert.match(hash1, /^XR-[0-9A-F]{4}-[0-9A-F]{4}$/);
	assert.match(hash2, /^XR-[0-9A-F]{4}-[0-9A-F]{4}$/);
});

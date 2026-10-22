// Testes das regras do formulário de contato/pedido (_javascript/pedido.js).
// Rodar com: node --test
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
	QUANTIDADE_MAXIMA,
	lerQuantidade,
	calcularTotal,
	formatarMoeda,
	formatarData,
	validarDados,
	montarResumo,
} = require('../_javascript/pedido.js');

const PRECO = 1500;
const HOJE = '2026-10-01';

// O Intl usa espaço não separável entre o símbolo e o valor; os testes comparam com espaço comum.
const semNbsp = (texto) => texto.replace(/ /g, ' ');

function dados(alteracoes = {}) {
	return {
		nome: 'Maria da Silva',
		email: 'maria@exemplo.com',
		sexo: '',
		nascimento: '',
		logradouro: '',
		numero: '',
		estado: '',
		cidade: '',
		urgencia: '4',
		mensagem: '',
		querPedido: true,
		cor: '#0000ff',
		quantidade: '1',
		...alteracoes,
	};
}

test('lerQuantidade aceita inteiros de 0 ao máximo', () => {
	assert.equal(lerQuantidade('0'), 0);
	assert.equal(lerQuantidade('3'), 3);
	assert.equal(lerQuantidade(5), 5);
});

test('regressão: campo vazio ou inválido vira 0, nunca NaN', () => {
	for (const valor of ['', '   ', 'abc', undefined, null, NaN]) {
		assert.equal(lerQuantidade(valor), 0, `valor ${String(valor)}`);
		assert.equal(calcularTotal(valor, PRECO), 0, `total para ${String(valor)}`);
	}
});

test('lerQuantidade descarta negativos, decimais e valores acima do máximo', () => {
	assert.equal(lerQuantidade('-2'), 0);
	assert.equal(lerQuantidade('2.9'), 0);
	assert.equal(lerQuantidade('99'), 0);
	assert.equal(lerQuantidade(String(QUANTIDADE_MAXIMA + 1)), 0);
});

test('calcularTotal multiplica a quantidade pelo preço unitário', () => {
	assert.equal(calcularTotal('1', PRECO), 1500);
	assert.equal(calcularTotal('5', PRECO), 7500);
});

test('regressão: quantidade fora da faixa não mostra o total de outra quantidade e é recusada', () => {
	// Antes, "6" virava 5 em silêncio: o total exibia US$ 7.500,00 ao lado do campo com 6.
	for (const valor of ['6', '99', '2.5']) {
		assert.equal(calcularTotal(valor, PRECO), 0, `total para ${valor}`);
		assert.ok(validarDados(dados({ quantidade: valor }), HOJE).cQtd, `validação para ${valor}`);
	}
});

test('calcularTotal devolve 0 quando o preço é inválido', () => {
	assert.equal(calcularTotal('2', undefined), 0);
	assert.equal(calcularTotal('2', 'abc'), 0);
	assert.equal(calcularTotal('2', -10), 0);
});

test('formatarMoeda usa dólar no padrão brasileiro', () => {
	assert.equal(semNbsp(formatarMoeda(0)), 'US$ 0,00');
	assert.equal(semNbsp(formatarMoeda(7500)), 'US$ 7.500,00');
});

test('formatarData converte ISO para dia/mês/ano e ignora valores inválidos', () => {
	assert.equal(formatarData('1990-05-17'), '17/05/1990');
	assert.equal(formatarData(''), '');
	assert.equal(formatarData('17/05/1990'), '');
	assert.equal(formatarData(undefined), '');
});

test('validarDados aceita um pedido completo', () => {
	assert.deepEqual(validarDados(dados(), HOJE), {});
});

test('validarDados recusa nome só com espaços', () => {
	assert.deepEqual(Object.keys(validarDados(dados({ nome: '   ' }), HOJE)), ['cNome']);
});

test('validarDados recusa data de nascimento no futuro e aceita a de hoje', () => {
	assert.ok(validarDados(dados({ nascimento: '2026-10-02' }), HOJE).cNasc);
	assert.deepEqual(validarDados(dados({ nascimento: HOJE }), HOJE), {});
});

test('validarDados exige quantidade quando há pedido', () => {
	assert.ok(validarDados(dados({ quantidade: '' }), HOJE).cQtd);
	assert.ok(validarDados(dados({ quantidade: '0' }), HOJE).cQtd);
});

test('sem pedido, a quantidade é ignorada mas a mensagem passa a ser obrigatória', () => {
	const semMensagem = validarDados(dados({ querPedido: false, quantidade: '' }), HOJE);
	assert.deepEqual(Object.keys(semMensagem), ['cMsg']);

	const comMensagem = validarDados(dados({ querPedido: false, quantidade: '', mensagem: 'Olá!' }), HOJE);
	assert.deepEqual(comMensagem, {});
});

test('montarResumo de um pedido mínimo lista só o que foi preenchido', () => {
	const resumo = montarResumo(dados({ quantidade: '2' }), PRECO).map(([rotulo, valor]) => [rotulo, semNbsp(valor)]);
	assert.deepEqual(resumo, [
		['Nome', 'Maria da Silva'],
		['E-mail', 'maria@exemplo.com'],
		['Grau de urgência', '4 de 10'],
		['Pedido', '2 × Google Glass na cor #0000ff'],
		['Preço total', 'US$ 3.000,00'],
	]);
});

test('montarResumo completo inclui sexo, nascimento, endereço e mensagem', () => {
	const resumo = Object.fromEntries(montarResumo(dados({
		nome: '  João  ',
		sexo: 'Masculino',
		nascimento: '1990-05-17',
		logradouro: 'Rua das Flores',
		numero: '123',
		estado: 'Rio de Janeiro',
		cidade: 'Niterói',
		mensagem: '  Quero saber mais.  ',
		querPedido: false,
	}), PRECO));
	assert.equal(resumo.Nome, 'João');
	assert.equal(resumo.Sexo, 'Masculino');
	assert.equal(resumo['Data de nascimento'], '17/05/1990');
	assert.equal(resumo['Endereço'], 'Rua das Flores, 123 · Niterói - Rio de Janeiro');
	assert.equal(resumo.Mensagem, 'Quero saber mais.');
	assert.equal(resumo.Pedido, 'Nenhum Google Glass solicitado');
	assert.equal('Preço total' in resumo, false);
});

test('em inglês: mensagens de validação, moeda, data e resumo saem traduzidos', () => {
	const erros = validarDados(dados({ nome: ' ', nascimento: '2026-10-02', quantidade: '9' }), HOJE, 'en');
	assert.deepEqual(erros, {
		cNome: 'Enter your name.',
		cNasc: 'The date of birth cannot be in the future.',
		cQtd: 'Enter the quantity (1 to 5) or uncheck the order.',
	});
	assert.equal(validarDados(dados({ querPedido: false }), HOJE, 'en').cMsg, 'Write a message or check that you want a Google Glass.');

	assert.equal(formatarMoeda(7500, 'en'), '$7,500.00');
	assert.equal(formatarData('1990-05-17', 'en'), '05/17/1990');
	assert.equal(formatarData('', 'en'), '');

	assert.deepEqual(montarResumo(dados({ quantidade: '2', sexo: 'Female', nascimento: '1990-05-17' }), PRECO, 'en'), [
		['Name', 'Maria da Silva'],
		['Email', 'maria@exemplo.com'],
		['Sex', 'Female'],
		['Date of birth', '05/17/1990'],
		['Urgency', '4 out of 10'],
		['Order', '2 × Google Glass in color #0000ff'],
		['Total price', '$3,000.00'],
	]);
	assert.deepEqual(montarResumo(dados({ querPedido: false, mensagem: 'Hi' }), PRECO, 'en').at(-1), ['Order', 'No Google Glass ordered']);
});

test('sem idioma informado, as funções continuam em português', () => {
	assert.equal(validarDados(dados({ nome: '' }), HOJE).cNome, 'Informe seu nome.');
	assert.equal(montarResumo(dados(), PRECO)[0][0], 'Nome');
});

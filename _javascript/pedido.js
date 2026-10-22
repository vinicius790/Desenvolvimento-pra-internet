/*
 * Formulário "Fale conosco": cálculo do total, validação e resumo do pedido.
 * Nada é enviado a servidor nenhum: o resumo é montado na própria página.
 * Os textos existem em português e em inglês (páginas de en/); o idioma é o do lang da página.
 * As funções sem DOM são exportadas para os testes (tests/pedido.test.js).
 */
(function () {
	'use strict';

	const QUANTIDADE_MAXIMA = 5;
	const MOEDAS = {
		pt: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }),
		en: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
	};

	const TEXTOS = {
		pt: {
			erroNome: 'Informe seu nome.',
			erroNascimento: 'A data de nascimento não pode estar no futuro.',
			erroQuantidade: `Informe a quantidade (de 1 a ${QUANTIDADE_MAXIMA}) ou desmarque o pedido.`,
			erroMensagem: 'Escreva uma mensagem ou marque que deseja um Google Glass.',
			aviso: 'Há campos a corrigir antes de enviar. Confira os campos destacados.',
			nome: 'Nome',
			email: 'E-mail',
			sexo: 'Sexo',
			nascimento: 'Data de nascimento',
			endereco: 'Endereço',
			urgencia: 'Grau de urgência',
			de10: (valor) => `${valor} de 10`,
			mensagem: 'Mensagem',
			pedido: 'Pedido',
			itens: (quantidade, cor) => `${quantidade} × Google Glass na cor ${cor}`,
			total: 'Preço total',
			semPedido: 'Nenhum Google Glass solicitado',
		},
		en: {
			erroNome: 'Enter your name.',
			erroNascimento: 'The date of birth cannot be in the future.',
			erroQuantidade: `Enter the quantity (1 to ${QUANTIDADE_MAXIMA}) or uncheck the order.`,
			erroMensagem: 'Write a message or check that you want a Google Glass.',
			aviso: 'Some fields need fixing before sending. Check the highlighted fields.',
			nome: 'Name',
			email: 'Email',
			sexo: 'Sex',
			nascimento: 'Date of birth',
			endereco: 'Address',
			urgencia: 'Urgency',
			de10: (valor) => `${valor} out of 10`,
			mensagem: 'Message',
			pedido: 'Order',
			itens: (quantidade, cor) => `${quantidade} × Google Glass in color ${cor}`,
			total: 'Total price',
			semPedido: 'No Google Glass ordered',
		},
	};

	/**
	 * Converte o que foi digitado em uma quantidade inteira de 0 ao máximo.
	 * Vazio, decimal, negativo ou acima do máximo vira 0: o total nunca mostra
	 * o preço de uma quantidade diferente da que está no campo.
	 */
	function lerQuantidade(valor) {
		const quantidade = Number(valor);
		if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > QUANTIDADE_MAXIMA) {
			return 0;
		}
		return quantidade;
	}

	function calcularTotal(quantidade, precoUnitario) {
		const preco = Number(precoUnitario);
		if (!Number.isFinite(preco) || preco < 0) {
			return 0;
		}
		return lerQuantidade(quantidade) * preco;
	}

	function formatarMoeda(valor, idioma = 'pt') {
		return MOEDAS[idioma].format(valor);
	}

	/**
	 * "2013-04-23" -> "23/04/2013" (pt) ou "04/23/2013" (en),
	 * sem passar por Date, para não sofrer com fuso horário.
	 */
	function formatarData(iso, idioma = 'pt') {
		const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
		if (!partes) {
			return '';
		}
		const [, ano, mes, dia] = partes;
		return idioma === 'en' ? `${mes}/${dia}/${ano}` : `${dia}/${mes}/${ano}`;
	}

	/**
	 * Regras que a validação nativa do HTML não cobre.
	 * Devolve um objeto { idDoCampo: mensagem } só com os campos com problema.
	 */
	function validarDados(dados, hoje, idioma = 'pt') {
		const textos = TEXTOS[idioma];
		const erros = {};
		if (dados.nome.trim() === '') {
			erros.cNome = textos.erroNome;
		}
		if (dados.nascimento && dados.nascimento > hoje) {
			erros.cNasc = textos.erroNascimento;
		}
		if (dados.querPedido && lerQuantidade(dados.quantidade) < 1) {
			erros.cQtd = textos.erroQuantidade;
		}
		if (!dados.querPedido && dados.mensagem.trim() === '') {
			erros.cMsg = textos.erroMensagem;
		}
		return erros;
	}

	function montarEndereco(dados) {
		const rua = [dados.logradouro.trim(), dados.numero.trim()].filter(Boolean).join(', ');
		const local = [dados.cidade.trim(), dados.estado].filter(Boolean).join(' - ');
		return [rua, local].filter(Boolean).join(' · ');
	}

	/** Lista de pares [rótulo, valor] exibida no resumo. */
	function montarResumo(dados, precoUnitario, idioma = 'pt') {
		const textos = TEXTOS[idioma];
		const linhas = [
			[textos.nome, dados.nome.trim()],
			[textos.email, dados.email.trim()],
		];
		if (dados.sexo) {
			linhas.push([textos.sexo, dados.sexo]);
		}
		const nascimento = formatarData(dados.nascimento, idioma);
		if (nascimento) {
			linhas.push([textos.nascimento, nascimento]);
		}
		const endereco = montarEndereco(dados);
		if (endereco) {
			linhas.push([textos.endereco, endereco]);
		}
		linhas.push([textos.urgencia, textos.de10(dados.urgencia)]);
		if (dados.mensagem.trim()) {
			linhas.push([textos.mensagem, dados.mensagem.trim()]);
		}
		if (dados.querPedido) {
			const quantidade = lerQuantidade(dados.quantidade);
			linhas.push([textos.pedido, textos.itens(quantidade, dados.cor)]);
			linhas.push([textos.total, formatarMoeda(calcularTotal(quantidade, precoUnitario), idioma)]);
		} else {
			linhas.push([textos.pedido, textos.semPedido]);
		}
		return linhas;
	}

	function hojeISO() {
		const agora = new Date();
		const doisDigitos = (valor) => String(valor).padStart(2, '0');
		return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
	}

	function iniciar() {
		const form = document.getElementById('fContato');
		if (!form) {
			return;
		}

		const idioma = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'pt';
		const precoUnitario = Number(form.dataset.preco);
		const cNome = document.getElementById('cNome');
		const cEmail = document.getElementById('cEmail');
		const cNasc = document.getElementById('cNasc');
		const cRua = document.getElementById('cRua');
		const cNum = document.getElementById('cNum');
		const cEst = document.getElementById('cEst');
		const cCid = document.getElementById('cCid');
		const cUrg = document.getElementById('cUrg');
		const vUrg = document.getElementById('vUrg');
		const cMsg = document.getElementById('cMsg');
		const cPed = document.getElementById('cPed');
		const cCor = document.getElementById('cCor');
		const cQtd = document.getElementById('cQtd');
		const cTot = document.getElementById('cTot');
		const aviso = document.getElementById('aviso-form');
		const resumo = document.getElementById('resumo');
		const resumoLista = document.getElementById('resumo-lista');
		const camposComRegra = { cNome, cNasc, cMsg, cQtd };

		function lerDados() {
			return {
				nome: cNome.value,
				email: cEmail.value,
				sexo: form.elements.tSexo.value,
				nascimento: cNasc.value,
				logradouro: cRua.value,
				numero: cNum.value,
				estado: cEst.value ? cEst.options[cEst.selectedIndex].text : '',
				cidade: cCid.value,
				urgencia: cUrg.value,
				mensagem: cMsg.value,
				querPedido: cPed.checked,
				cor: cCor.value,
				quantidade: cQtd.value,
			};
		}

		function atualizar() {
			const dados = lerDados();
			cQtd.disabled = !dados.querPedido;
			cCor.disabled = !dados.querPedido;
			cTot.textContent = formatarMoeda(dados.querPedido ? calcularTotal(dados.quantidade, precoUnitario) : 0, idioma);
			vUrg.textContent = dados.urgencia;

			const erros = validarDados(dados, hojeISO(), idioma);
			for (const [id, campo] of Object.entries(camposComRegra)) {
				campo.setCustomValidity(erros[id] || '');
			}
		}

		function mostrarResumo() {
			resumoLista.replaceChildren();
			for (const [rotulo, valor] of montarResumo(lerDados(), precoUnitario, idioma)) {
				const dt = document.createElement('dt');
				const dd = document.createElement('dd');
				dt.textContent = rotulo;
				dd.textContent = valor;
				resumoLista.append(dt, dd);
			}
			aviso.textContent = '';
			resumo.hidden = false;
			resumo.focus();
		}

		form.addEventListener('input', atualizar);
		form.addEventListener('change', atualizar);

		// O evento "invalid" não borbulha, por isso é ouvido na fase de captura.
		form.addEventListener('invalid', () => {
			aviso.textContent = TEXTOS[idioma].aviso;
		}, true);

		// O navegador só dispara "submit" depois que a validação nativa passa.
		form.addEventListener('submit', (evento) => {
			evento.preventDefault();
			mostrarResumo();
		});

		form.addEventListener('reset', () => {
			resumo.hidden = true;
			aviso.textContent = '';
			// Os campos só voltam aos valores iniciais depois do evento.
			setTimeout(atualizar, 0);
		});

		cNasc.max = hojeISO();
		atualizar();
	}

	if (typeof module === 'object' && module.exports) {
		module.exports = {
			QUANTIDADE_MAXIMA,
			lerQuantidade,
			calcularTotal,
			formatarMoeda,
			formatarData,
			validarDados,
			montarResumo,
		};
	}

	if (typeof document !== 'undefined') {
		iniciar();
	}
})();

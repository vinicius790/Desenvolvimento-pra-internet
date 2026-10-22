/*
 * Busca interna, toda no navegador: usa o índice _dados/indice-busca.json (gerado por
 * scripts/gerar-indice.js e entregue pelo script _dados/indice-busca.js) e mostra as seções que contêm todos os termos, com um
 * trecho e os termos marcados. Ignora maiúsculas e acentos ("camera" acha "câmera").
 * As funções sem DOM são exportadas para os testes (tests/recursos.test.js).
 */
(function () {
	'use strict';

	const RAIO_DO_TRECHO = 80;

	const TEXTOS = {
		pt: {
			curta: 'Digite pelo menos 2 letras para buscar.',
			nenhum: (consulta) => `Nenhum resultado para “${consulta}”.`,
			achados: (total, consulta) => (total === 1 ? `1 resultado para “${consulta}”.` : `${total} resultados para “${consulta}”.`),
		},
		en: {
			curta: 'Type at least 2 letters to search.',
			nenhum: (consulta) => `No results for “${consulta}”.`,
			achados: (total, consulta) => (total === 1 ? `1 result for “${consulta}”.` : `${total} results for “${consulta}”.`),
		},
	};

	/**
	 * Minúsculas e sem acentos, uma unidade UTF-16 por unidade do original (inclusive em
	 * emojis, que ocupam duas): assim as posições achadas no texto normalizado valem também
	 * no texto original.
	 */
	function normalizar(texto) {
		return String(texto).split('').map((letra) => (letra.normalize('NFD')[0] || letra).toLowerCase()[0] || letra).join('');
	}

	/** Termos da consulta: sem acento, sem repetição, com 2 letras ou mais. */
	function termosDe(consulta) {
		return [...new Set(normalizar(consulta).split(/\s+/).filter((termo) => termo.length >= 2))];
	}

	function posicoes(textoNormalizado, termo) {
		const achadas = [];
		for (let i = textoNormalizado.indexOf(termo); i !== -1; i = textoNormalizado.indexOf(termo, i + termo.length)) {
			achadas.push([i, i + termo.length]);
		}
		return achadas;
	}

	/**
	 * Trecho do texto em volta da primeira ocorrência, como partes
	 * [{ texto, destaque }], para a página marcar os termos com <mark>.
	 */
	function montarTrecho(texto, termos) {
		const normal = normalizar(texto);
		// Faixas que se sobrepõem ou se tocam ("gla" e "ass" em "glass") viram uma só marca.
		const faixas = [];
		for (const [de, ate] of termos.flatMap((termo) => posicoes(normal, termo)).sort((a, b) => a[0] - b[0])) {
			const ultima = faixas.at(-1);
			if (ultima && de <= ultima[1]) {
				ultima[1] = Math.max(ultima[1], ate);
			} else {
				faixas.push([de, ate]);
			}
		}
		const centro = faixas.length > 0 ? faixas[0][0] : 0;
		let inicio = Math.max(0, centro - RAIO_DO_TRECHO);
		let fim = Math.min(texto.length, centro + RAIO_DO_TRECHO);
		// Não corta palavras ao meio.
		while (inicio > 0 && /\S/.test(texto[inicio - 1])) {
			inicio -= 1;
		}
		while (fim < texto.length && /\S/.test(texto[fim])) {
			fim += 1;
		}

		const partes = [];
		let cursor = inicio;
		if (inicio > 0) {
			partes.push({ texto: '… ', destaque: false });
		}
		for (const [de, ate] of faixas) {
			if (de < cursor || ate > fim) {
				continue;
			}
			if (de > cursor) {
				partes.push({ texto: texto.slice(cursor, de), destaque: false });
			}
			partes.push({ texto: texto.slice(de, ate), destaque: true });
			cursor = ate;
		}
		if (cursor < fim) {
			partes.push({ texto: texto.slice(cursor, fim), destaque: false });
		}
		if (fim < texto.length) {
			partes.push({ texto: ' …', destaque: false });
		}
		return partes;
	}

	/**
	 * Entradas do índice no idioma dado que contêm todos os termos (no título, na seção
	 * ou no texto), da mais relevante para a menos: termo no título vale mais.
	 */
	function buscar(indice, consulta, idioma) {
		const termos = termosDe(consulta);
		if (termos.length === 0) {
			return [];
		}
		const resultados = [];
		for (const entrada of indice) {
			if (entrada.idioma !== idioma) {
				continue;
			}
			const cabecalho = normalizar(`${entrada.titulo} ${entrada.secao}`);
			const corpo = normalizar(entrada.texto);
			if (!termos.every((termo) => cabecalho.includes(termo) || corpo.includes(termo))) {
				continue;
			}
			const pontos = termos.reduce(
				(soma, termo) => soma + (cabecalho.includes(termo) ? 5 : 0) + posicoes(corpo, termo).length, 0);
			resultados.push({ ...entrada, pontos, trecho: montarTrecho(entrada.texto, termos) });
		}
		return resultados.sort((a, b) => b.pontos - a.pontos);
	}

	async function iniciar() {
		const secao = document.getElementById('resultados');
		if (!secao) {
			return;
		}
		const form = document.getElementById('form-busca');
		const campo = document.getElementById('q');
		const estado = document.getElementById('estado-busca');
		const lista = document.getElementById('lista-resultados');
		const idioma = window.idiomaDaPagina();
		const textos = TEXTOS[idioma];
		const raiz = secao.dataset.raiz || '';

		const indice = await window.carregarDados(secao);
		if (!indice) {
			return;
		}

		function mostrar() {
			const consulta = campo.value.trim();
			lista.replaceChildren();
			if (consulta === '') {
				estado.textContent = '';
				return;
			}
			if (termosDe(consulta).length === 0) {
				estado.textContent = textos.curta;
				return;
			}
			const resultados = buscar(indice, consulta, idioma);
			estado.textContent = resultados.length === 0 ? textos.nenhum(consulta) : textos.achados(resultados.length, consulta);
			for (const resultado of resultados) {
				const item = document.createElement('li');
				const titulo = document.createElement('h3');
				const link = document.createElement('a');
				link.href = raiz + resultado.url + (resultado.ancora ? `#${resultado.ancora}` : '');
				link.textContent = resultado.secao ? `${resultado.titulo} › ${resultado.secao}` : resultado.titulo;
				titulo.append(link);
				const trecho = document.createElement('p');
				for (const parte of resultado.trecho) {
					if (parte.destaque) {
						const marca = document.createElement('mark');
						marca.textContent = parte.texto;
						trecho.append(marca);
					} else {
						trecho.append(parte.texto);
					}
				}
				item.append(titulo, trecho);
				lista.append(item);
			}
		}

		// A busca roda a cada letra; enviar o formulário só atualiza a URL (para compartilhar).
		campo.addEventListener('input', mostrar);
		form.addEventListener('submit', (evento) => {
			evento.preventDefault();
			history.replaceState(null, '', `?q=${encodeURIComponent(campo.value.trim())}`);
			mostrar();
		});

		campo.value = new URLSearchParams(location.search).get('q') || '';
		mostrar();
	}

	if (typeof module === 'object' && module.exports) {
		module.exports = { normalizar, termosDe, montarTrecho, buscar };
	}

	if (typeof document !== 'undefined') {
		iniciar();
	}
})();

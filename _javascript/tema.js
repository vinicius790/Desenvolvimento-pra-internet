/*
 * Preferências visuais globais: tema claro/escuro e alto contraste.
 * Carregado no <head> sem defer para aplicar as escolhas antes da primeira pintura.
 * As preferências ficam em localStorage, valem para as duas línguas e sincronizam abas.
 */
(function () {
	'use strict';

	const CHAVE_TEMA = 'tema';
	const CHAVE_CONTRASTE = 'contraste';
	const CHAVE_FONTE = 'fonte';

	function resolverTema(salvo, prefereEscuro) {
		if (salvo === 'escuro' || salvo === 'claro') {
			return salvo;
		}
		return prefereEscuro ? 'escuro' : 'claro';
	}

	function resolverContraste(salvo, prefereAlto) {
		if (salvo === 'alto' || salvo === 'normal') {
			return salvo;
		}
		return prefereAlto ? 'alto' : 'normal';
	}

	function resolverFonte(salvo) {
		return salvo === 'grande' ? 'grande' : 'normal';
	}

	function iniciar() {
		const sistemaTema = window.matchMedia('(prefers-color-scheme: dark)');
		const sistemaContraste = window.matchMedia('(prefers-contrast: more)');

		// O armazenamento pode estar bloqueado: a página continua seguindo o sistema.
		function lerSalvo(chave) {
			try {
				return localStorage.getItem(chave);
			} catch {
				return null;
			}
		}

		function salvar(chave, valor) {
			try {
				localStorage.setItem(chave, valor);
			} catch {
				// Sem armazenamento, a escolha vale apenas até a página ser fechada.
			}
		}

		function aplicarTema(tema) {
			document.documentElement.dataset.tema = tema;
			const botao = document.getElementById('alternar-tema');
			if (botao) {
				botao.setAttribute('aria-pressed', String(tema === 'escuro'));
			}
		}

		function aplicarContraste(contraste) {
			document.documentElement.dataset.contraste = contraste;
			const botao = document.getElementById('alternar-contraste');
			if (botao) {
				botao.setAttribute('aria-pressed', String(contraste === 'alto'));
			}
		}

		function aplicarFonte(fonte) {
			document.documentElement.dataset.fonte = fonte;
			const botao = document.getElementById('alternar-fonte');
			if (botao) {
				const grande = fonte === 'grande';
				const idioma = document.documentElement.lang && document.documentElement.lang.startsWith('en') ? 'en' : 'pt-BR';
				botao.setAttribute('aria-pressed', String(grande));
				botao.setAttribute('aria-label', grande
					? (idioma === 'en' ? 'Decrease font size (A-)' : 'Diminuir tamanho da fonte (A-)')
					: (idioma === 'en' ? 'Increase font size (A+)' : 'Aumentar tamanho da fonte (A+)'));
				const icone = botao.querySelector('.icone-fonte');
				if (icone) {
					icone.textContent = grande ? 'A-' : 'A+';
				}
				const soLeitor = botao.querySelector('.so-leitor');
				if (soLeitor) {
					soLeitor.textContent = grande
						? (idioma === 'en' ? 'Decrease font size' : 'Diminuir tamanho da fonte')
						: (idioma === 'en' ? 'Increase font size' : 'Aumentar tamanho da fonte');
				}
			}
		}

		function atualizarTema() {
			aplicarTema(resolverTema(lerSalvo(CHAVE_TEMA), sistemaTema.matches));
		}

		function atualizarContraste() {
			aplicarContraste(resolverContraste(lerSalvo(CHAVE_CONTRASTE), sistemaContraste.matches));
		}

		function atualizarFonte() {
			aplicarFonte(resolverFonte(lerSalvo(CHAVE_FONTE)));
		}

		atualizarTema();
		atualizarContraste();
		atualizarFonte();

		document.addEventListener('DOMContentLoaded', () => {
			atualizarTema();
			atualizarContraste();
			atualizarFonte();

			const botaoTema = document.getElementById('alternar-tema');
			botaoTema?.addEventListener('click', () => {
				const novo = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro';
				salvar(CHAVE_TEMA, novo);
				aplicarTema(novo);
			});

			const botaoContraste = document.getElementById('alternar-contraste');
			botaoContraste?.addEventListener('click', () => {
				const novo = document.documentElement.dataset.contraste === 'alto' ? 'normal' : 'alto';
				salvar(CHAVE_CONTRASTE, novo);
				aplicarContraste(novo);
			});

			const botaoFonte = document.getElementById('alternar-fonte');
			botaoFonte?.addEventListener('click', () => {
				const novo = document.documentElement.dataset.fonte === 'grande' ? 'normal' : 'grande';
				salvar(CHAVE_FONTE, novo);
				aplicarFonte(novo);
			});
		});

		sistemaTema.addEventListener('change', atualizarTema);
		sistemaContraste.addEventListener('change', atualizarContraste);
		window.addEventListener('storage', (evento) => {
			if (evento.key === CHAVE_TEMA || evento.key === null) {
				atualizarTema();
			}
			if (evento.key === CHAVE_CONTRASTE || evento.key === null) {
				atualizarContraste();
			}
			if (evento.key === CHAVE_FONTE || evento.key === null) {
				atualizarFonte();
			}
		});
	}

	if (typeof module === 'object' && module.exports) {
		module.exports = { resolverTema, resolverContraste, resolverFonte };
	}

	if (typeof document !== 'undefined') {
		iniciar();
	}
})();
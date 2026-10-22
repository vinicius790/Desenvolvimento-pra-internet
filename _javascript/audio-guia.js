/*
 * Áudio-guia acessível com Web Speech Synthesis API (window.speechSynthesis).
 * Permite que pessoas com deficiência visual ou baixa visão escutem o conteúdo
 * histórico narrado em voz alta, com destaque visual do parágrafo atual.
 */
(function () {
	'use strict';

	const TEXTOS = {
		pt: {
			titulo: 'Áudio-Guia Acessível',
			pronto: 'Pronto para narrar o conteúdo histórico.',
			lendo: (atual, total) => `Lendo trecho ${atual} de ${total}...`,
			pausado: 'Narração pausada.',
			concluido: 'Narração da página concluída.',
			reproduzir: 'Ouvir página',
			pausar: 'Pausar',
			continuar: 'Continuar',
			parar: 'Parar',
			velocidade: 'Velocidade:',
			fechar: 'Fechar áudio-guia',
			naoSuportado: 'Seu navegador não oferece suporte nativo à síntese de voz (Web Speech Synthesis).',
			ariaPainel: 'Painel do sintetizador de áudio-guia',
		},
		en: {
			titulo: 'Accessible Audio Guide',
			pronto: 'Ready to narrate the historical content.',
			lendo: (atual, total) => `Reading passage ${atual} of ${total}...`,
			pausado: 'Narration paused.',
			concluido: 'Page narration finished.',
			reproduzir: 'Listen to page',
			pausar: 'Pause',
			continuar: 'Resume',
			parar: 'Stop',
			velocidade: 'Speed:',
			fechar: 'Close audio guide',
			naoSuportado: 'Your browser does not support native speech synthesis (Web Speech Synthesis).',
			ariaPainel: 'Audio guide speech synthesizer panel',
		},
	};

	function obterIdioma() {
		if (typeof window.idiomaDaPagina === 'function') {
			return window.idiomaDaPagina();
		}
		return document.documentElement.lang && document.documentElement.lang.startsWith('en') ? 'en' : 'pt';
	}

	function coletarTrechos() {
		const raiz = document.querySelector('article') || document.querySelector('main') || document.body;
		const seletores = 'h1, h2, h3, p, li, blockquote, figcaption';
		const elementos = Array.from(raiz.querySelectorAll(seletores)).filter((el) => {
			if (el.closest('.ferramentas') || el.closest('#menu') || el.closest('#rodape') || el.closest('.painel-audio-guia') || el.closest('.secao-simulador')) {
				return false;
			}
			const texto = (el.textContent || '').trim();
			return texto.length > 5;
		});
		return elementos;
	}

	function sanitizeHtml(dirty) {
		if (typeof dirty !== 'string') return '';
		const parser = new DOMParser();
		const doc = parser.parseFromString(dirty, 'text/html');
		const allowedTags = new Set([
			'DIV', 'SPAN', 'STRONG', 'EM', 'B', 'I', 'BR', 'SMALL', 'LI', 'UL', 'P',
			'ARTICLE', 'H3', 'H4', 'IMG', 'BUTTON', 'LABEL', 'SELECT', 'OPTION'
		]);
		doc.body.querySelectorAll('*').forEach((node) => {
			if (!allowedTags.has(node.tagName)) {
				node.remove();
			} else {
				Array.from(node.attributes).forEach((attr) => {
					const name = attr.name.toLowerCase();
					if (name.startsWith('on') || (name === 'src' && attr.value.toLowerCase().startsWith('javascript:'))) {
						node.removeAttribute(attr.name);
					}
				});
			}
		});
		return doc.body.innerHTML;
	}

	function iniciar() {
		const botaoAlternar = document.getElementById('alternar-audio-guia');
		const painel = document.getElementById('painel-audio-guia');
		if (!botaoAlternar || !painel) {
			return;
		}

		const idioma = obterIdioma();
		const t = TEXTOS[idioma] || TEXTOS.pt;
		const temSuporte = typeof window !== 'undefined' && 'speechSynthesis' in window;

		let trechos = [];
		let indiceAtual = 0;
		let estaPausado = false;
		let elementoDestacado = null;
		let velocidadeAtual = 1.0;

		painel.innerHTML = sanitizeHtml(`
			<div class="audio-guia-topo">
				<div class="audio-guia-status" role="status" aria-live="polite">
					<span class="indicador-status" aria-hidden="true"></span>
					<span class="texto-status">${temSuporte ? t.pronto : t.naoSuportado}</span>
				</div>
				<button type="button" class="audio-guia-btn audio-guia-btn-fechar" aria-label="${t.fechar}">&times;</button>
			</div>
			${temSuporte ? `
			<div class="audio-guia-acoes">
				<button type="button" class="audio-guia-btn audio-guia-btn-destaque audio-guia-btn-play">${t.reproduzir}</button>
				<button type="button" class="audio-guia-btn audio-guia-btn-stop" disabled>${t.parar}</button>
				<label class="audio-guia-velocidade">
					<span>${t.velocidade}</span>
					<select class="audio-guia-select-velocidade" aria-label="${t.velocidade}">
						<option value="0.8">0.8x</option>
						<option value="1.0" selected>1.0x</option>
						<option value="1.25">1.25x</option>
						<option value="1.5">1.5x</option>
					</select>
				</label>
			</div>
			<div class="audio-guia-progresso" aria-live="polite"></div>
			` : ''}
		`);

		const btnPlay = painel.querySelector('.audio-guia-btn-play');
		const btnStop = painel.querySelector('.audio-guia-btn-stop');
		const btnFechar = painel.querySelector('.audio-guia-btn-fechar');
		const selectVel = painel.querySelector('.audio-guia-select-velocidade');
		const textoStatus = painel.querySelector('.texto-status');
		const textoProgresso = painel.querySelector('.audio-guia-progresso');
		const indicadorStatus = painel.querySelector('.indicador-status');

		function limparDestaque() {
			if (elementoDestacado) {
				elementoDestacado.classList.remove('audio-guia-leitura-ativa');
				elementoDestacado = null;
			}
		}

		function pararNarracao() {
			if (!temSuporte) {
				return;
			}
			window.speechSynthesis.cancel();
			limparDestaque();
			indiceAtual = 0;
			estaPausado = false;
			if (btnPlay) {
				btnPlay.textContent = t.reproduzir;
			}
			if (btnStop) {
				btnStop.disabled = true;
			}
			if (textoStatus) {
				textoStatus.textContent = t.pronto;
			}
			if (indicadorStatus) {
				indicadorStatus.className = 'indicador-status';
			}
			if (textoProgresso) {
				textoProgresso.textContent = '';
			}
		}

		function narrarProximo() {
			if (!temSuporte || indiceAtual >= trechos.length) {
				pararNarracao();
				if (textoStatus) {
					textoStatus.textContent = t.concluido;
				}
				return;
			}

			limparDestaque();
			const el = trechos[indiceAtual];
			elementoDestacado = el;
			el.classList.add('audio-guia-leitura-ativa');
			if (typeof el.scrollIntoView === 'function') {
				el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}

			const textoParaFalar = (el.textContent || '').trim();
			if (textoStatus) {
				textoStatus.textContent = t.lendo(indiceAtual + 1, trechos.length);
			}
			if (indicadorStatus) {
				indicadorStatus.className = 'indicador-status indicador-ativo';
			}
			if (textoProgresso) {
				textoProgresso.textContent = `${Math.round(((indiceAtual + 1) / trechos.length) * 100)}% concluído`;
			}

			const utterance = new SpeechSynthesisUtterance(textoParaFalar);
			utterance.lang = idioma === 'en' ? 'en-US' : 'pt-BR';
			utterance.rate = velocidadeAtual;

			utterance.onend = function () {
				indiceAtual += 1;
				narrarProximo();
			};

			utterance.onerror = function () {
				indiceAtual += 1;
				narrarProximo();
			};

			window.speechSynthesis.speak(utterance);
		}

		if (btnPlay) {
			btnPlay.addEventListener('click', function () {
				if (!temSuporte) {
					return;
				}
				if (window.speechSynthesis.speaking) {
					if (estaPausado) {
						window.speechSynthesis.resume();
						estaPausado = false;
						btnPlay.textContent = t.pausar;
						if (textoStatus) {
							textoStatus.textContent = t.lendo(indiceAtual + 1, trechos.length);
						}
					} else {
						window.speechSynthesis.pause();
						estaPausado = true;
						btnPlay.textContent = t.continuar;
						if (textoStatus) {
							textoStatus.textContent = t.pausado;
						}
					}
					return;
				}

				trechos = coletarTrechos();
				if (trechos.length === 0) {
					return;
				}
				indiceAtual = 0;
				estaPausado = false;
				btnPlay.textContent = t.pausar;
				if (btnStop) {
					btnStop.disabled = false;
				}
				narrarProximo();
			});
		}

		if (btnStop) {
			btnStop.addEventListener('click', pararNarracao);
		}

		if (btnFechar) {
			btnFechar.addEventListener('click', function () {
				pararNarracao();
				painel.hidden = true;
				botaoAlternar.setAttribute('aria-expanded', 'false');
				botaoAlternar.setAttribute('aria-pressed', 'false');
				botaoAlternar.focus();
			});
		}

		if (selectVel) {
			selectVel.addEventListener('change', function () {
				velocidadeAtual = parseFloat(selectVel.value) || 1.0;
			});
		}

		botaoAlternar.addEventListener('click', function () {
			const aberto = !painel.hidden;
			if (aberto) {
				pararNarracao();
				painel.hidden = true;
				botaoAlternar.setAttribute('aria-expanded', 'false');
				botaoAlternar.setAttribute('aria-pressed', 'false');
			} else {
				painel.hidden = false;
				botaoAlternar.setAttribute('aria-expanded', 'true');
				botaoAlternar.setAttribute('aria-pressed', 'true');
				if (btnPlay) {
					btnPlay.focus();
				}
			}
		});

		window.addEventListener('beforeunload', function () {
			if (temSuporte) {
				window.speechSynthesis.cancel();
			}
		});
	}

	if (typeof document !== 'undefined') {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', iniciar);
		} else {
			iniciar();
		}
	}
})();

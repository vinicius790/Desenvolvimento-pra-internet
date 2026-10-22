/*
 * Linha do tempo do Glass: as datas são abas (padrão "tabs" da WAI-ARIA) e o evento
 * escolhido aparece no painel. Teclado: setas trocam de data, Home e End vão às pontas.
 * O evento aberto fica na URL (#id), então dá para compartilhar o link; a busca usa isso.
 * Os dados vêm de _dados/linha-do-tempo.json (textos em pt e en no mesmo arquivo, e a fonte
 * de cada data), entregues pelo script gerado _dados/linha-do-tempo.js (veja dados.js).
 * As funções sem DOM são exportadas para os testes (tests/recursos.test.js).
 */
(function () {
	'use strict';

	const TEXTOS = {
		pt: { posicao: (atual, total) => `Evento ${atual} de ${total}`, fonte: 'Fonte: ' },
		en: { posicao: (atual, total) => `Event ${atual} of ${total}`, fonte: 'Source: ' },
	};

	/** Nome curto da fonte para o link: "https://www.droid-life.com/..." -> "droid-life.com". */
	function nomeDaFonte(url) {
		return new URL(url).hostname.replace(/^www\./, '');
	}

	/** Eventos do mais antigo para o mais novo (as datas são ISO, então a ordem é a do texto). */
	function ordenarEventos(eventos) {
		return [...eventos].sort((a, b) => a.data.localeCompare(b.data));
	}

	/**
	 * "2013-04-15" -> "15 de abril de 2013" (pt) ou "April 15, 2013" (en).
	 * Com curto = true: "abr. de 2013" / "Apr 2013". Em UTC, para o dia não mudar com o fuso.
	 */
	function formatarDataEvento(iso, idioma, curto = false) {
		const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
		if (!partes) {
			return '';
		}
		const data = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])));
		const opcoes = curto
			? { month: 'short', year: 'numeric', timeZone: 'UTC' }
			: { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' };
		return new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'pt-BR', opcoes).format(data);
	}

	/** Índice de destino para uma tecla de navegação, ou null se a tecla não navega. */
	function indiceParaTecla(tecla, atual, total) {
		switch (tecla) {
			case 'ArrowRight':
			case 'ArrowDown':
				return (atual + 1) % total;
			case 'ArrowLeft':
			case 'ArrowUp':
				return (atual - 1 + total) % total;
			case 'Home':
				return 0;
			case 'End':
				return total - 1;
			default:
				return null;
		}
	}

	/** Índice do evento cujo id está no hash ("#anuncio"), ou -1 se o hash não é de evento. */
	function indiceDoHash(eventos, hash) {
		return eventos.findIndex((evento) => `#${evento.id}` === hash);
	}

	async function iniciar() {
		const secao = document.getElementById('linha-do-tempo');
		if (!secao) {
			return;
		}
		const lista = document.getElementById('eventos');
		const painel = document.getElementById('evento');
		const anterior = document.getElementById('evento-anterior');
		const proximo = document.getElementById('evento-proximo');
		const idioma = window.idiomaDaPagina();

		const dados = await window.carregarDados(secao);
		if (!dados) {
			return;
		}
		const eventos = ordenarEventos(dados);

		// Filtros dinâmicos por fase da história do Glass
		const containerFiltros = document.createElement('div');
		containerFiltros.className = 'filtro-fases';
		containerFiltros.setAttribute('role', 'group');
		containerFiltros.setAttribute('aria-label', idioma === 'en' ? 'Filter timeline by phase' : 'Filtrar linha do tempo por fase');

		const fases = [
			{ rotulo: idioma === 'en' ? 'All (10 Events)' : 'Todas as Datas (10)', condicao: () => true },
			{ rotulo: idioma === 'en' ? 'Explorer Phase (2012–2015)' : 'Fase Explorer (2012–2015)', condicao: (ev) => parseInt(ev.data, 10) <= 2015 },
			{ rotulo: idioma === 'en' ? 'Enterprise Phase (2017–2023)' : 'Fase Enterprise (2017–2023)', condicao: (ev) => parseInt(ev.data, 10) >= 2017 },
		];

		const abas = eventos.map((evento) => {
			const aba = document.createElement('button');
			aba.type = 'button';
			aba.id = `aba-${evento.id}`;
			aba.setAttribute('role', 'tab');
			aba.setAttribute('aria-controls', painel.id);
			aba.textContent = formatarDataEvento(evento.data, idioma, true);
			lista.append(aba);
			return aba;
		});

		fases.forEach((fase, idx) => {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'botao-fase';
			btn.textContent = fase.rotulo;
			btn.setAttribute('aria-pressed', String(idx === 0));
			btn.addEventListener('click', () => {
				containerFiltros.querySelectorAll('.botao-fase').forEach((b) => b.setAttribute('aria-pressed', 'false'));
				btn.setAttribute('aria-pressed', 'true');

				let primeiroValido = -1;
				eventos.forEach((ev, i) => {
					const visivel = fase.condicao(ev);
					abas[i].style.display = visivel ? '' : 'none';
					if (visivel && primeiroValido === -1) {
						primeiroValido = i;
					}
				});

				if (!fase.condicao(eventos[atual]) && primeiroValido !== -1) {
					mostrar(primeiroValido, { focar: false, gravar: true });
				}
			});
			containerFiltros.append(btn);
		});
		lista.before(containerFiltros);

		// Sintetizador sutil de áudio para navegação da timeline via Web Audio API
		let ctxAudioTimeline = null;
		function tocarBipTimeline(freq = 520) {
			if (typeof window === 'undefined') {
				return;
			}
			try {
				const AudioContextClass = window.AudioContext || window.webkitAudioContext;
				if (!AudioContextClass) {
					return;
				}
				if (!ctxAudioTimeline) {
					ctxAudioTimeline = new AudioContextClass();
				}
				if (ctxAudioTimeline.state === 'suspended') {
					ctxAudioTimeline.resume();
				}
				const agora = ctxAudioTimeline.currentTime;
				const osc = ctxAudioTimeline.createOscillator();
				const ganho = ctxAudioTimeline.createGain();
				osc.type = 'sine';
				osc.frequency.setValueAtTime(freq, agora);
				osc.frequency.exponentialRampToValueAtTime(freq * 1.3, agora + 0.05);
				ganho.gain.setValueAtTime(0.03, agora);
				ganho.gain.exponentialRampToValueAtTime(0.001, agora + 0.05);
				osc.connect(ganho);
				ganho.connect(ctxAudioTimeline.destination);
				osc.start(agora);
				osc.stop(agora + 0.05);
			} catch {
				// Silencioso se bloqueado pelo navegador
			}
		}

		// Barra de progresso interativa da linha do tempo
		const barraProgresso = document.createElement('div');
		barraProgresso.className = 'progresso-timeline';
		barraProgresso.setAttribute('role', 'progressbar');
		barraProgresso.setAttribute('aria-label', idioma === 'en' ? 'Timeline progress' : 'Progresso da linha do tempo');
		barraProgresso.setAttribute('aria-valuemin', '1');
		barraProgresso.setAttribute('aria-valuemax', String(eventos.length));
		const preenchimentoProgresso = document.createElement('div');
		preenchimentoProgresso.className = 'preenchimento-progresso';
		barraProgresso.append(preenchimentoProgresso);
		painel.before(barraProgresso);

		function mostrar(indice, { focar = false, gravar = true, som = true } = {}) {
			atual = indice;
			const evento = eventos[atual];
			abas.forEach((aba, i) => {
				aba.setAttribute('aria-selected', String(i === atual));
				aba.tabIndex = i === atual ? 0 : -1;
			});
			painel.setAttribute('aria-labelledby', abas[atual].id);

			const pct = Math.round(((atual + 1) / eventos.length) * 100);
			barraProgresso.setAttribute('aria-valuenow', String(atual + 1));
			barraProgresso.setAttribute('aria-valuetext', `${atual + 1} de ${eventos.length} (${pct}%)`);
			preenchimentoProgresso.style.width = `${pct}%`;

			const data = document.createElement('p');
			data.className = 'data-evento';
			const tempo = document.createElement('time');
			tempo.dateTime = evento.data;
			tempo.textContent = formatarDataEvento(evento.data, idioma);
			data.append(tempo);
			const titulo = document.createElement('h3');
			titulo.textContent = evento.titulo[idioma];
			const descricao = document.createElement('p');
			descricao.textContent = evento.texto[idioma];
			const posicao = document.createElement('p');
			posicao.className = 'posicao';
			posicao.textContent = TEXTOS[idioma].posicao(atual + 1, eventos.length);
			const fonte = document.createElement('p');
			fonte.className = 'fonte';
			const link = document.createElement('a');
			link.href = evento.fonte;
			link.textContent = nomeDaFonte(evento.fonte);
			fonte.append(TEXTOS[idioma].fonte, link);
			painel.replaceChildren(data, titulo, descricao, fonte, posicao);

			if (som) {
				tocarBipTimeline(480 + atual * 25);
			}

			if (focar) {
				abas[atual].focus();
			}
			// Rola só a faixa de datas, na horizontal: rolar a página (scrollIntoView) puxava a
			// tela para baixo ao abrir a página em celulares.
			const aba = abas[atual];
			if (aba.offsetLeft < lista.scrollLeft || aba.offsetLeft + aba.offsetWidth > lista.scrollLeft + lista.clientWidth) {
				lista.scrollLeft = aba.offsetLeft - (lista.clientWidth - aba.offsetWidth) / 2;
			}
			if (gravar) {
				history.replaceState(null, '', `#${evento.id}`);
			}
		}

		// Botão de Reprodução Automática (Auto-Tour XR)
		let timerAutoTour = null;
		const containerAcoes = secao.querySelector('.acoes');
		if (containerAcoes) {
			const btnAutoTour = document.createElement('button');
			btnAutoTour.type = 'button';
			btnAutoTour.className = 'botao botao-secundario btn-auto-tour';
			btnAutoTour.setAttribute('aria-pressed', 'false');
			btnAutoTour.textContent = idioma === 'en' ? '▶ Auto-Tour' : '▶ Auto-Tour';

			btnAutoTour.addEventListener('click', () => {
				if (timerAutoTour) {
					clearInterval(timerAutoTour);
					timerAutoTour = null;
					btnAutoTour.setAttribute('aria-pressed', 'false');
					btnAutoTour.textContent = idioma === 'en' ? '▶ Auto-Tour' : '▶ Auto-Tour';
				} else {
					btnAutoTour.setAttribute('aria-pressed', 'true');
					btnAutoTour.textContent = idioma === 'en' ? '⏸ Pause Tour' : '⏸ Pausar Tour';
					timerAutoTour = setInterval(() => {
						const proximoIndice = (atual + 1) % eventos.length;
						mostrar(proximoIndice, { focar: false, gravar: true, som: true });
					}, 3800);
				}
			});
			containerAcoes.append(btnAutoTour);
		}

		lista.addEventListener('click', (evento) => {
			const indice = abas.indexOf(evento.target.closest('[role="tab"]'));
			if (indice >= 0) {
				mostrar(indice);
			}
		});

		lista.addEventListener('keydown', (evento) => {
			const indice = indiceParaTecla(evento.key, atual, eventos.length);
			if (indice !== null) {
				evento.preventDefault();
				mostrar(indice, { focar: true });
			}
		});

		anterior.addEventListener('click', () => mostrar(indiceParaTecla('ArrowLeft', atual, eventos.length)));
		proximo.addEventListener('click', () => mostrar(indiceParaTecla('ArrowRight', atual, eventos.length)));

		// Hash que não é de evento (como o "#conteudo" do link "Pular para o conteúdo") não
		// troca o evento aberto; na carga da página, sem evento no hash, abre o primeiro.
		window.addEventListener('hashchange', () => {
			const indice = indiceDoHash(eventos, location.hash);
			if (indice >= 0) {
				mostrar(indice, { gravar: false });
			}
		});
		const inicial = indiceDoHash(eventos, location.hash);
		mostrar(Math.max(inicial, 0), { gravar: false });
		// Link direto para um evento (da busca, por exemplo): leva a página até a linha do tempo.
		if (inicial >= 0) {
			secao.scrollIntoView();
		}
	}

	if (typeof module === 'object' && module.exports) {
		module.exports = { ordenarEventos, formatarDataEvento, indiceParaTecla, indiceDoHash, nomeDaFonte };
	}

	if (typeof document !== 'undefined') {
		iniciar();
	}
})();

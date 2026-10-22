/*
 * Simulador Interativo do Google Glass:
 * 1. Modelo 3D vetorial/poligonal interativo renderizado em Canvas (rotação 360°, zoom, hotspots).
 * 2. Prisma Heads-Up Display (HUD) simulando a interface óptica do Glass (relógio, clima, GPS, câmera, mensagem).
 * 3. Comandos de voz com Web Speech API (SpeechRecognition) e fallback acessível de botões com áudio Web Audio API.
 */
(function () {
	'use strict';

	const TEXTOS = {
		pt: {
			hotspots: {
				prisma: 'Prisma Óptico: Tela transparente com resolução de 640 × 360 pixels, projetando imagem equivalente a uma tela HD de 25 polegadas vista a 2,4 metros.',
				camera: 'Câmera de 5 MP: Grava vídeos em 720p HD e tira fotos sob comando instantâneo de voz ("OK Glass, tirar foto").',
				touchpad: 'Touchpad Capacitivo: Localizado na haste lateral direita; suporta gestos de deslizar para frente/trás, toque para confirmar e deslizar para baixo para voltar.',
				bateria: 'Módulo de Energia & Áudio: Bateria de 570 mAh e transdutor de condução óssea que transmite som por vibração direto ao ouvido interno.',
			},
			voz: {
				iniciar: 'Falar comando de voz (Microfone)',
				ouvindo: 'Ouvindo... Diga "OK Glass, tirar foto" ou outro comando',
				processando: 'Comando recebido: ',
				naoReconhecido: 'Comando não reconhecido. Tente "tirar foto", "previsão do tempo", "navegar", "mensagem" ou "horas".',
				semSuporte: 'Seu navegador não suporta reconhecimento por voz nativo. Use os botões abaixo para simular!',
				permissaoNegada: 'Permissão de microfone não concedida. Use os botões abaixo para simular.',
				erro: 'Erro no microfone. Use os botões abaixo para simular.',
			},
			hud: {
				fotoTirada: 'Foto capturada!',
				msgEnviada: 'Mensagem enviada para Larry Page!',
			},
		},
		en: {
			hotspots: {
				prisma: 'Optical Prism: Transparent display with 640 × 360 pixel resolution, projecting an image equivalent to a 25-inch HD screen seen from 8 feet away.',
				camera: '5 MP Camera: Records 720p HD video and takes still photos instantly via voice command ("OK Glass, take a picture").',
				touchpad: 'Capacitive Touchpad: Located on the right temple arm; supports forward/backward swipes, tap to select, and swipe down to cancel/return.',
				bateria: 'Battery & Audio Pod: Houses the 570 mAh battery and bone conduction transducer that sends sound vibrations directly to the inner ear.',
			},
			voz: {
				iniciar: 'Speak voice command (Microphone)',
				ouvindo: 'Listening... Say "OK Glass, take a picture" or another command',
				processando: 'Command received: ',
				naoReconhecido: 'Command not recognized. Try "take photo", "weather", "navigate", "message", or "time".',
				semSuporte: 'Your browser does not support native speech recognition. Use the simulation buttons below!',
				permissaoNegada: 'Microphone permission denied. Use the simulation buttons below.',
				erro: 'Microphone error. Use the simulation buttons below.',
			},
			hud: {
				fotoTirada: 'Photo captured!',
				msgEnviada: 'Message sent to Larry Page!',
			},
		},
	};

	function obterIdioma() {
		if (typeof window.idiomaDaPagina === 'function') {
			return window.idiomaDaPagina();
		}
		return document.documentElement.lang && document.documentElement.lang.startsWith('en') ? 'en' : 'pt';
	}

	// Sintetizador de Áudio via Web Audio API (zero dependências externas)
	let ctxAudio = null;
	function obterCtxAudio() {
		if (!ctxAudio && typeof window !== 'undefined') {
			const AudioContextClass = window.AudioContext || window.webkitAudioContext;
			if (AudioContextClass) {
				ctxAudio = new AudioContextClass();
			}
		}
		if (ctxAudio && ctxAudio.state === 'suspended') {
			ctxAudio.resume();
		}
		return ctxAudio;
	}

	function tocarBipGlass() {
		const ctx = obterCtxAudio();
		if (!ctx) {
			return;
		}
		const agora = ctx.currentTime;
		const osc1 = ctx.createOscillator();
		const osc2 = ctx.createOscillator();
		const ganho = ctx.createGain();

		osc1.type = 'sine';
		osc1.frequency.setValueAtTime(880, agora);
		osc1.frequency.exponentialRampToValueAtTime(1320, agora + 0.12);

		osc2.type = 'sine';
		osc2.frequency.setValueAtTime(1100, agora);
		osc2.frequency.exponentialRampToValueAtTime(1760, agora + 0.12);

		ganho.gain.setValueAtTime(0.12, agora);
		ganho.gain.exponentialRampToValueAtTime(0.001, agora + 0.25);

		osc1.connect(ganho);
		osc2.connect(ganho);
		ganho.connect(ctx.destination);

		osc1.start(agora);
		osc2.start(agora);
		osc1.stop(agora + 0.25);
		osc2.stop(agora + 0.25);
	}

	function tocarSomObturador() {
		const ctx = obterCtxAudio();
		if (!ctx) {
			return;
		}
		const agora = ctx.currentTime;
		// Ruído branco do clique
		const tamBuffer = ctx.sampleRate * 0.06;
		const buffer = ctx.createBuffer(1, tamBuffer, ctx.sampleRate);
		const dados = buffer.getChannelData(0);
		for (let i = 0; i < tamBuffer; i++) {
			dados[i] = Math.random() * 2 - 1;
		}
		const noise = ctx.createBufferSource();
		noise.buffer = buffer;

		const filtro = ctx.createBiquadFilter();
		filtro.type = 'highpass';
		filtro.frequency.setValueAtTime(1000, agora);

		const ganho = ctx.createGain();
		ganho.gain.setValueAtTime(0.2, agora);
		ganho.gain.exponentialRampToValueAtTime(0.001, agora + 0.08);

		noise.connect(filtro);
		filtro.connect(ganho);
		ganho.connect(ctx.destination);
		noise.start(agora);
	}

	function tocarSomSucesso() {
		const ctx = obterCtxAudio();
		if (!ctx) {
			return;
		}
		const notas = [523.25, 659.25, 783.99]; // Dó, Mi, Sol
		notas.forEach((freq, idx) => {
			const agora = ctx.currentTime + idx * 0.07;
			const osc = ctx.createOscillator();
			const ganho = ctx.createGain();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, agora);
			ganho.gain.setValueAtTime(0.08, agora);
			ganho.gain.exponentialRampToValueAtTime(0.001, agora + 0.15);
			osc.connect(ganho);
			ganho.connect(ctx.destination);
			osc.start(agora);
			osc.stop(agora + 0.15);
		});
	}

	function iniciarSimulador() {
		const container = document.getElementById('simulador-glass');
		if (!container) {
			return;
		}

		const idioma = obterIdioma();
		const t = TEXTOS[idioma] || TEXTOS.pt;

		// ---------- 1. MOTOR 3D CANVAS DO GOOGLE GLASS ----------
		const canvas3D = document.getElementById('canvas-glass-3d');
		const btnGirar = document.getElementById('btn-3d-girar');
		const btnZoomMais = document.getElementById('btn-3d-zoom-mais');
		const btnZoomMenos = document.getElementById('btn-3d-zoom-menos');
		const btnReset3D = document.getElementById('btn-3d-reset');
		const infoHotspot = document.getElementById('info-hotspot-3d');

		const hotspotBtns = {
			prisma: document.getElementById('hotspot-prisma'),
			camera: document.getElementById('hotspot-camera'),
			touchpad: document.getElementById('hotspot-touchpad'),
			bateria: document.getElementById('hotspot-bateria'),
		};

		let rotX = 0.25;
		let rotY = -0.55;
		let escala = 1.0;
		let autoGirar = true;
		let arrastando = false;
		let ultimoX = 0;
		let ultimoY = 0;

		function desenharModelo3D() {
			if (!canvas3D) {
				return;
			}
			const ctx = canvas3D.getContext('2d');
			if (!ctx) {
				return;
			}
			const w = canvas3D.width;
			const h = canvas3D.height;
			ctx.clearRect(0, 0, w, h);

			if (autoGirar && !arrastando) {
				rotY += 0.008;
			}

			// Projeção isométrica 3D com matriz de rotação
			const cosY = Math.cos(rotY);
			const sinY = Math.sin(rotY);
			const cosX = Math.cos(rotX);
			const sinX = Math.sin(rotX);

			function projetar(x, y, z) {
				// Rotação Y
				const x1 = x * cosY + z * sinY;
				const z1 = -x * sinY + z * cosY;
				// Rotação X
				const y2 = y * cosX - z1 * sinX;
				const z2 = y * sinX + z1 * cosX;
				// Perspectiva
				const dist = 400;
				const fator = dist / (dist + z2 * escala + 150);
				return {
					x: w / 2 + x1 * escala * fator,
					y: h / 2 + y2 * escala * fator,
					z: z2,
					fator,
				};
			}

			// Geometria estrutural do Google Glass Explorer
			// 1. Arco frontal de titânio (haste superior)
			const pontosArco = [];
			const numPontos = 24;
			for (let i = 0; i <= numPontos; i++) {
				const ang = (Math.PI * 0.9 * i) / numPontos - Math.PI * 0.45;
				const px = Math.sin(ang) * 90;
				const pz = -Math.cos(ang) * 55;
				const py = -Math.sin(ang * 0.5) * 8;
				pontosArco.push(projetar(px, py, pz));
			}

			// Desenho do Arco frontal
			ctx.beginPath();
			ctx.strokeStyle = '#94a3b8';
			ctx.lineWidth = 4 * escala;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			pontosArco.forEach((p, idx) => {
				if (idx === 0) {
					ctx.moveTo(p.x, p.y);
				} else {
					ctx.lineTo(p.x, p.y);
				}
			});
			ctx.stroke();

			// 2. Haste lateral esquerda
			const hasteEsqInicio = pontosArco[0];
			const hasteEsqFim = projetar(-95, 20, 100);
			ctx.beginPath();
			ctx.strokeStyle = '#64748b';
			ctx.lineWidth = 3.5 * escala;
			ctx.moveTo(hasteEsqInicio.x, hasteEsqInicio.y);
			ctx.lineTo(hasteEsqFim.x, hasteEsqFim.y);
			ctx.stroke();

			// 3. Módulo eletrônico lateral direito (Processador + Touchpad + Bateria)
			const modFrente = pontosArco[pontosArco.length - 1];
			const modMeio = projetar(92, -2, 45);
			const modTras = projetar(90, 18, 110);
			const modTrasBaixo = projetar(90, 32, 105);

			// Haste direita (Touchpad)
			ctx.beginPath();
			ctx.strokeStyle = '#0284c7';
			ctx.lineWidth = 7 * escala;
			ctx.moveTo(modFrente.x, modFrente.y);
			ctx.lineTo(modMeio.x, modMeio.y);
			ctx.stroke();

			// Pod traseiro da bateria / condução óssea
			ctx.beginPath();
			ctx.fillStyle = '#0369a1';
			ctx.strokeStyle = '#38bdf8';
			ctx.lineWidth = 2 * escala;
			ctx.moveTo(modMeio.x, modMeio.y);
			ctx.lineTo(modTras.x, modTras.y);
			ctx.lineTo(modTrasBaixo.x, modTrasBaixo.y);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			// 4. Módulo óptico e Câmera frontal direita
			const prismaP1 = projetar(45, -15, -45);
			const prismaP2 = projetar(75, -15, -45);
			const prismaP3 = projetar(75, 5, -45);
			const prismaP4 = projetar(45, 5, -45);
			const prismaProf = projetar(60, -5, -60);

			// Prisma de vidro (translúcido brilhante)
			ctx.beginPath();
			ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
			ctx.strokeStyle = '#38bdf8';
			ctx.lineWidth = 2 * escala;
			ctx.moveTo(prismaP1.x, prismaP1.y);
			ctx.lineTo(prismaP2.x, prismaP2.y);
			ctx.lineTo(prismaP3.x, prismaP3.y);
			ctx.lineTo(prismaP4.x, prismaP4.y);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			// Reflexo do prisma
			ctx.beginPath();
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
			ctx.lineWidth = 1.5 * escala;
			ctx.moveTo(prismaP1.x + 3, prismaP1.y + 3);
			ctx.lineTo(prismaP2.x - 3, prismaP1.y + 3);
			ctx.stroke();

			// 5. Câmera de 5 MP (ao lado do prisma)
			const camCentro = projetar(82, -5, -35);
			ctx.beginPath();
			ctx.fillStyle = '#0f172a';
			ctx.strokeStyle = '#38bdf8';
			ctx.lineWidth = 2 * escala;
			ctx.arc(camCentro.x, camCentro.y, 6 * escala, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			// Lente da câmera
			ctx.beginPath();
			ctx.fillStyle = '#0284c7';
			ctx.arc(camCentro.x, camCentro.y, 3 * escala, 0, Math.PI * 2);
			ctx.fill();

			// 6. Plaquetas nasais (suportes)
			const narizEsq = projetar(-15, 12, -40);
			const narizDir = projetar(15, 12, -40);
			ctx.beginPath();
			ctx.strokeStyle = 'rgba(203, 213, 225, 0.7)';
			ctx.lineWidth = 2.5 * escala;
			ctx.moveTo(pontosArco[10].x, pontosArco[10].y);
			ctx.lineTo(narizEsq.x, narizEsq.y);
			ctx.moveTo(pontosArco[14].x, pontosArco[14].y);
			ctx.lineTo(narizDir.x, narizDir.y);
			ctx.stroke();

			requestAnimationFrame(desenharModelo3D);
		}

		if (canvas3D) {
			canvas3D.addEventListener('mousedown', (e) => {
				arrastando = true;
				ultimoX = e.clientX;
				ultimoY = e.clientY;
			});
			window.addEventListener('mouseup', () => { arrastando = false; });
			window.addEventListener('mousemove', (e) => {
				if (!arrastando) {
					return;
				}
				const dx = e.clientX - ultimoX;
				const dy = e.clientY - ultimoY;
				rotY += dx * 0.01;
				rotX += dy * 0.01;
				rotX = Math.max(-1.1, Math.min(1.1, rotX));
				ultimoX = e.clientX;
				ultimoY = e.clientY;
			});

			canvas3D.addEventListener('touchstart', (e) => {
				if (e.touches.length === 1) {
					arrastando = true;
					ultimoX = e.touches[0].clientX;
					ultimoY = e.touches[0].clientY;
				}
			}, { passive: true });
			window.addEventListener('touchend', () => { arrastando = false; });
			window.addEventListener('touchmove', (e) => {
				if (!arrastando || e.touches.length !== 1) {
					return;
				}
				const dx = e.touches[0].clientX - ultimoX;
				const dy = e.touches[0].clientY - ultimoY;
				rotY += dx * 0.015;
				rotX += dy * 0.015;
				rotX = Math.max(-1.1, Math.min(1.1, rotX));
				ultimoX = e.touches[0].clientX;
				ultimoY = e.touches[0].clientY;
			}, { passive: true });

			canvas3D.addEventListener('wheel', (e) => {
				e.preventDefault();
				escala += e.deltaY < 0 ? 0.08 : -0.08;
				escala = Math.max(0.6, Math.min(1.8, escala));
			}, { passive: false });
		}

		if (btnGirar) {
			btnGirar.addEventListener('click', () => {
				autoGirar = !autoGirar;
				btnGirar.textContent = autoGirar ? (idioma === 'en' ? 'Pause Rotation' : 'Pausar Giro') : (idioma === 'en' ? 'Auto Rotate' : 'Girar 360°');
			});
		}
		if (btnZoomMais) {
			btnZoomMais.addEventListener('click', () => {
				escala = Math.min(1.8, escala + 0.15);
			});
		}
		if (btnZoomMenos) {
			btnZoomMenos.addEventListener('click', () => {
				escala = Math.max(0.6, escala - 0.15);
			});
		}
		if (btnReset3D) {
			btnReset3D.addEventListener('click', () => {
				rotX = 0.25;
				rotY = -0.55;
				escala = 1.0;
				autoGirar = true;
				if (btnGirar) {
					btnGirar.textContent = idioma === 'en' ? 'Pause Rotation' : 'Pausar Giro';
				}
			});
		}

		// Hotspots 3D
		Object.entries(hotspotBtns).forEach(([chave, btn]) => {
			if (!btn) {
				return;
			}
			btn.addEventListener('click', () => {
				Object.values(hotspotBtns).forEach((b) => b && b.classList.remove('ativo'));
				btn.classList.add('ativo');
				if (infoHotspot) {
					infoHotspot.textContent = t.hotspots[chave];
				}
				tocarBipGlass();
				// Posiciona visualização para o componente
				if (chave === 'prisma' || chave === 'camera') {
					rotY = -0.3;
					rotX = 0.15;
				} else if (chave === 'touchpad' || chave === 'bateria') {
					rotY = -1.35;
					rotX = 0.2;
				}
			});
		});

		desenharModelo3D();

		// ---------- 2. SIMULADOR DO PRISMA HUD ----------
		const prismaHud = document.getElementById('prisma-hud');
		const cards = [
			document.getElementById('hud-card-relogio'),
			document.getElementById('hud-card-tempo'),
			document.getElementById('hud-card-gps'),
			document.getElementById('hud-card-camera'),
			document.getElementById('hud-card-mensagem'),
			document.getElementById('hud-card-voz'),
		].filter(Boolean);

		const btnProximo = document.getElementById('btn-hud-proximo');
		const btnAnterior = document.getElementById('btn-hud-anterior');
		const btnSelecionar = document.getElementById('btn-hud-selecionar');

		let cardAtivoIndex = 0;

		function exibirCard(indice) {
			if (cards.length === 0) {
				return;
			}
			cardAtivoIndex = (indice + cards.length) % cards.length;
			cards.forEach((card, i) => {
				card.classList.toggle('ativo', i === cardAtivoIndex);
			});
			tocarBipGlass();
		}

		if (btnProximo) {
			btnProximo.addEventListener('click', () => exibirCard(cardAtivoIndex + 1));
		}
		if (btnAnterior) {
			btnAnterior.addEventListener('click', () => exibirCard(cardAtivoIndex - 1));
		}
		if (btnSelecionar) {
			btnSelecionar.addEventListener('click', () => {
				tocarSomSucesso();
				if (cardAtivoIndex === 3) {
					// Card de câmera: dispara foto
					dispararFoto();
				}
			});
		}

		// Atualização contínua do relógio HUD
		function atualizarRelogio() {
			const agora = new Date();
			const h = String(agora.getHours()).padStart(2, '0');
			const m = String(agora.getMinutes()).padStart(2, '0');
			const elHora = document.querySelector('.hud-hora-grande');
			if (elHora) {
				elHora.textContent = `${h}:${m}`;
			}
		}
		atualizarRelogio();
		setInterval(atualizarRelogio, 30000);

		function dispararFoto() {
			tocarSomObturador();
			if (prismaHud) {
				prismaHud.classList.add('hud-flash-ativo');
				setTimeout(() => prismaHud.classList.remove('hud-flash-ativo'), 400);
			}
			const statusCamera = document.querySelector('.hud-camera-status');
			if (statusCamera) {
				statusCamera.textContent = t.hud.fotoTirada;
				setTimeout(() => {
					statusCamera.textContent = idioma === 'en' ? '5 MP 720p HD Ready' : '5 MP 720p HD Pronto';
				}, 2500);
			}
		}

		// ---------- 3. RECONHECIMENTO DE VOZ & COMANDOS ----------
		const btnVoz = document.getElementById('btn-ouvir-voz');
		const textoBtnVoz = document.getElementById('texto-btn-voz');
		const statusVoz = document.getElementById('status-reconhecimento-voz');

		const cmdFoto = document.getElementById('cmd-foto');
		const cmdTempo = document.getElementById('cmd-tempo');
		const cmdGps = document.getElementById('cmd-gps');
		const cmdMensagem = document.getElementById('cmd-mensagem');
		const cmdHoras = document.getElementById('cmd-horas');

		function executarComando(tipo) {
			tocarBipGlass();
			if (statusVoz) {
				statusVoz.textContent = `${t.voz.processando} "${tipo}"`;
			}
			switch (tipo) {
			case 'foto':
				exibirCard(3); // Card da câmera
				setTimeout(dispararFoto, 600);
				break;
			case 'tempo':
				exibirCard(1); // Card clima
				break;
			case 'gps':
				exibirCard(2); // Card GPS
				break;
			case 'mensagem':
				exibirCard(4); // Card mensagem
				tocarSomSucesso();
				break;
			case 'horas':
			default:
				exibirCard(0); // Card relógio
				break;
			}
		}

		if (cmdFoto) {
			cmdFoto.addEventListener('click', () => executarComando('foto'));
		}
		if (cmdTempo) {
			cmdTempo.addEventListener('click', () => executarComando('tempo'));
		}
		if (cmdGps) {
			cmdGps.addEventListener('click', () => executarComando('gps'));
		}
		if (cmdMensagem) {
			cmdMensagem.addEventListener('click', () => executarComando('mensagem'));
		}
		if (cmdHoras) {
			cmdHoras.addEventListener('click', () => executarComando('horas'));
		}

		// Web Speech API integration
		const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

		if (btnVoz) {
			if (!SpeechRecognition) {
				if (textoBtnVoz) {
					textoBtnVoz.textContent = t.voz.semSuporte;
				}
				btnVoz.disabled = false;
				btnVoz.addEventListener('click', () => {
					if (statusVoz) {
						statusVoz.textContent = t.voz.semSuporte;
					}
					tocarBipGlass();
				});
			} else {
				const recognition = new SpeechRecognition();
				recognition.continuous = false;
				recognition.interimResults = false;
				recognition.lang = idioma === 'en' ? 'en-US' : 'pt-BR';

				let ouvindo = false;

				btnVoz.addEventListener('click', () => {
					if (ouvindo) {
						recognition.stop();
						return;
					}
					try {
						recognition.start();
						ouvindo = true;
						btnVoz.setAttribute('aria-pressed', 'true');
						if (textoBtnVoz) {
							textoBtnVoz.textContent = t.voz.ouvindo;
						}
						if (statusVoz) {
							statusVoz.textContent = t.voz.ouvindo;
						}
						// Ativa card de visualizador de voz no HUD
						exibirCard(5);
						tocarBipGlass();
					} catch (err) {
						ouvindo = false;
						btnVoz.setAttribute('aria-pressed', 'false');
					}
				});

				recognition.onresult = (evento) => {
					ouvindo = false;
					btnVoz.setAttribute('aria-pressed', 'false');
					if (textoBtnVoz) {
						textoBtnVoz.textContent = t.voz.iniciar;
					}

					const transcricao = (evento.results[0][0].transcript || '').toLowerCase().trim();
					if (statusVoz) {
						statusVoz.textContent = `"${transcricao}"`;
					}

					if (transcricao.includes('foto') || transcricao.includes('picture') || transcricao.includes('photo')) {
						executarComando('foto');
					} else if (transcricao.includes('tempo') || transcricao.includes('clima') || transcricao.includes('weather')) {
						executarComando('tempo');
					} else if (transcricao.includes('navegar') || transcricao.includes('gps') || transcricao.includes('direção') || transcricao.includes('directions')) {
						executarComando('gps');
					} else if (transcricao.includes('mensagem') || transcricao.includes('message')) {
						executarComando('mensagem');
					} else if (transcricao.includes('hora') || transcricao.includes('time') || transcricao.includes('relógio')) {
						executarComando('horas');
					} else {
						if (statusVoz) {
							statusVoz.textContent = t.voz.naoReconhecido;
						}
						exibirCard(0);
					}
				};

				recognition.onerror = (evento) => {
					ouvindo = false;
					btnVoz.setAttribute('aria-pressed', 'false');
					if (textoBtnVoz) {
						textoBtnVoz.textContent = t.voz.iniciar;
					}
					if (statusVoz) {
						statusVoz.textContent = evento.error === 'not-allowed' ? t.voz.permissaoNegada : t.voz.erro;
					}
				};

				recognition.onend = () => {
					ouvindo = false;
					btnVoz.setAttribute('aria-pressed', 'false');
					if (textoBtnVoz) {
						textoBtnVoz.textContent = t.voz.iniciar;
					}
				};
			}
		}
	}

	if (typeof document !== 'undefined') {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', iniciarSimulador);
		} else {
			iniciarSimulador();
		}
	}
})();

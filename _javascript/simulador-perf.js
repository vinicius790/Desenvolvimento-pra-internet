/*
 * Simulador de Performance AR/VR (FPS, Latência, FOV e Bateria)
 * Modelagem física e computacional em tempo real para dispositivos de Realidade Estendida (XR).
 * Aderente aos padrões WCAG AAA (alto contraste, controles acessíveis e live regions).
 */
(function (root, factory) {
	'use strict';
	if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	} else {
		root.SimuladorPerf = factory();
	}
})(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	// Presets de dispositivos XR históricos e contemporâneos
	const PRESETS_XR = {
		'glass-explorer': {
			id: 'glass-explorer',
			nome: { pt: 'Google Glass Explorer (2013)', en: 'Google Glass Explorer (2013)' },
			fps: 60,
			fov: 13,
			resolucaoH: 640,
			resolucaoV: 360,
			bateriaMah: 570,
			potenciaWatts: 1.8,
			sensorMs: 5.0,
			cpuMs: 6.0,
			gpuMs: 8.0,
			reprojecao: false,
		},
		'glass-enterprise2': {
			id: 'glass-enterprise2',
			nome: { pt: 'Glass Enterprise Edition 2 (2019)', en: 'Glass Enterprise Edition 2 (2019)' },
			fps: 60,
			fov: 8,
			resolucaoH: 640,
			resolucaoV: 360,
			bateriaMah: 820,
			potenciaWatts: 1.6,
			sensorMs: 4.0,
			cpuMs: 4.5,
			gpuMs: 6.5,
			reprojecao: false,
		},
		'quest-3': {
			id: 'quest-3',
			nome: { pt: 'Meta Quest 3 (2023)', en: 'Meta Quest 3 (2023)' },
			fps: 90,
			fov: 110,
			resolucaoH: 2064,
			resolucaoV: 2208,
			bateriaMah: 5060,
			potenciaWatts: 8.5,
			sensorMs: 2.0,
			cpuMs: 3.5,
			gpuMs: 5.5,
			reprojecao: true,
		},
		'vision-pro': {
			id: 'vision-pro',
			nome: { pt: 'Apple Vision Pro (2024)', en: 'Apple Vision Pro (2024)' },
			fps: 90,
			fov: 100,
			resolucaoH: 3660,
			resolucaoV: 3200,
			bateriaMah: 3166,
			potenciaWatts: 14.0,
			sensorMs: 1.5,
			cpuMs: 3.0,
			gpuMs: 5.0,
			reprojecao: true,
		},
		'hololens-2': {
			id: 'hololens-2',
			nome: { pt: 'Microsoft HoloLens 2 (2019)', en: 'Microsoft HoloLens 2 (2019)' },
			fps: 60,
			fov: 52,
			resolucaoH: 2048,
			resolucaoV: 1080,
			bateriaMah: 1650,
			potenciaWatts: 6.5,
			sensorMs: 3.0,
			cpuMs: 5.0,
			gpuMs: 8.0,
			reprojecao: true,
		},
		'personalizado': {
			id: 'personalizado',
			nome: { pt: 'Configuração Personalizada (Custom)', en: 'Custom Configuration' },
			fps: 72,
			fov: 90,
			resolucaoH: 1920,
			resolucaoV: 1080,
			bateriaMah: 3000,
			potenciaWatts: 5.0,
			sensorMs: 3.0,
			cpuMs: 5.0,
			gpuMs: 7.0,
			reprojecao: true,
		},
	};

	/** Calcula o orçamento de tempo por quadro (Frame Budget) em milissegundos. */
	function calcularFrameBudget(fps) {
		const f = Number(fps);
		if (!Number.isFinite(f) || f <= 0) {
			return 16.67;
		}
		return Number((1000 / f).toFixed(2));
	}

	/**
	 * Calcula a latência Motion-to-Photon total (ms) a partir dos estágios do pipeline XR.
	 * Com reprojeção / Timewarp ativa, a latência percebida é substancialmente reduzida.
	 */
	function calcularLatenciaM2P(fps, sensorMs, cpuMs, gpuMs, reprojecaoAtiva) {
		const scanout = 1000 / (Number(fps) * 2);
		const pipelineBruto = Number(sensorMs) + Number(cpuMs) + Number(gpuMs) + scanout;
		if (reprojecaoAtiva) {
			// A reprojeção assíncrona (ATW/PTW) atualiza o buffer imediatamente antes do scanout
			const latenciaOtimizada = Number(sensorMs) * 0.8 + 2.5 + scanout;
			return Number(Math.min(latenciaOtimizada, pipelineBruto * 0.45).toFixed(1));
		}
		return Number(pipelineBruto.toFixed(1));
	}

	/** Calcula os Pixels Por Grau (Pixels Per Degree - PPD). */
	function calcularPPD(resolucaoH, fovH) {
		const r = Number(resolucaoH);
		const f = Number(fovH);
		if (!Number.isFinite(r) || !Number.isFinite(f) || f <= 0) {
			return 0;
		}
		return Number((r / f).toFixed(1));
	}

	/** Classificação da acuidade visual angular. */
	function calcularClassificacaoPPD(ppd, idioma = 'pt') {
		const valor = Number(ppd);
		if (valor >= 60) {
			return idioma === 'en' ? 'Retinal Acuity (Apple Vision Pro Class)' : 'Acuidade Retiniana (Classe Apple Vision Pro)';
		}
		if (valor >= 30) {
			return idioma === 'en' ? 'High Fidelity MR (HoloLens 2 / Enterprise)' : 'Alta Fidelidade MR (HoloLens 2 / Enterprise)';
		}
		if (valor >= 20) {
			return idioma === 'en' ? 'Standard Immersive VR (Quest 3)' : 'VR Imersivo Padrão (Quest 3)';
		}
		return idioma === 'en' ? 'Early Optical HUD (Google Glass Glass Explorer)' : 'HUD Óptico Pioneiro (Google Glass Explorer)';
	}

	/**
	 * Calcula a autonomia estimada da bateria em minutos.
	 * Voltagem nominal típica Li-ion = 3.85V.
	 */
	function calcularAutonomiaMinutos(bateriaMah, potenciaWatts, voltagem = 3.85) {
		const mah = Number(bateriaMah);
		const w = Number(potenciaWatts);
		if (!Number.isFinite(mah) || !Number.isFinite(w) || w <= 0 || mah <= 0) {
			return 0;
		}
		const wattHora = (mah * voltagem) / 1000;
		const horas = wattHora / w;
		return Math.round(horas * 60);
	}

	/** Formata os minutos em horas e minutos humanamente legíveis. */
	function formatarAutonomia(minutos, idioma = 'pt') {
		const m = Math.max(0, Math.round(Number(minutos) || 0));
		const h = Math.floor(m / 60);
		const resto = m % 60;
		if (idioma === 'en') {
			if (h === 0) {
				return `${resto} min`;
			}
			return resto === 0 ? `${h}h` : `${h}h ${resto}min`;
		}
		if (h === 0) {
			return `${resto} min`;
		}
		return resto === 0 ? `${h}h` : `${h}h ${resto}min`;
	}

	/** Determina o nível térmico e risco de thermal throttling. */
	function calcularNivelTermico(potenciaWatts, idioma = 'pt') {
		const w = Number(potenciaWatts);
		if (w <= 2.5) {
			return {
				nivel: 'baixo',
				texto: idioma === 'en' ? 'Cool (Passive Cooling, No Throttling)' : 'Baixo (Dissipação Passiva, Sem Throttling)',
				cor: '#1b8a34',
			};
		}
		if (w <= 8.0) {
			return {
				nivel: 'moderado',
				texto: idioma === 'en' ? 'Moderate (Warm, Sustained Operations)' : 'Moderado (Morno, Operação Sustentada)',
				cor: '#b46800',
			};
		}
		return {
			nivel: 'alto',
			texto: idioma === 'en' ? 'High (Active Fan Required / High Heat)' : 'Alto (Ventilação Ativa Obrigatória / Risco Throttling)',
			cor: '#cc2200',
		};
	}

	// Sintetizador de Áudio sutil via Web Audio API
	let ctxAudio = null;
	let somAtivo = true;

	function tocarBipInterativo(freq = 660, duracao = 0.06) {
		if (!somAtivo || typeof window === 'undefined') {
			return;
		}
		try {
			const AudioContextClass = window.AudioContext || window.webkitAudioContext;
			if (!AudioContextClass) {
				return;
			}
			if (!ctxAudio) {
				ctxAudio = new AudioContextClass();
			}
			if (ctxAudio.state === 'suspended') {
				ctxAudio.resume();
			}
			const agora = ctxAudio.currentTime;
			const osc = ctxAudio.createOscillator();
			const ganho = ctxAudio.createGain();

			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, agora);
			osc.frequency.exponentialRampToValueAtTime(freq * 1.5, agora + duracao);

			ganho.gain.setValueAtTime(0.04, agora);
			ganho.gain.exponentialRampToValueAtTime(0.001, agora + duracao);

			osc.connect(ganho);
			ganho.connect(ctxAudio.destination);
			osc.start(agora);
			osc.stop(agora + duracao);
		} catch {
			// Silencioso em caso de restrição do navegador
		}
	}

	/** Atualiza o diagrama SVG do cone do FOV e sobreposição visual. */
	function renderizarConeSVG(svgElement, fovGraus) {
		if (!svgElement) {
			return;
		}
		const fov = Math.max(5, Math.min(140, Number(fovGraus) || 60));
		const rad = (fov * Math.PI) / 180;
		const raio = 110;
		const cx = 150;
		const cy = 135;

		const x1 = cx - Math.sin(rad / 2) * raio;
		const y1 = cy - Math.cos(rad / 2) * raio;
		const x2 = cx + Math.sin(rad / 2) * raio;
		const y2 = cy - Math.cos(rad / 2) * raio;

		const d = `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${raio} ${raio} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;

		svgElement.innerHTML = `
			<defs>
				<radialGradient id="grad-cone" cx="50%" cy="100%" r="100%">
					<stop offset="0%" stop-color="#2575dc" stop-opacity="0.6"/>
					<stop offset="100%" stop-color="#14529f" stop-opacity="0.15"/>
				</radialGradient>
			</defs>
			<circle cx="${cx}" cy="${cy}" r="18" fill="#444444" stroke="#ffffff" stroke-width="2"/>
			<circle cx="${cx - 7}" cy="${cy - 6}" r="3" fill="#ffffff"/>
			<circle cx="${cx + 7}" cy="${cy - 6}" r="3" fill="#ffffff"/>
			<path d="${d}" fill="url(#grad-cone)" stroke="#2575dc" stroke-width="2.5"/>
			<text x="${cx}" y="28" text-anchor="middle" fill="currentColor" font-weight="bold" font-size="13">${fov}° FOV</text>
		`;
	}

	/** Inicializa o simulador na página vinculando controles e eventos. */
	function iniciar() {
		const secao = document.getElementById('simulador-performance');
		if (!secao) {
			return;
		}

		const selPreset = document.getElementById('perf-preset');
		const sliderFps = document.getElementById('perf-fps');
		const sliderFov = document.getElementById('perf-fov');
		const sliderBateria = document.getElementById('perf-bateria');
		const sliderBrilho = document.getElementById('perf-brilho');
		const sliderPotencia = document.getElementById('perf-potencia');
		const chkReprojecao = document.getElementById('perf-reprojecao');
		const btnSom = document.getElementById('perf-btn-som');

		const outFps = document.getElementById('val-perf-fps');
		const outFrametime = document.getElementById('val-perf-frametime');
		const outM2P = document.getElementById('val-perf-m2p');
		const outFov = document.getElementById('val-perf-fov');
		const outPpd = document.getElementById('val-perf-ppd');
		const outAcuidade = document.getElementById('val-perf-acuidade');
		const outBateria = document.getElementById('val-perf-bateria');
		const outAutonomia = document.getElementById('val-perf-autonomia');
		const outTermico = document.getElementById('val-perf-termico');
		const coneSvg = document.getElementById('perf-cone-svg');
		const pipelineBarra = document.getElementById('perf-pipeline-barra');
		const statusAcessivel = document.getElementById('perf-status-acessivel');

		const idioma = document.documentElement.lang && document.documentElement.lang.startsWith('en') ? 'en' : 'pt';

		let presetAtual = PRESETS_XR['glass-explorer'];

		function atualizarSimulacao(tocarSom = false) {
			const fps = Number(sliderFps ? sliderFps.value : 60);
			const fov = Number(sliderFov ? sliderFov.value : 13);
			const bateria = Number(sliderBateria ? sliderBateria.value : 570);
			const brilho = Number(sliderBrilho ? sliderBrilho.value : 70);
			const basePotencia = Number(sliderPotencia ? sliderPotencia.value : 1.8);
			const reprojecao = chkReprojecao ? chkReprojecao.checked : false;

			// Impacto dinâmico do brilho da tela no consumo total de energia
			const fatorBrilho = 0.8 + (brilho / 100) * 0.4;
			const potenciaEfetiva = Number((basePotencia * fatorBrilho).toFixed(2));

			// Cálculos principais
			const frametime = calcularFrameBudget(fps);
			const m2p = calcularLatenciaM2P(fps, presetAtual.sensorMs, presetAtual.cpuMs, presetAtual.gpuMs, reprojecao);
			const ppd = calcularPPD(presetAtual.resolucaoH, fov);
			const acuidade = calcularClassificacaoPPD(ppd, idioma);
			const minutos = calcularAutonomiaMinutos(bateria, potenciaEfetiva);
			const autonomiaTexto = formatarAutonomia(minutos, idioma);
			const termico = calcularNivelTermico(potenciaEfetiva, idioma);

			// Atualização dos elementos de saída
			if (outFps) {
				outFps.textContent = `${fps} FPS`;
			}
			if (outFrametime) {
				outFrametime.textContent = `${frametime} ms`;
			}
			if (outM2P) {
				outM2P.textContent = `${m2p} ms`;
				outM2P.className = m2p <= 20 ? 'valor-destaque otimo' : 'valor-destaque atencao';
			}
			if (outFov) {
				outFov.textContent = `${fov}°`;
			}
			if (outPpd) {
				outPpd.textContent = `${ppd} PPD`;
			}
			if (outAcuidade) {
				outAcuidade.textContent = acuidade;
			}
			if (outBateria) {
				outBateria.textContent = `${bateria} mAh (${potenciaEfetiva} W)`;
			}
			if (outAutonomia) {
				outAutonomia.textContent = autonomiaTexto;
			}
			if (outTermico) {
				outTermico.textContent = termico.texto;
				outTermico.style.color = termico.cor;
			}

			// Renderiza representação gráfica do FOV e da barra de latência
			renderizarConeSVG(coneSvg, fov);

			if (pipelineBarra) {
				const sensorPct = Math.round((presetAtual.sensorMs / (m2p || 1)) * 100);
				const cpuPct = Math.round((presetAtual.cpuMs / (m2p || 1)) * 100);
				const gpuPct = Math.round((presetAtual.gpuMs / (m2p || 1)) * 100);
				pipelineBarra.innerHTML = `
					<div class="pipe-seg seg-sensor" style="width: ${Math.max(12, sensorPct)}%" title="Sensor: ${presetAtual.sensorMs}ms">Sensor</div>
					<div class="pipe-seg seg-cpu" style="width: ${Math.max(15, cpuPct)}%" title="CPU: ${presetAtual.cpuMs}ms">CPU</div>
					<div class="pipe-seg seg-gpu" style="width: ${Math.max(20, gpuPct)}%" title="GPU: ${presetAtual.gpuMs}ms">GPU</div>
					<div class="pipe-seg seg-scan" style="width: 25%" title="Scanout V-Sync">Scanout</div>
				`;
			}

			if (statusAcessivel) {
				statusAcessivel.textContent = idioma === 'en'
					? `Simulation updated: ${fps} FPS, ${m2p} ms latency, ${fov} degrees FOV, battery runtime ${autonomiaTexto}.`
					: `Simulação atualizada: ${fps} FPS, ${m2p} ms de latência, ${fov} graus de FOV, autonomia estimada ${autonomiaTexto}.`;
			}

			if (tocarSom) {
				tocarBipInterativo(600 + fps * 4, 0.04);
			}
		}

		function aplicarPreset(presetChave) {
			const preset = PRESETS_XR[presetChave] || PRESETS_XR['glass-explorer'];
			presetAtual = preset;

			if (sliderFps) {
				sliderFps.value = String(preset.fps);
			}
			if (sliderFov) {
				sliderFov.value = String(preset.fov);
			}
			if (sliderBateria) {
				sliderBateria.value = String(preset.bateriaMah);
			}
			if (sliderPotencia) {
				sliderPotencia.value = String(preset.potenciaWatts);
			}
			if (chkReprojecao) {
				chkReprojecao.checked = preset.reprojecao;
			}

			atualizarSimulacao(true);
		}

		if (selPreset) {
			selPreset.addEventListener('change', () => {
				aplicarPreset(selPreset.value);
			});
		}

		const sliders = [sliderFps, sliderFov, sliderBateria, sliderBrilho, sliderPotencia];
		sliders.forEach((sl) => {
			if (sl) {
				sl.addEventListener('input', () => {
					if (selPreset && selPreset.value !== 'personalizado') {
						selPreset.value = 'personalizado';
						presetAtual = PRESETS_XR.personalizado;
					}
					atualizarSimulacao(false);
				});
				sl.addEventListener('change', () => {
					atualizarSimulacao(true);
				});
			}
		});

		if (chkReprojecao) {
			chkReprojecao.addEventListener('change', () => {
				atualizarSimulacao(true);
			});
		}

		if (btnSom) {
			btnSom.addEventListener('click', () => {
				somAtivo = !somAtivo;
				btnSom.setAttribute('aria-pressed', String(somAtivo));
				const textoSom = btnSom.querySelector('.texto-som');
				if (textoSom) {
					textoSom.textContent = somAtivo
						? (idioma === 'en' ? 'Sound: On' : 'Áudio: Ativo')
						: (idioma === 'en' ? 'Sound: Muted' : 'Áudio: Mudo');
				}
				if (somAtivo) {
					tocarBipInterativo(880, 0.08);
				}
			});
		}

		// Inicialização com o preset Glass Explorer
		aplicarPreset('glass-explorer');
	}

	if (typeof document !== 'undefined') {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', iniciar);
		} else {
			iniciar();
		}
	}

	return {
		PRESETS_XR,
		calcularFrameBudget,
		calcularLatenciaM2P,
		calcularPPD,
		calcularClassificacaoPPD,
		calcularAutonomiaMinutos,
		formatarAutonomia,
		calcularNivelTermico,
	};
});

/*
 * Quiz Técnico XR com Certificado em Canvas
 * Avalia conhecimentos em Óptica XR, Latência M2P, Condução Óssea, Rastreamento Espacial e WebXR.
 * Gera certificado de conclusão em alta resolução (1200x840) via Canvas API para download e impressão.
 * Aderente aos padrões WCAG AAA com navegação por teclado e leitor de tela.
 */
(function (root, factory) {
	'use strict';
	if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	} else {
		root.QuizXR = factory();
	}
})(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	const PERGUNTAS_QUIZ = [
		{
			id: 'p1',
			categoria: 'Óptica & Waveguides',
			pergunta: {
				pt: '1. Qual é o princípio óptico utilizado no display do Google Glass original para sobrepor imagens ao campo de visão?',
				en: '1. Which optical principle was used in the original Google Glass display to overlay imagery onto the user’s field of view?',
			},
			opcoes: {
				pt: [
					'Lentes Fresnel reflexivas com oclusão total da visão periférica',
					'Prisma óptico colimador semi-transparente projetando imagem virtual no quadrante superior',
					'Painel micro-LED translúcido colado diretamente na pupila',
					'Projeção de laser dicroico retinal em ambiente escuro',
				],
				en: [
					'Reflective Fresnel lenses with total peripheral occlusion',
					'Semi-transparent collimating optical prism projecting a virtual HUD in the upper quadrant',
					'Translucent micro-LED panel adhered directly onto the pupil',
					'Retinal dichroic laser projection restricted to dark environments',
				],
			},
			correta: 1,
			explicacao: {
				pt: 'O Glass utiliza um prisma de reflexão interna total que redireciona a luz de um micro-display LCoS para a retina, simulando uma tela de 25 polegadas a 2,4m de distância.',
				en: 'Glass utilizes a total internal reflection prism redirecting light from an LCoS micro-display onto the retina, simulating a 25-inch screen at 8 feet distance.',
			},
		},
		{
			id: 'p2',
			categoria: 'Latência Motion-to-Photon',
			pergunta: {
				pt: '2. Qual é a faixa de latência Motion-to-Photon (M2P) recomendada em XR para prevenir cinetose (simulator sickness)?',
				en: '2. What is the recommended Motion-to-Photon (M2P) latency threshold in XR to prevent simulator sickness?',
			},
			opcoes: {
				pt: [
					'Inferior a 20 milissegundos (idealmente ≤ 12 ms com reprojeção assíncrona)',
					'Entre 80 e 120 milissegundos',
					'Mais de 250 milissegundos para economia de energia',
					'Exatamente 60 milissegundos em qualquer condição',
				],
				en: [
					'Under 20 milliseconds (ideally ≤ 12 ms with asynchronous reprojection)',
					'Between 80 and 120 milliseconds',
					'Over 250 milliseconds to preserve battery life',
					'Exactly 60 milliseconds across all scenarios',
				],
			},
			correta: 0,
			explicacao: {
				pt: 'Latências superiores a 20 ms causam descompasso vestibular perceptível entre o movimento real da cabeça e a imagem renderizada, gerando desconforto e cinetose.',
				en: 'Latencies exceeding 20 ms introduce perceptible vestibular mismatch between head motion and rendering, triggering motion sickness.',
			},
		},
		{
			id: 'p3',
			categoria: 'Acústica & Condução Óssea',
			pergunta: {
				pt: '3. Como o transdutor de condução óssea do Glass transmite áudio sem tampar os ouvidos?',
				en: '3. How does the Glass bone conduction transducer deliver audio without blocking the ear canals?',
			},
			opcoes: {
				pt: [
					'Ondas eletromagnéticas direcionadas diretamente ao nervo auditivo',
					'Vibrações mecânicas aplicadas aos ossos temporais que estimulam diretamente a cóclea',
					'Micro-alto-falantes de ar ultrassônicos de alta frequência',
					'Indução magnética com receptores implantados',
				],
				en: [
					'Electromagnetic waves focused directly into the auditory nerve',
					'Mechanical vibrations applied to cranial/temporal bones stimulating the inner ear cochlea',
					'High-frequency directional ultrasonic air micro-speakers',
					'Magnetic induction paired with implanted subcutaneous coils',
				],
			},
			correta: 1,
			explicacao: {
				pt: 'A condução óssea bypassa a membrana timpânica, propagando microvibrações pelos ossos do crânio até a cóclea, mantendo o canal auditivo aberto para consciência situacional.',
				en: 'Bone conduction bypasses the eardrum, transmitting micro-vibrations across cranial bones directly to the cochlea, keeping ear canals open for situational awareness.',
			},
		},
		{
			id: 'p4',
			categoria: 'Rastreamento Espacial',
			pergunta: {
				pt: '4. Qual é a distinção fundamental entre rastreamento 3-DoF e 6-DoF em dispositivos XR?',
				en: '4. What is the key distinction between 3-DoF and 6-DoF spatial tracking in XR devices?',
			},
			opcoes: {
				pt: [
					'3-DoF mede apenas aceleração linear nos eixos X e Y',
					'6-DoF mede apenas batimentos cardíacos e pupilometria',
					'3-DoF rastreia rotação da cabeça (Yaw/Pitch/Roll); 6-DoF rastreia rotação e translação espacial (X/Y/Z)',
					'6-DoF requer 6 câmeras físicas dedicadas para funcionar',
				],
				en: [
					'3-DoF only tracks linear acceleration along the X and Y axes',
					'6-DoF only monitors biometric heart rate and pupil dilation',
					'3-DoF tracks rotational orientation (Yaw/Pitch/Roll); 6-DoF tracks rotation plus 3D translational position (X/Y/Z)',
					'6-DoF strictly requires 6 dedicated physical tracking cameras',
				],
			},
			correta: 2,
			explicacao: {
				pt: '3-DoF (3 Graus de Liberdade) permite apenas olhar ao redor no mesmo ponto; 6-DoF (6 Graus de Liberdade) permite andar, agachar e se deslocar no espaço tridimensional com paralaxe.',
				en: '3-DoF allows looking around from a fixed vantage point; 6-DoF allows physically moving, crouching and walking in 3D space with parallax.',
			},
		},
		{
			id: 'p5',
			categoria: 'Padrões WebXR',
			pergunta: {
				pt: '5. Qual padrão da W3C viabiliza aplicações imersivas AR/VR executadas nativamente no navegador web?',
				en: '5. Which W3C standard enables immersive AR/VR applications running natively inside modern web browsers?',
			},
			opcoes: {
				pt: [
					'WebXR Device API',
					'Shockwave 3D Plugin',
					'ActiveX Virtual Reality Kit',
					'Silverlight Immersive Extension',
				],
				en: [
					'WebXR Device API',
					'Shockwave 3D Plugin',
					'ActiveX Virtual Reality Kit',
					'Silverlight Immersive Extension',
				],
			},
			correta: 0,
			explicacao: {
				pt: 'A WebXR Device API é a especificação padrão da W3C que fornece acesso seguro a dispositivos de realidade virtual e aumentada em navegadores, sucedendo a antiga WebVR.',
				en: 'The WebXR Device API is the official W3C standard providing secure access to VR and AR hardware inside browsers, succeeding legacy WebVR.',
			},
		},
	];

	/**
	 * Calcula o resultado do quiz a partir de um objeto de respostas { p1: 1, p2: 0, ... }
	 */
	function calcularResultadoQuiz(respostas) {
		let acertos = 0;
		const total = PERGUNTAS_QUIZ.length;
		const detalhamento = [];

		for (const p of PERGUNTAS_QUIZ) {
			const escolhida = respostas && respostas[p.id] !== undefined ? Number(respostas[p.id]) : -1;
			const correta = escolhida === p.correta;
			if (correta) {
				acertos += 1;
			}
			detalhamento.push({
				id: p.id,
				correta,
				escolhida,
				esperada: p.correta,
			});
		}

		const porcentagem = Math.round((acertos / total) * 100);
		const aprovado = porcentagem >= 70; // 70% de aproveitamento mínimo (4/5)

		return {
			acertos,
			total,
			porcentagem,
			aprovado,
			detalhamento,
		};
	}

	/** Gera um identificador hash criptográfico/alfanumérico único para o certificado. */
	function gerarHashCertificado(nome) {
		const base = `${nome || 'Anonymous'}-${Date.now()}`;
		let hash = 0;
		for (let i = 0; i < base.length; i++) {
			hash = (hash << 5) - hash + base.charCodeAt(i);
			hash |= 0;
		}
		const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
		return `XR-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
	}

	/**
	 * Desenha o certificado no elemento <canvas> em alta resolução (1200 x 840).
	 */
	function desenharCertificado(canvas, dados) {
		if (!canvas) {
			return;
		}
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return;
		}

		const w = 1200;
		const h = 840;
		canvas.width = w;
		canvas.height = h;

		const idioma = dados.idioma || 'pt';
		const nome = dados.nome || (idioma === 'en' ? 'Distinguished Specialist' : 'Especialista Distinto');
		const data = dados.data || new Date().toLocaleDateString(idioma === 'en' ? 'en-US' : 'pt-BR');
		const codigo = dados.codigo || 'XR-CERT-2026-AAA';
		const pontuacao = dados.pontuacao || '100%';

		// Fundo pergaminho nobre
		const grad = ctx.createLinearGradient(0, 0, w, h);
		grad.addColorStop(0, '#fbfcfd');
		grad.addColorStop(0.5, '#f4f6fa');
		grad.addColorStop(1, '#e9edf4');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, w, h);

		// Moldura decorativa dupla com detalhes dourados
		ctx.strokeStyle = '#1a365d';
		ctx.lineWidth = 14;
		ctx.strokeRect(28, 28, w - 56, h - 56);

		ctx.strokeStyle = '#c69214';
		ctx.lineWidth = 4;
		ctx.strokeRect(44, 44, w - 88, h - 88);

		// Detalhes de cantoneiras geométricas
		const desenharCantoneira = (cx, cy) => {
			ctx.fillStyle = '#c69214';
			ctx.beginPath();
			ctx.arc(cx, cy, 12, 0, Math.PI * 2);
			ctx.fill();
		};
		desenharCantoneira(56, 56);
		desenharCantoneira(w - 56, 56);
		desenharCantoneira(56, h - 56);
		desenharCantoneira(w - 56, h - 56);

		// Cabeçalho institucional
		ctx.textAlign = 'center';
		ctx.fillStyle = '#64748b';
		ctx.font = 'bold 16px sans-serif';
		ctx.letterSpacing = '3px';
		ctx.fillText(idioma === 'en' ? 'EXTENDED REALITY & COMPUTATIONAL OPTICS ACADEMY' : 'ACADEMIA DE REALIDADE ESTENDIDA & ÓPTICA COMPUTACIONAL', w / 2, 115);

		// Título de Certificação
		ctx.fillStyle = '#0f172a';
		ctx.font = 'bold 44px serif';
		ctx.letterSpacing = '1px';
		ctx.fillText(idioma === 'en' ? 'CERTIFICATE OF ACHIEVEMENT' : 'CERTIFICADO DE CONQUISTA', w / 2, 180);

		// Subtítulo
		ctx.fillStyle = '#334155';
		ctx.font = 'italic 20px sans-serif';
		ctx.fillText(
			idioma === 'en'
				? 'This official credential certifies that'
				: 'Certificamos com distinção que',
			w / 2,
			240
		);

		// Nome do Aluno em destaque
		ctx.fillStyle = '#1e3a8a';
		ctx.font = 'bold 42px serif';
		ctx.fillText(nome, w / 2, 310);

		// Linha divisória de assinatura do nome
		ctx.strokeStyle = '#cbd5e1';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(w / 2 - 280, 330);
		ctx.lineTo(w / 2 + 280, 330);
		ctx.stroke();

		// Texto de mérito
		ctx.fillStyle = '#1e293b';
		ctx.font = '19px sans-serif';
		ctx.letterSpacing = '0px';
		const textoMerito1 = idioma === 'en'
			? `successfully completed the Advanced Technical Assessment in Spatial Computing & XR Systems,`
			: `concluiu com êxito a Avaliação Técnica Avançada em Computação Espacial e Sistemas XR,`;
		const textoMerito2 = idioma === 'en'
			? `demonstrating proficiency in Waveguide Optics, M2P Latency, Bone Conduction & WebXR Standards.`
			: `demonstrando proficiência em Óptica de Waveguides, Latência M2P, Condução Óssea e Padrões WebXR.`;
		ctx.fillText(textoMerito1, w / 2, 385);
		ctx.fillText(textoMerito2, w / 2, 420);

		// Selo Dourado Holográfico
		const seloX = w / 2;
		const seloY = 540;
		ctx.save();
		ctx.beginPath();
		ctx.arc(seloX, seloY, 60, 0, Math.PI * 2);
		const gradSelo = ctx.createRadialGradient(seloX, seloY, 10, seloX, seloY, 60);
		gradSelo.addColorStop(0, '#fef08a');
		gradSelo.addColorStop(0.7, '#eab308');
		gradSelo.addColorStop(1, '#a16207');
		ctx.fillStyle = gradSelo;
		ctx.fill();
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 3;
		ctx.stroke();

		ctx.fillStyle = '#451a03';
		ctx.font = 'bold 15px sans-serif';
		ctx.fillText('XR VERIFIED', seloX, seloY - 6);
		ctx.font = 'bold 13px sans-serif';
		ctx.fillText(`SCORE: ${pontuacao}`, seloX, seloY + 14);
		ctx.restore();

		// Assinaturas e Autenticação no rodapé
		ctx.textAlign = 'left';
		ctx.fillStyle = '#475569';
		ctx.font = '15px sans-serif';
		ctx.fillText(`${idioma === 'en' ? 'Date Issued' : 'Data de Emissão'}: ${data}`, 100, 715);
		ctx.fillText(`${idioma === 'en' ? 'Credential ID' : 'Código de Autenticação'}: ${codigo}`, 100, 742);

		ctx.textAlign = 'right';
		ctx.fillText('Pedro Henrique, Lead Architect', w - 100, 715);
		ctx.font = 'italic 13px sans-serif';
		ctx.fillText('Spatial Computing & WebXR Lab', w - 100, 738);

		// Linha decorativa de assinatura
		ctx.beginPath();
		ctx.moveTo(w - 320, 695);
		ctx.lineTo(w - 100, 695);
		ctx.strokeStyle = '#94a3b8';
		ctx.lineWidth = 1.5;
		ctx.stroke();
	}

	/**
	 * Inicializa o componente na interface web.
	 */
	function iniciar() {
		const secao = document.getElementById('quiz-tecnico');
		if (!secao) {
			return;
		}

		const form = document.getElementById('form-quiz');
		const btnEnviar = document.getElementById('btn-enviar-quiz');
		const btnReiniciar = document.getElementById('btn-reiniciar-quiz');
		const resultadoDiv = document.getElementById('resultado-quiz');
		const pontuacaoSpan = document.getElementById('pontuacao-quiz');
		const msgResultado = document.getElementById('mensagem-resultado-quiz');
		const secaoCertificado = document.getElementById('secao-certificado');
		const inputNomeCert = document.getElementById('quiz-nome-certificado');
		const btnGerarCert = document.getElementById('btn-gerar-certificado');
		const btnBaixarCert = document.getElementById('btn-baixar-certificado');
		const btnImprimirCert = document.getElementById('btn-imprimir-certificado');
		const canvasCert = document.getElementById('canvas-certificado');
		const statusAcessivel = document.getElementById('quiz-status-acessivel');

		const idioma = document.documentElement.lang && document.documentElement.lang.startsWith('en') ? 'en' : 'pt';

		let resultadoUltimo = null;

		if (form) {
			form.addEventListener('submit', (evento) => {
				evento.preventDefault();
				const formData = new FormData(form);
				const respostas = {};
				for (const [chave, valor] of formData.entries()) {
					respostas[chave] = valor;
				}

				const resultado = calcularResultadoQuiz(respostas);
				resultadoUltimo = resultado;

				// Atualiza visualização das questões
				for (const item of resultado.detalhamento) {
					const fieldset = document.getElementById(`grupo-${item.id}`);
					const feedback = document.getElementById(`feedback-${item.id}`);
					if (fieldset) {
						fieldset.classList.remove('resposta-correta', 'resposta-incorreta');
						fieldset.classList.add(item.correta ? 'resposta-correta' : 'resposta-incorreta');
					}
					if (feedback) {
						const p = PERGUNTAS_QUIZ.find((q) => q.id === item.id);
						feedback.textContent = (item.correta ? '✔ ' : '✖ ') + p.explicacao[idioma];
						feedback.hidden = false;
					}
				}

				// Exibe pontuação
				if (resultadoDiv) {
					resultadoDiv.hidden = false;
				}
				if (pontuacaoSpan) {
					pontuacaoSpan.textContent = `${resultado.acertos} / ${resultado.total} (${resultado.porcentagem}%)`;
				}
				if (msgResultado) {
					if (resultado.aprovado) {
						msgResultado.textContent = idioma === 'en'
							? 'Congratulations! You demonstrated excellent mastery in Spatial Computing and XR Technologies. Claim your Certificate of Achievement below!'
							: 'Parabéns! Você demonstrou excelente domínio em Computação Espacial e Tecnologias XR. Emita seu Certificado de Especialista abaixo!';
						if (secaoCertificado) {
							secaoCertificado.hidden = false;
						}
					} else {
						msgResultado.textContent = idioma === 'en'
							? 'You achieved under 70%. Review the explanations above and click "Try Again" to achieve your certification score!'
							: 'Aproveitamento abaixo de 70%. Revise as explicações acima e clique em "Tentar Novamente" para obter seu certificado!';
						if (secaoCertificado) {
							secaoCertificado.hidden = true;
						}
					}
				}

				if (statusAcessivel) {
					statusAcessivel.textContent = idioma === 'en'
						? `Quiz submitted. Score: ${resultado.acertos} of ${resultado.total}, ${resultado.porcentagem} percent. ${resultado.aprovado ? 'Approved' : 'Needs review'}.`
						: `Quiz enviado. Pontuação: ${resultado.acertos} de ${resultado.total}, ${resultado.porcentagem} por cento. ${resultado.aprovado ? 'Aprovado' : 'Necessita revisão'}.`;
				}

				if (btnReiniciar) {
					btnReiniciar.hidden = false;
				}
				if (btnEnviar) {
					btnEnviar.hidden = true;
				}
			});
		}

		if (btnReiniciar) {
			btnReiniciar.addEventListener('click', () => {
				if (form) {
					form.reset();
				}
				for (const p of PERGUNTAS_QUIZ) {
					const fieldset = document.getElementById(`grupo-${p.id}`);
					const feedback = document.getElementById(`feedback-${p.id}`);
					if (fieldset) {
						fieldset.classList.remove('resposta-correta', 'resposta-incorreta');
					}
					if (feedback) {
						feedback.hidden = true;
						feedback.textContent = '';
					}
				}
				if (resultadoDiv) {
					resultadoDiv.hidden = true;
				}
				if (secaoCertificado) {
					secaoCertificado.hidden = true;
				}
				if (btnReiniciar) {
					btnReiniciar.hidden = true;
				}
				if (btnEnviar) {
					btnEnviar.hidden = false;
				}
				if (statusAcessivel) {
					statusAcessivel.textContent = idioma === 'en' ? 'Quiz reset.' : 'Quiz reiniciado.';
				}
			});
		}

		if (btnGerarCert) {
			btnGerarCert.addEventListener('click', () => {
				const nome = inputNomeCert && inputNomeCert.value.trim() ? inputNomeCert.value.trim() : (idioma === 'en' ? 'XR Specialist' : 'Especialista em XR');
				const codigo = gerarHashCertificado(nome);
				const pontuacao = resultadoUltimo ? `${resultadoUltimo.porcentagem}%` : '100%';

				desenharCertificado(canvasCert, {
					nome,
					codigo,
					pontuacao,
					idioma,
				});

				if (canvasCert) {
					canvasCert.hidden = false;
				}
				if (btnBaixarCert) {
					btnBaixarCert.hidden = false;
				}
				if (btnImprimirCert) {
					btnImprimirCert.hidden = false;
				}

				if (statusAcessivel) {
					statusAcessivel.textContent = idioma === 'en'
						? `Certificate generated for ${nome} with verification code ${codigo}. Ready to download or print.`
						: `Certificado gerado para ${nome} com código ${codigo}. Pronto para baixar ou imprimir.`;
				}
			});
		}

		if (btnBaixarCert) {
			btnBaixarCert.addEventListener('click', () => {
				if (!canvasCert) {
					return;
				}
				const link = document.createElement('a');
				link.download = `Certificado-XR-${Date.now()}.png`;
				link.href = canvasCert.toDataURL('image/png');
				link.click();
			});
		}

		if (btnImprimirCert) {
			btnImprimirCert.addEventListener('click', () => {
				if (!canvasCert) {
					return;
				}
				const janela = window.open('', '_blank');
				if (janela) {
					janela.document.write(`
						<!DOCTYPE html>
						<html>
						<head><title>${idioma === 'en' ? 'Print Certificate' : 'Imprimir Certificado'}</title>
						<style>body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh;}img{max-width:100%;height:auto;}</style>
						</head>
						<body><img src="${canvasCert.toDataURL('image/png')}" onload="window.print();window.close();"></body>
						</html>
					`);
					janela.document.close();
				}
			});
		}
	}

	if (typeof document !== 'undefined') {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', iniciar);
		} else {
			iniciar();
		}
	}

	return {
		PERGUNTAS_QUIZ,
		calcularResultadoQuiz,
		gerarHashCertificado,
		desenharCertificado,
	};
});

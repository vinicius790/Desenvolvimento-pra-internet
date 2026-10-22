/*
 * Comparador de modelos do Glass: o visitante marca de 2 a 3 modelos e a tabela mostra
 * as especificações lado a lado, destacando as linhas em que os valores diferem.
 * Os dados vêm de _dados/modelos.json (textos em pt e en no mesmo arquivo, com as fontes),
 * entregues pelo script gerado _dados/modelos.js (veja dados.js).
 * As funções sem DOM são exportadas para os testes (tests/recursos.test.js).
 */
(function () {
	'use strict';

	const MINIMO = 2;
	const MAXIMO = 3;

	const TEXTOS = {
		pt: {
			especificacao: 'Especificação',
			diferente: 'valores diferentes',
			poucos: `Escolha pelo menos ${MINIMO} modelos para comparar.`,
			limite: `Limite de ${MAXIMO} modelos atingido: desmarque um para escolher outro.`,
			resumo: (modelos, diferencas, total) => `Comparando ${modelos} modelos: ${diferencas} de ${total} especificações diferem.`,
			copiar: 'Copiar link da comparação',
		copiado: 'Link da comparação copiado.',
			fallback: 'A seleção está no endereço da página; copie o link para compartilhar.',
		},
		en: {
			especificacao: 'Specification',
			diferente: 'values differ',
			poucos: `Pick at least ${MINIMO} models to compare.`,
			limite: `Limit of ${MAXIMO} models reached: uncheck one to pick another.`,
			resumo: (modelos, diferencas, total) => `Comparing ${modelos} models: ${diferencas} of ${total} specifications differ.`,
			copiar: 'Copy comparison link',
			copiado: 'Comparison link copied.',
			fallback: 'Your selection is in the page address; copy the link to share it.',
		},
	};

	/** Valor do JSON no idioma pedido: texto simples vale para as duas línguas. */
	function texto(valor, idioma) {
		if (valor && typeof valor === 'object') {
			return valor[idioma] ?? valor.pt ?? '';
		}
		return valor ?? '';
	}

	/** A seleção vale quando tem de 2 a 3 modelos. */
	function selecaoValida(ids) {
		return ids.length >= MINIMO && ids.length <= MAXIMO;
	}

	/** Seleção da URL, ignorando IDs repetidos ou que não existem. */
	function selecaoDaUrl(search, dados) {
		const permitidos = new Set(dados.modelos.map((modelo) => modelo.id));
		const pedidos = new URLSearchParams(search).get('modelos');
		const ids = [...new Set((pedidos || '').split(',').filter((id) => permitidos.has(id)))];
		return selecaoValida(ids) ? ids : dados.modelos.slice(0, MINIMO).map((modelo) => modelo.id);
	}

	/** Link direto para a comparação, preservando outros parâmetros e a âncora. */
	function linkDaComparacao(href, ids) {
		const url = new URL(href);
		if (selecaoValida(ids)) {
			url.searchParams.set('modelos', ids.join(','));
		} else {
			url.searchParams.delete('modelos');
		}
		return url.toString();
	}

	/**
	 * Linhas da tabela para os modelos escolhidos, na ordem do arquivo de dados:
	 * [{ chave, rotulo, valores: [um por modelo], diferente }].
	 */
	function montarLinhas(dados, ids, idioma) {
		const modelos = dados.modelos.filter((modelo) => ids.includes(modelo.id));
		return dados.campos.map((campo) => {
			const valores = modelos.map((modelo) => texto(modelo.valores[campo.chave], idioma));
			return {
				chave: campo.chave,
				rotulo: texto(campo.rotulo, idioma),
				valores,
				diferente: new Set(valores).size > 1,
			};
		});
	}

	function criar(nome, conteudo, atributos = {}) {
		const elemento = document.createElement(nome);
		elemento.textContent = conteudo;
		for (const [atributo, valor] of Object.entries(atributos)) {
			elemento.setAttribute(atributo, valor);
		}
		return elemento;
	}

	async function iniciar() {
		const secao = document.getElementById('comparador');
		if (!secao) {
			return;
		}
		const opcoes = document.getElementById('opcoes-modelos');
		const aviso = document.getElementById('aviso-comparador');
		const compartilhar = document.getElementById('compartilhar-comparacao');
		const soDiferencas = document.getElementById('so-diferencas');
		const tabela = document.getElementById('tabela-comparacao');
		const idioma = window.idiomaDaPagina();
		const textos = TEXTOS[idioma];

		const dados = await window.carregarDados(secao);
		if (!dados) {
			return;
		}

		// Fontes das especificações, na nota abaixo da tabela.
		document.getElementById('fontes-modelos').replaceChildren(...(dados.fontes || []).map((fonte) => {
			const item = document.createElement('li');
			item.append(criar('a', texto(fonte.nome, idioma), { href: fonte.url }));
			return item;
		}));

		dados.modelos.forEach((modelo, indice) => {
			const linha = criar('p', '', { class: 'opcao' });
			const caixa = criar('input', '', { type: 'checkbox', id: `modelo-${modelo.id}`, value: modelo.id });
			linha.append(caixa, criar('label', texto(modelo.nome, idioma), { for: caixa.id }));
			opcoes.append(linha);
		});
		const caixas = Array.from(opcoes.querySelectorAll('input'));
		const selecaoInicial = new Set(selecaoDaUrl(location.search, dados));
		for (const caixa of caixas) {
			caixa.checked = selecaoInicial.has(caixa.value);
		}

		// Atalhos dinâmicos para seleção rápida de modelos
		const containerAtalhos = document.createElement('div');
		containerAtalhos.className = 'atalhos-comparacao';
		const atalhosConfig = [
			{ rotulo: idioma === 'en' ? 'Explorer Editions' : 'Edições Explorer', ids: ['explorer-2013', 'explorer-2014'] },
			{ rotulo: idioma === 'en' ? 'Enterprise Editions' : 'Edições Enterprise', ids: ['enterprise-2017', 'enterprise-2019'] },
			{ rotulo: idioma === 'en' ? 'Glass vs Modern (2013 - 2024)' : 'Glass vs Modernos (2013 - 2024)', ids: ['explorer-2013', 'enterprise-2019', 'meta-rayban-2023'] },
			{ rotulo: idioma === 'en' ? 'All (3 Models)' : 'Todos (3 Modelos)', ids: ['explorer-2013', 'explorer-2014', 'enterprise-2017'] },
		];
		atalhosConfig.forEach((item) => {
			const botao = document.createElement('button');
			botao.type = 'button';
			botao.className = 'botao-atalho';
			botao.textContent = item.rotulo;
			botao.addEventListener('click', () => {
				for (const caixa of caixas) {
					caixa.checked = item.ids.includes(caixa.value);
				}
				atualizar();
			});
			containerAtalhos.append(botao);
		});
		opcoes.after(containerAtalhos);

		// Campo de busca / filtro dinâmico de especificações
		const containerFiltro = document.createElement('div');
		containerFiltro.className = 'filtro-specs-container';
		const inputFiltro = document.createElement('input');
		inputFiltro.type = 'search';
		inputFiltro.placeholder = idioma === 'en' ? 'Filter specifications (e.g. RAM, Camera)...' : 'Filtrar especificações (ex.: RAM, Câmera)...';
		inputFiltro.setAttribute('aria-label', idioma === 'en' ? 'Filter specifications' : 'Filtrar especificações');
		containerFiltro.append(inputFiltro);
		tabela.parentElement.before(containerFiltro);

		function filtrarEspecificacoes() {
			const termo = inputFiltro.value.trim().toLowerCase();
			const linhasTabela = tabela.tBodies[0].querySelectorAll('tr');
			linhasTabela.forEach((tr) => {
				if (!termo) {
					tr.style.display = '';
					return;
				}
				const conteudo = tr.textContent.toLowerCase();
				tr.style.display = conteudo.includes(termo) ? '' : 'none';
			});
		}
		inputFiltro.addEventListener('input', filtrarEspecificacoes);

		function atualizar() {
			const ids = caixas.filter((caixa) => caixa.checked).map((caixa) => caixa.value);
			compartilhar.disabled = !selecaoValida(ids);
			// No limite, as caixas livres ficam desativadas: não dá para passar de 3.
			for (const caixa of caixas) {
				caixa.disabled = !caixa.checked && ids.length >= MAXIMO;
			}

			const modelos = dados.modelos.filter((modelo) => ids.includes(modelo.id));
			const linhas = montarLinhas(dados, ids, idioma);

			const cabecalho = document.createElement('tr');
			cabecalho.append(criar('th', textos.especificacao, { scope: 'col' }));
			for (const modelo of modelos) {
				cabecalho.append(criar('th', texto(modelo.nome, idioma), { scope: 'col' }));
			}
			tabela.tHead.replaceChildren(cabecalho);

			tabela.tBodies[0].replaceChildren(...linhas.map((linha) => {
				const tr = document.createElement('tr');
				const th = criar('th', linha.rotulo, { scope: 'row' });
				if (linha.diferente && selecaoValida(ids)) {
					tr.className = 'diferente';
					th.append(
						criar('span', '≠', { class: 'marca-dif', 'aria-hidden': 'true' }),
						criar('span', ` (${textos.diferente})`, { class: 'so-leitor' }),
					);
				}
				tr.append(th, ...linha.valores.map((valor) => criar('td', valor)));
				return tr;
			}));

			tabela.classList.toggle('so-diferencas', soDiferencas.checked && selecaoValida(ids));
			filtrarEspecificacoes();

			if (!selecaoValida(ids)) {
				aviso.textContent = textos.poucos;
			} else {
				const diferencas = linhas.filter((linha) => linha.diferente).length;
				const resumo = textos.resumo(ids.length, diferencas, linhas.length);
				aviso.textContent = ids.length >= MAXIMO ? `${resumo} ${textos.limite}` : resumo;
			}
		}

		opcoes.addEventListener('change', atualizar);
		soDiferencas.addEventListener('change', atualizar);
		compartilhar.textContent = textos.copiar;
		compartilhar.addEventListener('click', async () => {
			const ids = caixas.filter((caixa) => caixa.checked).map((caixa) => caixa.value);
			if (!selecaoValida(ids)) {
				return;
			}
			const link = linkDaComparacao(location.href, ids);
			history.replaceState(null, '', link);
			try {
				if (navigator.share) {
					await navigator.share({ title: document.title, url: link });
					aviso.textContent = textos.copiado;
				} else if (navigator.clipboard && window.isSecureContext) {
					await navigator.clipboard.writeText(link);
					aviso.textContent = textos.copiado;
				} else {
					aviso.textContent = textos.fallback;
				}
			} catch (error) {
				if (error.name !== 'AbortError') {
					aviso.textContent = textos.fallback;
				}
			}
		});
		atualizar();

		iniciarGraficosComparativos(idioma);
	}

	const DADOS_COMPARATIVO = [
		{
			id: 'explorer-2013',
			nome: 'Google Glass Explorer (2013)',
			ano: 2013,
			peso: 42,
			pesoLabel: '42 g',
			bateria: 570,
			bateriaLabel: '570 mAh (~4h)',
			resolucao: 230400,
			resolucaoLabel: '640 × 360 px (0.23 MP)',
			fov: 13,
			fovLabel: '13° (monocular)',
			casosUso: {
				pt: 'Notificações heads-up hands-free, fotos POV e gravação rápida de vídeos.',
				en: 'Hands-free heads-up notifications, POV photos, and rapid video capture.',
			},
			destaque: {
				pt: 'Pioneiro absoluto da computação vestível em formato de óculos ultra-leve.',
				en: 'Pioneering ultra-lightweight wearable display and early voice AI assistant.',
			},
			cor: '#0284c7',
		},
		{
			id: 'enterprise-2019',
			nome: 'Glass Enterprise Edition 2 (2019)',
			ano: 2019,
			peso: 51,
			pesoLabel: '51 g',
			bateria: 800,
			bateriaLabel: '800 mAh (~8h turno)',
			resolucao: 230400,
			resolucaoLabel: '640 × 360 px (0.23 MP)',
			fov: 13,
			fovLabel: '13° (monocular industrial)',
			casosUso: {
				pt: 'Manufatura, logística, inspeção de qualidade, telemedicina e manutenção aeroespacial.',
				en: 'Manufacturing, logistics, quality inspection, telemedicine, and aerospace maintenance.',
			},
			destaque: {
				pt: 'Chip Snapdragon XR1 dedicado, carga rápida USB-C e foco em produtividade industrial.',
				en: 'Dedicated Snapdragon XR1 chip, USB-C fast charging, and enterprise productivity.',
			},
			cor: '#0d9488',
		},
		{
			id: 'meta-rayban-2023',
			nome: 'Meta Ray-Ban Smart Glasses (2023)',
			ano: 2023,
			peso: 48.6,
			pesoLabel: '48,6 g',
			bateria: 154,
			bateriaLabel: '154 mAh (+32h estojo)',
			resolucao: 0,
			resolucaoLabel: '0 px (sem tela visual)',
			fov: 0,
			fovLabel: '0° (áudio e IA sem tela)',
			casosUso: {
				pt: 'Redes sociais, livestreaming Instagram/Facebook, assistente Meta AI multimodal e chamadas open-ear.',
				en: 'Social media, Instagram/Facebook livestreaming, multimodal Meta AI assistant, and open-ear calls.',
			},
			destaque: {
				pt: 'Design Wayfarer clássico idêntico a óculos comuns, IA multimodal e som direcional.',
				en: 'Classic Wayfarer form factor, multimodal Meta AI assistant, and open-ear directional audio.',
			},
			cor: '#7c3aed',
		},
		{
			id: 'apple-vision-pro-2024',
			nome: 'Apple Vision Pro (2024)',
			ano: 2024,
			peso: 650,
			pesoLabel: '650 g',
			bateria: 3166,
			bateriaLabel: '3.166 mAh (~2h a 2h30)',
			resolucao: 23424000,
			resolucaoLabel: '3660 × 3200 por olho (23 MP)',
			fov: 100,
			fovLabel: '100° (binocular imersivo)',
			casosUso: {
				pt: 'Computação espacial imersiva, múltiplos monitores virtuais Mac, cinema 3D e produtividade profissional.',
				en: 'Immersive spatial computing, multiple virtual Mac monitors, 3D cinema, and pro productivity.',
			},
			destaque: {
				pt: 'Processador Apple M2 + co-processador R1, telas micro-OLED 4K duplas e rastreamento ocular.',
				en: 'Dual M2 and R1 chips, dual 4K micro-OLED displays, and eye/hand tracking.',
			},
			cor: '#e11d48',
		},
	];

	function iniciarGraficosComparativos(idioma) {
		const seletor = document.getElementById('seletor-metricas');
		const canvas = document.getElementById('canvas-grafico-comparativo');
		const painelAcessivel = document.getElementById('painel-metricas-acessivel');
		const containerCards = document.getElementById('cards-evolucao');

		if (!canvas || !seletor || !painelAcessivel) {
			return;
		}

		let metricaAtiva = 'peso';

		const metricasInfo = {
			peso: {
				titulo: idioma === 'en' ? 'Weight on Face (grams)' : 'Peso no Rosto (gramas)',
				obterValor: (d) => d.peso,
				obterLabel: (d) => d.pesoLabel,
				unidade: 'g',
				maximo: 700,
				analise: idioma === 'en'
					? 'Google Glass remains the lightest wearable display ever made for daily wear (42g). In comparison, Apple Vision Pro prioritizes ultra-high fidelity spatial computing at the cost of substantial facial weight (650g), which is 15.5x heavier than Google Glass.'
					: 'O Google Glass original permanece como o dispositivo com tela mais leve já criado para uso contínuo (apenas 42 g). Em contraste, o Apple Vision Pro aposta em imersão máxima ao custo de 650 g no rosto (15,5 vezes mais pesado que o Glass original).',
			},
			bateria: {
				titulo: idioma === 'en' ? 'Battery Capacity (mAh) & Typical Autonomy' : 'Capacidade de Bateria (mAh) e Autonomia',
				obterValor: (d) => d.bateria,
				obterLabel: (d) => d.bateriaLabel,
				unidade: 'mAh',
				maximo: 3500,
				analise: idioma === 'en'
					? 'Glass Explorer relied on a 570 mAh battery with passive thermal dissipation. Enterprise 2 upgraded to 800 mAh with fast USB-C charging for whole-shift enterprise workflows. Meta Ray-Ban uses a tiny 154 mAh internal cell combined with a 32h charging case. Vision Pro uses an external wired battery pack of 3,166 mAh to support its dual M2/R1 chips.'
					: 'O Glass Explorer utilizava bateria de 570 mAh com dissipação passiva. A Enterprise 2 subiu para 800 mAh com recarga rápida por USB-C para turnos completos de trabalho. O Meta Ray-Ban aposta em uma microbateria interna de 154 mAh com estojo de recarga (32h extras). Já o Vision Pro necessita de uma bateria externa de 3.166 mAh conectada por cabo para alimentar seus dois processadores M2 e R1.',
			},
			resolucao: {
				titulo: idioma === 'en' ? 'Display Resolution (Total Pixels)' : 'Resolução de Tela (Pixels Totais)',
				obterValor: (d) => d.resolucao,
				obterLabel: (d) => d.resolucaoLabel,
				unidade: 'px',
				maximo: 25000000,
				analise: idioma === 'en'
					? 'Google Glass pioneered heads-up optical prisms with 640 × 360 pixels, floating unobtrusively in peripheral vision. Meta Ray-Ban chose to eliminate displays entirely to focus on camera and open-ear voice AI. Apple Vision Pro pushed micro-OLED technology to 23 million pixels, rendering individual pixels invisible to human eyes.'
					: 'O Google Glass foi pioneiro no prisma óptico monocular de 640 × 360 pixels, flutuando discretamente na visão periférica. O Meta Ray-Ban optou por não ter display algum para focar em áudio, câmera e IA. Já o Apple Vision Pro elevou a resolução a 23 milhões de pixels em micro-OLED, tornando os pixels imperceptíveis ao olho humano.',
			},
			fov: {
				titulo: idioma === 'en' ? 'Field of View (Degrees)' : 'Campo de Visão / FoV (Graus)',
				obterValor: (d) => d.fov,
				obterLabel: (d) => d.fovLabel,
				unidade: '°',
				maximo: 110,
				analise: idioma === 'en'
					? 'Google Glass’s 13° FoV was intentionally designed to stay out of the direct line of sight, keeping the real world unobstructed. Meta Ray-Ban has 0° FoV (displayless). Apple Vision Pro provides ~100° binocular FoV for full spatial immersion with high-definition video pass-through.'
					: 'O campo de visão de 13° do Google Glass foi desenhado intencionalmente para não obstruir o mundo real, ficando no canto superior direito. Os óculos Meta Ray-Ban possuem 0° de FoV (sem tela). O Apple Vision Pro oferece cerca de 100° binoculares para imersão espacial completa via pass-through de vídeo.',
			},
			'casos-uso': {
				titulo: idioma === 'en' ? 'Primary Use Cases & Ecosystem Target' : 'Casos de Uso Principais & Ecossistema',
				obterValor: () => 100,
				obterLabel: (d) => (idioma === 'en' ? d.casosUso.en : d.casosUso.pt),
				unidade: '',
				maximo: 100,
				analise: idioma === 'en'
					? 'The wearable landscape evolved from Google Glass’s early glanceable notification concept into two distinct categories: lightweight AI audio smart glasses (Meta Ray-Ban) and fully immersive spatial computing headsets (Apple Vision Pro).'
					: 'O ecossistema evoluiu das notificações rápidas pioneiras do Google Glass para duas frentes distintas: óculos leves com IA e áudio (Meta Ray-Ban) e headsets de computação espacial imersiva (Apple Vision Pro).',
			},
		};

		function desenharGrafico() {
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				return;
			}
			const w = canvas.width;
			const h = canvas.height;
			ctx.clearRect(0, 0, w, h);

			const info = metricasInfo[metricaAtiva];
			const estilos = getComputedStyle(document.documentElement);
			const corTexto = estilos.getPropertyValue('--preto').trim() || '#1a1a1a';
			const corBorda = estilos.getPropertyValue('--borda').trim() || '#b5b5b5';

			// Título do Gráfico
			ctx.fillStyle = corTexto;
			ctx.font = 'bold 15px Arial, sans-serif';
			ctx.textAlign = 'left';
			ctx.fillText(info.titulo, 20, 28);

			const barTop = 50;
			const barHeight = 44;
			const gap = 24;
			const labelWidth = 240;
			const chartWidth = w - labelWidth - 90;

			DADOS_COMPARATIVO.forEach((item, idx) => {
				const y = barTop + idx * (barHeight + gap);
				const valor = info.obterValor(item);
				const label = info.obterLabel(item);

				// Rótulo do Dispositivo
				ctx.fillStyle = corTexto;
				ctx.font = '600 13px Arial, sans-serif';
				ctx.textAlign = 'left';
				ctx.fillText(`${item.ano}: ${item.nome.split(' (')[0]}`, 20, y + 20);

				// Barra de Fundo
				ctx.fillStyle = 'rgba(150, 150, 150, 0.15)';
				ctx.beginPath();
				ctx.roundRect(labelWidth, y, chartWidth, barHeight, 6);
				ctx.fill();

				// Barra de Valor
				let proporcao = 0;
				if (metricaAtiva === 'casos-uso') {
					proporcao = 0.25 * (idx + 1);
				} else if (info.maximo > 0) {
					proporcao = Math.max(0.04, Math.min(1, valor / info.maximo));
				}
				const barraLargura = Math.max(8, chartWidth * proporcao);

				ctx.fillStyle = item.cor;
				ctx.beginPath();
				ctx.roundRect(labelWidth, y, barraLargura, barHeight, 6);
				ctx.fill();

				// Texto do Valor sobre/ao lado da barra
				ctx.fillStyle = corTexto;
				ctx.font = 'bold 12px Arial, sans-serif';
				ctx.textAlign = 'left';
				ctx.fillText(label, labelWidth + barraLargura + 10, y + 26);
			});
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

		function atualizarPainelAcessivel() {
			const info = metricasInfo[metricaAtiva];
			const htmlLista = DADOS_COMPARATIVO.map((item) => `
				<div class="card-item-metrica" style="border-left: 4px solid ${item.cor};">
					<h4>${item.nome} (${item.ano})</h4>
					<p><strong>${info.titulo}:</strong> ${info.obterLabel(item)}</p>
					<p class="destaque-hardware">${idioma === 'en' ? item.destaque.en : item.destaque.pt}</p>
				</div>
			`).join('');

			painelAcessivel.innerHTML = sanitizeHtml(`
				<div class="analise-tecnica-metrica">
					<p class="resumo-analise">${info.analise}</p>
				</div>
				<div class="grid-metricas-detalhe">
					${htmlLista}
				</div>
			`);
		}

		function renderizarCardsEvolucao() {
			if (!containerCards) {
				return;
			}
			const titulosEvolucao = {
				pt: 'Marcos Históricos da Década de Computação Vestível',
				en: 'Wearable Computing Milestone Timeline (2013 - 2024)',
			};
			const cardsHtml = DADOS_COMPARATIVO.map((item) => `
				<article class="card-marco-historico" style="border-top: 4px solid ${item.cor};">
					<span class="badge-ano">${item.ano}</span>
					<h3>${item.nome}</h3>
					<ul class="specs-resumo-marco">
						<li><strong>Peso:</strong> ${item.pesoLabel}</li>
						<li><strong>Bateria:</strong> ${item.bateriaLabel}</li>
						<li><strong>Tela:</strong> ${item.resolucaoLabel}</li>
						<li><strong>FoV:</strong> ${item.fovLabel}</li>
					</ul>
					<p class="marco-caso-uso">${idioma === 'en' ? item.casosUso.en : item.casosUso.pt}</p>
				</article>
			`).join('');

			containerCards.innerHTML = sanitizeHtml(`
				<h3 class="titulo-marcos">${titulosEvolucao[idioma] || titulosEvolucao.pt}</h3>
				<div class="grid-marcos">${cardsHtml}</div>
			`);
		}

		const tabs = [
			document.getElementById('tab-peso'),
			document.getElementById('tab-bateria'),
			document.getElementById('tab-resolucao'),
			document.getElementById('tab-fov'),
			document.getElementById('tab-casos-uso'),
		].filter(Boolean);

		tabs.forEach((tab) => {
			tab.addEventListener('click', () => {
				tabs.forEach((t) => {
					t.classList.remove('ativo');
					t.setAttribute('aria-selected', 'false');
				});
				tab.classList.add('ativo');
				tab.setAttribute('aria-selected', 'true');
				metricaAtiva = tab.getAttribute('data-metrica') || 'peso';
				desenharGrafico();
				atualizarPainelAcessivel();
			});
		});

		desenharGrafico();
		atualizarPainelAcessivel();
		renderizarCardsEvolucao();

		window.addEventListener('resize', desenharGrafico);
	}

	if (typeof module === 'object' && module.exports) {
		module.exports = { MINIMO, MAXIMO, texto, selecaoValida, selecaoDaUrl, linkDaComparacao, montarLinhas };
	}

	if (typeof document !== 'undefined') {
		iniciar();
	}
})();

/*
 * Service Worker para o site Google Glass.
 * Oferece cache offline para consulta sem internet, atualizações em segundo plano
 * e navegação resiliente.
 */
'use strict';

const VERSAO = 'google-glass-v2';
const CACHE_ESTATICO = `estatico-${VERSAO}`;

const RECURSOS_ESSENCIAIS = [
	'./',
	'./index.html',
	'./specs.html',
	'./comparar.html',
	'./linha-do-tempo.html',
	'./fotos.html',
	'./multimidia.html',
	'./fale-conosco.html',
	'./busca.html',
	'./google-glass.html',
	'./en/index.html',
	'./en/specs.html',
	'./en/compare.html',
	'./en/timeline.html',
	'./en/photos.html',
	'./en/multimedia.html',
	'./en/contact.html',
	'./en/search.html',
	'./en/google-glass.html',
	'./_css/estilo.css',
	'./_css/comparar.css',
	'./_css/linha.css',
	'./_css/specs.css',
	'./_css/fotos.css',
	'./_css/form.css',
	'./_css/media.css',
	'./_css/busca.css',
	'./_css/audio-guia.css',
	'./_css/simulador-perf.css',
	'./_css/quiz.css',
	'./_javascript/tema.js',
	'./_javascript/funcoes.js',
	'./_javascript/dados.js',
	'./_javascript/comparar.js',
	'./_javascript/linha-do-tempo.js',
	'./_javascript/galeria.js',
	'./_javascript/pedido.js',
	'./_javascript/quadro.js',
	'./_javascript/busca.js',
	'./_javascript/audio-guia.js',
	'./_javascript/simulador.js',
	'./_javascript/simulador-perf.js',
	'./_javascript/quiz.js',
	'./_dados/modelos.js',
	'./_dados/linha-do-tempo.js',
	'./_dados/indice-busca.js',
	'./_imagens/glass-logo.svg',
	'./_imagens/glass-oculos.svg',
	'./_imagens/home.svg',
	'./_imagens/especificacoes.svg',
	'./_imagens/comparar.svg',
	'./_imagens/linha-do-tempo.svg',
	'./_imagens/fotos.svg',
	'./_imagens/multimidia.svg',
	'./_imagens/contato.svg',
	'./_imagens/busca.svg',
	'./_imagens/lupa.svg',
	'./_imagens/lua.svg',
	'./_imagens/sol.svg',
	'./_imagens/audio-guia.svg',
	'./manifest.json',
];

self.addEventListener('install', (evento) => {
	evento.waitUntil(
		caches.open(CACHE_ESTATICO).then((cache) => {
			return cache.addAll(RECURSOS_ESSENCIAIS).catch(() => {
				// Permite instalação mesmo se algum recurso opcional falhar
			});
		}).then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (evento) => {
	evento.waitUntil(
		caches.keys().then((chaves) => {
			return Promise.all(
				chaves.map((chave) => {
					if (chave !== CACHE_ESTATICO) {
						return caches.delete(chave);
					}
				})
			);
		}).then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (evento) => {
	const pedido = evento.request;
	if (pedido.method !== 'GET') {
		return;
	}

	evento.respondWith(
		caches.match(pedido).then((respostaCache) => {
			if (respostaCache) {
				// Busca em segundo plano para atualizar o cache (Stale-While-Revalidate)
				fetch(pedido).then((respostaRede) => {
					if (respostaRede && respostaRede.status === 200) {
						caches.open(CACHE_ESTATICO).then((cache) => cache.put(pedido, respostaRede));
					}
				}).catch(() => {});
				return respostaCache;
			}

			return fetch(pedido).then((respostaRede) => {
				if (respostaRede && respostaRede.status === 200) {
					const clone = respostaRede.clone();
					caches.open(CACHE_ESTATICO).then((cache) => cache.put(pedido, clone));
				}
				return respostaRede;
			}).catch(() => {
				// Se offline e for página HTML, fallback para a inicial em cache
				if (pedido.headers.get('accept')?.includes('text/html')) {
					return caches.match('./index.html');
				}
			});
		})
	);
});

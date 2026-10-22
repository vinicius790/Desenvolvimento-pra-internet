/*
 * Funções comuns a todas as páginas.
 * Troca a ilustração do cabeçalho quando o mouse (ou o foco do teclado) passa
 * por um item do menu e devolve a ilustração da página ao sair.
 * Registra o Service Worker (PWA) para cache offline.
 */
(function () {
	'use strict';

	// Registro do Service Worker para suporte a PWA e consulta offline
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', function () {
			var swUrl = document.documentElement.lang === 'en' ? '../sw.js' : 'sw.js';
			navigator.serviceWorker.register(swUrl).catch(function () {});
		});
	}

	const icone = document.getElementById('icone');
	const menu = document.getElementById('menu');
	if (!icone || !menu) {
		return;
	}

	const fotoDaPagina = icone.getAttribute('src');

	function mudaFoto(foto) {
		icone.src = foto;
	}

	function aoEntrar(evento) {
		const link = evento.target.closest('a[data-icone]');
		if (link) {
			mudaFoto(link.dataset.icone);
		}
	}

	function aoSair() {
		mudaFoto(fotoDaPagina);
	}

	menu.addEventListener('mouseover', aoEntrar);
	menu.addEventListener('focusin', aoEntrar);
	menu.addEventListener('mouseout', aoSair);
	menu.addEventListener('focusout', aoSair);
})();

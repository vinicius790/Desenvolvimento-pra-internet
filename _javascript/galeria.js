/*
 * Galeria de fotos: abre a foto ampliada em um <dialog> modal.
 * O próprio <dialog> prende o foco, fecha com Esc e deixa o resto da página inerte.
 * Sem JavaScript (ou sem suporte a <dialog>) os links abrem a imagem diretamente.
 */
(function () {
	'use strict';

	const visor = document.getElementById('visor');
	const imagem = document.getElementById('visor-imagem');
	const legenda = document.getElementById('visor-legenda');
	const links = Array.from(document.querySelectorAll('#album-fotos a'));
	if (!visor || typeof visor.showModal !== 'function' || links.length === 0) {
		return;
	}

	const emIngles = document.documentElement.lang.toLowerCase().startsWith('en');
	let atual = 0;

	function mostrar(indice) {
		atual = (indice + links.length) % links.length;
		const link = links[atual];
		imagem.src = link.href;
		imagem.alt = link.querySelector('img').alt;
		const posicao = emIngles ? `photo ${atual + 1} of ${links.length}` : `foto ${atual + 1} de ${links.length}`;
		legenda.textContent = `${link.textContent.trim()} (${posicao})`;
	}

	links.forEach((link, indice) => {
		link.addEventListener('click', (evento) => {
			evento.preventDefault();
			mostrar(indice);
			visor.showModal();
		});
	});

	document.getElementById('visor-anterior').addEventListener('click', () => mostrar(atual - 1));
	document.getElementById('visor-proxima').addEventListener('click', () => mostrar(atual + 1));
	document.getElementById('visor-fechar').addEventListener('click', () => visor.close());

	visor.addEventListener('keydown', (evento) => {
		if (evento.key === 'ArrowLeft') {
			mostrar(atual - 1);
		} else if (evento.key === 'ArrowRight') {
			mostrar(atual + 1);
		}
	});

	// Clique no fundo escurecido (fora da foto) fecha o visor.
	visor.addEventListener('click', (evento) => {
		if (evento.target === visor) {
			visor.close();
		}
	});

	// Ao fechar, o foco volta para a miniatura da foto que estava aberta.
	visor.addEventListener('close', () => links[atual].focus());
})();

/*
 * Marca google-glass.html quando ela está dentro do quadro (iframe) de specs.html,
 * para o CSS mostrar o convite "clique nos pontos" enquanto nenhum recurso foi escolhido.
 * O quadro não abre mais em "#topo" porque a âncora fazia o navegador rolar a
 * specs.html até o quadro logo ao carregar. Carregado sem defer, antes da pintura.
 */
if (window.self !== window.top) {
	document.documentElement.classList.add('em-quadro');
}

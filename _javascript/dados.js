/*
 * Apoio às páginas que usam os dados de _dados/ (comparador, linha do tempo e busca).
 * Os dados chegam por scripts gerados a partir dos JSON (_dados/modelos.js etc., criados
 * por scripts/gerar-indice.js), carregados antes deste arquivo: com <script>, e não com
 * fetch, a página funciona também aberta direto do disco (file://). O atributo data-dados
 * do elemento diz qual script ele usa; as páginas em inglês, em en/, usam "../_dados/...".
 * Se os dados não estiverem lá (script não carregado), o elemento passa a mostrar um aviso.
 */
(function () {
	'use strict';

	const FALHA = {
		pt: 'Não foi possível carregar os dados desta página. Recarregue a página; se o problema continuar, confira se a pasta _dados está completa.',
		en: 'The data for this page could not be loaded. Reload the page; if the problem persists, check that the _dados folder is complete.',
	};

	/** "pt" ou "en", conforme o lang da página. */
	window.idiomaDaPagina = function () {
		return document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'pt';
	};

	/** Os dados de elemento.dataset.dados ("../_dados/modelos.js" -> "modelos"), ou null (com aviso na página). */
	window.carregarDados = function (elemento) {
		const nome = (elemento.dataset.dados || '').split('/').pop().replace(/\.js$/, '');
		if (window.dadosDoSite && Object.hasOwn(window.dadosDoSite, nome)) {
			return window.dadosDoSite[nome];
		}
		const aviso = document.createElement('p');
		aviso.className = 'nota';
		aviso.setAttribute('role', 'alert');
		aviso.textContent = FALHA[window.idiomaDaPagina()];
		elemento.replaceChildren(aviso);
		return null;
	};
})();

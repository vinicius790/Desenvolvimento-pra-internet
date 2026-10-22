# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-10-16 - XR Performance Engine, Interactive Quiz & WCAG AAA

### Added
- **Simulador de Performance AR/VR**: Módulo de engenharia física e gráfica em `specs.html` e `en/specs.html` (`_javascript/simulador-perf.js`, `_css/simulador-perf.css`) com presets para Google Glass Explorer, Glass Enterprise 2, Meta Quest 3, Apple Vision Pro, HoloLens 2 e modo Personalizado. Calcula taxa de quadros (FPS: 30 a 120), frame budget em milissegundos, latência Motion-to-Photon (M2P) com reprojeção assíncrona (ATW), campo de visão (FOV com diagrama SVG dinâmico), resolução angular (PPD), autonomia de bateria (horas/minutos) e classificação de estresse térmico do SoC.
- **Linha do Tempo Interativa XR Aprimorada**: Adição de modo Auto-Tour com ciclo automático de apresentação, barra de progresso visual em tempo real (`role="progressbar"`), feedback acústico por sintetizador Web Audio API e navegação completa por teclado em `linha-do-tempo.html` e `en/timeline.html`.
- **Quiz Técnico XR com Certificado em Canvas**: Avaliação técnica avançada em `multimidia.html` e `en/multimedia.html` (`_javascript/quiz.js`, `_css/quiz.css`) cobrindo Óptica de Waveguides/Prisma, Latência Motion-to-Photon, Condução Óssea, Rastreamento Espacial (3-DoF vs 6-DoF) e WebXR Device API. Inclui emissor de Certificado Oficial de Conclusão em alta resolução (1200x840 px) renderizado via HTML5 Canvas 2D, com cálculo de hash criptográfico único (`XR-XXXX-XXXX`), selo holográfico dourado, download direto em PNG e suporte a impressão/PDF.
- **PWA Offline & Service Worker v2**: Atualização do Service Worker (`sw.js`) para a versão `google-glass-v2`, com cache offline de todos os novos módulos de simulação e quiz, e vinculação explícita de `manifest.json` com `theme-color`.
- **Acessibilidade WCAG 2.1 / 2.2 AAA**: Todos os novos módulos atendem ao padrão AAA com contraste ≥ 7:1 para texto normal, botões de alternância de tamanho de fonte (`#alternar-fonte`), regiões de anúncio `aria-live="polite"` para leitores de tela e estados `:focus-visible` de alto relevo.
- **Workflow de Integração Contínua (CI)**: Criação de `.github/workflows/ci.yml` com matriz de testes em Node.js 20, 22 e 24 para pull requests e pushes em todas as branches.
- **Suíte de Testes Expandida (81 testes)**: Adição de `tests/xr-simulador-quiz.test.js` com testes unitários para fórmulas físicas do simulador e lógica avaliativa do quiz, atingindo 100% de aprovação na suíte completa (`node --test`).

### Fixed
- Adição dos botões `#alternar-fonte` ausentes em `fotos.html`, `multimidia.html`, `en/photos.html` e `en/multimedia.html`.
- Correção no decodificador de entidades HTML de `scripts/gerar-indice.js` para suportar símbolos numéricos e entidades como `&bull;`, `&Rsh;`, setas e traços no índice de busca.
- Atualização do teste de workflow em `tests/site.test.js` para validar tanto o pipeline de CI (`ci.yml`) quanto o de publicação no Pages (`static.yml`).

---

## [2.0.0] - 2026-10-15 - Grand Modernization

### Added
- **Internacionalização Completa (i18n)**: Suporte bilíngue com 9 páginas em português e 9 páginas espelhadas em inglês (`en/`), com alternância fluida de idioma e marcação bidirecional `<link rel="alternate" hreflang>`.
- **Comparador Interativo de Modelos**: Ferramenta em `comparar.html` (e `en/compare.html`) para comparar especificações técnicas de 2 a 3 variantes do Google Glass (Explorer, Enterprise Edition 1 e 2), com sincronização de parâmetros na URL para compartilhamento direto.
- **Linha do Tempo Histórica**: Visualização cronológica interativa em `linha-do-tempo.html` (e `en/timeline.html`) cobrindo de 2012 a 2023, com controle por teclado e links para fontes documentais.
- **Mecanismo de Busca Interna**: Sistema de busca estática em `busca.html` (e `en/search.html`) com indexação local, relevância ponderada, marcação de termos (`<mark>`) e funcionamento 100% offline via protocolo `file://` sem necessidade de backend.
- **Acessibilidade e Modos de Visualização**: Alternância dinâmica entre tema claro, modo escuro (contraste WCAG AA) e modo de alto contraste (contraste WCAG AAA).
- **Galeria de Fotos com Lightbox**: Visualizador ampliado em `fotos.html` com suporte completo a atalhos de teclado (Tab, Enter, setas direcionais e Esc).
- **Formulário de Contato e Pedido Reativo**: Cálculo dinâmico de valor total em tempo real, validação avançada de campos e painel de resumo dinâmico em `fale-conosco.html`.
- **Script Gerador de Dados e Índices**: Ferramenta sem dependências em `scripts/gerar-indice.js` para compilação automática do índice de busca e sincronização de metadados `hreflang` e `canonical`.
- **Suíte de Testes Automatizados (71 testes)**: Testes de unidade e integridade em `tests/` (`pedido.test.js`, `recursos.test.js` e `site.test.js`) cobrindo regras de negócio, dados, links locais e acessibilidade com o Node.js Test Runner nativo.
- **Integração Contínua (CI/CD)**: Pipeline no GitHub Actions para execução de testes e validação automática a cada push/pull request.

### Changed
- **Modernização Estrutural**: Conversão do código original do curso ("HTML5 e CSS3" do Curso em Vídeo) para HTML5 estritamente semântico e CSS3 responsivo em todas as 18 páginas.
- **JavaScript Vanilla Moderno**: Eliminação de dependências externas; todos os scripts foram reescritos em ES6+ modular com compatibilidade total com o protocolo `file://`.
- **Documentação Abrangente**: `README.md` reformulado com guia Quick Start em 3 passos, tabela detalhada de páginas, instruções de teste e documentação técnica.

### Fixed
- Correção de referências quebradas e caminhos de assets locais.
- Eliminação de atributos de estilo e manipuladores de eventos inline.
- Correção de inconsistências de codificação de caracteres garantindo conformidade com UTF-8 sem BOM em todos os arquivos.

---

## [1.0.0] - 2023-04-10 - Versão Inicial
### Added
- Exercício original do curso "HTML5 e CSS3 do Curso em Vídeo" (Gustavo Guanabara), apresentando um portal estático básico de notícias sobre o Google Glass.

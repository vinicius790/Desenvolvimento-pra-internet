# Arquitetura do Sistema — Tudo sobre Google Glass & XR Web Portal

Este documento detalha a arquitetura de software, fluxo de dados, ciclo de vida do Service Worker PWA, pipeline computacional do Simulador de Performance AR/VR, máquina de estados do Quiz Técnico com Certificado em Canvas e a infraestrutura de acessibilidade WCAG AAA do portal **Tudo sobre Google Glass** (plataforma bilíngue PT/EN).

---

## 1. Topologia Geral e Arquitetura em Camadas

O projeto adota uma arquitetura estática pura de alto desempenho (**Zero-Dependency Vanilla Web**), compatível com execução local (`file://`) e servidores estáticos (GitHub Pages), com suporte completo a **Progressive Web App (PWA)**, Service Worker resiliente e espelhamento estrito entre português e inglês (9 páginas em PT na raiz e 9 em `en/`).

```mermaid
flowchart TD
    subgraph Client["Camada de Cliente / Navegador"]
        DOM["DOM Semântico & Landmarks HTML5"]
        Storage["Web Storage (localStorage & sessionStorage)"]
        CacheAPI["Cache Storage API (PWA Offline)"]
        WebAudio["Web Audio API (Síntese Sonora)"]
        WebSpeech["Web Speech API (Recognition & Synthesis)"]
        CanvasAPI["HTML5 Canvas 2D (Certificados 1200x840)"]
    end

    subgraph CorePWA["Camada PWA & Service Worker (sw.js)"]
        SW["Service Worker Controller (google-glass-v2)"]
        OfflineCache["Estratégia Cache-First & Stale-While-Revalidate"]
        Manifest["manifest.json (Standalone Display)"]
    end

    subgraph UIModules["Módulos de Interface & Engenharia XR (_javascript/)"]
        ThemeEngine["tema.js: Dark Mode, Alto Contraste & Fonte Dinâmica"]
        Simulador3D["simulador.js: Modelo 3D, Prisma HUD & Voz"]
        PerfEngine["simulador-perf.js: FPS, Latência M2P, FOV & Bateria"]
        QuizEngine["quiz.js: Quiz Técnico & Emissor de Certificados Canvas"]
        TimelineEngine["linha-do-tempo.js: Auto-Tour, Filtros & Audio Feedback"]
        AudioGuide["audio-guia.js: Sintetizador Vocal Acessível"]
        SpecsComparator["comparar.js: Comparador Matricial de Modelos"]
        SearchEngine["busca.js: Motor de Busca Client-Side"]
        FormEngine["pedido.js: Validador & Calculador de Pedidos"]
    end

    subgraph DataPipeline["Pipeline de Dados & Derivação (_dados/ & scripts/)"]
        ModelosJSON["_dados/modelos.json"]
        TimelineJSON["_dados/linha-do-tempo.json"]
        IndexGenerator["scripts/gerar-indice.js"]
        BuscaJSON["_dados/indice-busca.json"]
        ScriptsDerivados["_dados/*.js (Compatibilidade file://)"]
    end

    DOM <--> UIModules
    UIModules <--> Storage
    UIModules --> WebAudio
    UIModules --> WebSpeech
    UIModules --> CanvasAPI
    Client <--> SW
    SW <--> CacheAPI
    SW <--> Manifest
    ModelosJSON --> IndexGenerator
    TimelineJSON --> IndexGenerator
    IndexGenerator --> BuscaJSON
    IndexGenerator --> ScriptsDerivados
    ScriptsDerivados --> DOM
```

---

## 2. Pipeline de Simulação de Performance AR/VR

O módulo `_javascript/simulador-perf.js` modela fisicamente o comportamento de headsets e óculos inteligentes de Realidade Estendida em tempo real:

```mermaid
flowchart LR
    subgraph Inputs["Entradas do Usuário"]
        Preset["Seletor de Preset XR"]
        FPS["Slider de Taxa (FPS: 30-120)"]
        FOV["Slider de Campo de Visão (FOV: 8°-130°)"]
        Bat["Slider de Bateria (400-6000 mAh)"]
        Pot["Slider de Potência SoC (1.0-16.0 W)"]
        ATW["Toggle Reprojeção Assíncrona"]
    end

    subgraph ComputationalEngine["Motor de Cálculo Físico & Gráfico"]
        FB["Frame Budget: 1000 / FPS ms"]
        M2P["Latência M2P: Sensor + CPU + GPU + Scanout (com/sem ATW)"]
        PPD["Resolução Angular: ResolucaoH / FOVH"]
        Auto["Autonomia: (mAh * 3.85 / 1000) / Watts * 60 min"]
        Term["Classificação Térmica: Baixo (<2.5W) / Mod / Alto (>8W)"]
    end

    subgraph VisualOutputs["Renderização Visual & Acessível"]
        HUDCards["Cartões de Métricas (Destaque WCAG AAA)"]
        SVGCone["Diagrama SVG do Cone de Visão (FOV)"]
        PipeBar["Barra Gráfica de Distribuição de Latência"]
        LiveRegion["Aria-Live Polite (Leitores de Tela)"]
        AudioSynth["Web Audio API Bips Interativos"]
    end

    Inputs --> ComputationalEngine
    FB --> HUDCards
    M2P --> HUDCards
    M2P --> PipeBar
    PPD --> HUDCards
    Auto --> HUDCards
    Term --> HUDCards
    FOV --> SVGCone
    ComputationalEngine --> LiveRegion
    ComputationalEngine --> AudioSynth
```

---

## 3. Fluxo de Avaliação do Quiz Técnico e Geração do Certificado

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuário / Estudante
    participant Form as Formulário do Quiz (quiz.js)
    participant Engine as Motor Avaliativo (calcularResultadoQuiz)
    participant Canvas as HTML5 Canvas 2D (1200x840)
    participant Aria as Região Acessível (aria-live)

    User->>Form: Seleciona respostas para as 5 questões técnicas XR
    User->>Form: Clica em "Enviar Respostas do Quiz"
    Form->>Engine: Processa respostas contra gabarito oficial
    Engine-->>Form: Devolve acertos, porcentagem e status de aprovação
    Form->>Aria: Anuncia resultado por voz para leitor de tela
    
    alt Aproveitamento >= 70% (Aprovado)
        Form->>User: Exibe painel de emissão e campo de nome
        User->>Form: Informa nome completo e clica "Gerar Certificado"
        Form->>Engine: gerarHashCertificado(nome) -> XR-XXXX-XXXX
        Form->>Canvas: desenharCertificado(ctx, dados)
        Note over Canvas: Renderiza moldura dupla dourada, selo holográfico, nome, data e hash
        Canvas-->>User: Exibe certificado em alta resolução na tela
        User->>Canvas: Baixar PNG (toDataURL) ou Imprimir / Salvar PDF
    else Aproveitamento < 70% (Necessita Revisão)
        Form->>User: Exibe feedback pedagógico por questão e botão "Tentar Novamente"
    end
```

---

## 4. Ciclo de Vida do Service Worker e Estratégia de Cache PWA

```mermaid
sequenceDiagram
    autonumber
    actor User as Navegador / Usuário
    participant SW as Service Worker (sw.js v2)
    participant Cache as Cache Storage (estatico-google-glass-v2)
    participant Net as Rede Externa (Network)

    User->>SW: Requisição GET de página ou recurso estático
    SW->>Cache: caches.match(request)
    alt Encontrado em Cache
        Cache-->>User: Resposta Imediata (Velocidade Offline Instantânea)
        opt Atualização em Segundo Plano (Stale-While-Revalidate)
            SW->>Net: fetch(request)
            Net-->>SW: Versão Atualizada
            SW->>Cache: cache.put(request, response)
        end
    else Não Encontrado em Cache
        SW->>Net: fetch(request)
        Net-->>SW: Retorna Recurso
        SW->>Cache: cache.put(request, clone)
        SW-->>User: Entrega Recurso
    end
```

---

## 5. Matriz de Acessibilidade WCAG 2.1 / 2.2 AAA

| Critério WCAG | Requisito AAA | Implementação no Projeto |
| :--- | :--- | :--- |
| **1.4.6 Contraste Aprimorado** | Mínimo 7:1 para texto normal, 4.5:1 para texto grande | Paleta de alto contraste verificada com razão ≥ 7:1 em todas as combinações de texto e fundo. |
| **1.4.8 Apresentação Visual** | Controle de tamanho de texto e espaçamento | Botão `#alternar-fonte` (A+ / A-) com escala rem fluida sem quebrar layout. |
| **2.1.1 & 2.1.2 Teclado** | Operabilidade 100% via teclado sem armadilhas | Linha do tempo com suporte a `ArrowLeft`, `ArrowRight`, `Home`, `End`, `Tab`; sliders acessíveis. |
| **2.2.2 Pausar, Parar, Ocultar** | Animações e tours pausáveis | Botão Auto-Tour na linha do tempo com controle explícito de Pausa e Retomada. |
| **4.1.2 Nome, Função, Valor** | ARIA semântico e sincronizado | `role="tab"`, `role="tablist"`, `role="tabpanel"`, `role="progressbar"`, `aria-live="polite"`. |
| **1.4.12 Espaçamento de Texto** | Suporte a zoom e redimensionamento | Layout flexível em `rem`, grid CSS e SVG vetorial escalável em todas as resoluções. |

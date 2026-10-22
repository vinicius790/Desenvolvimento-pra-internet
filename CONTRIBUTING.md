# Guia de Contribuição — Desenvolvimento pra internet 🌐

Agradecemos seu interesse em contribuir com o portal do **Google Glass**! Este projeto é construído com HTML5 semântico, CSS moderno e JavaScript puro sem dependências externas.

---

## 🛠️ Boas Práticas e Regras de Qualidade

1. **Sem Build & Sem Dependências em Produção**:
   - As páginas devem continuar funcionando tanto abrindo direto com duplo clique (`file://`) quanto servidas via HTTP.
   - Não utilize `fetch()` para dados que quebram no protocolo `file://`; use os scripts gerados a partir dos JSONs (`_dados/*.js`).
2. **Acessibilidade e Suporte Bilingue**:
   - Todas as 9 páginas devem manter sua contraparte exata em inglês na pasta `en/`.
   - Mantenha suporte a contraste AA no modo escuro e AAA no modo alto contraste.
   - Toda imagem precisa de `alt` descritivo.
3. **Atualização de Dados & Scripts**:
   - Se alterar os arquivos de dados em `_dados/` ou textos de páginas, execute `node scripts/gerar-indice.js` para atualizar o índice de busca e os scripts espelhados.
4. **Verificação de Integridade**:
   - A suíte de testes `node --test` (71 testes) deve passar com 100% de sucesso.

---

## 📋 Padrão de Commits (Conventional Commits)

Utilizamos a convenção do [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/):

```text
<tipo>(<escopo>): <descrição no imperativo>
```

### Exemplos:
- `feat(timeline): adiciona marco historico de 2024 na linha do tempo`
- `fix(contact): valida mascara de telefone no formulario`
- `docs(readme): adiciona guia de quick start em 3 passos`
- `style(theme): aprimora paleta de alto contraste para conformidade AAA`
- `test(site): adiciona teste para novos links hreflang`

---

## 🚀 Como Enviar um Pull Request

1. **Fork e Branch**:
   ```bash
   git checkout -b feat/melhoria-acessibilidade
   ```
2. **Atualização e Testes**:
   ```bash
   node scripts/gerar-indice.js --verificar
   node --test
   ```
   Garanta que todos os testes passem sem erro.
3. **Commit Semântico**:
   ```bash
   git commit -m "feat(acessibilidade): aprimora navegacao por foco no menu"
   ```
4. **Abrir Pull Request**:
   - Explique o que foi alterado nas versões em português e em inglês.
   - Anexe prints caso envolva mudanças visuais.

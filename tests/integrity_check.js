// Script de verificação de links internos e conformidade de tags HTML
// Abrange as versões em Português (raiz) e Inglês (en/) do Google Glass.
// Executar com: node --test tests/integrity_check.js ou node tests/integrity_check.js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Páginas do projeto
const PT_PAGES = fs.readdirSync(ROOT_DIR)
  .filter(f => f.endsWith('.html'))
  .sort();

const EN_PAGES = fs.existsSync(path.join(ROOT_DIR, 'en'))
  ? fs.readdirSync(path.join(ROOT_DIR, 'en'))
      .filter(f => f.endsWith('.html'))
      .map(f => `en/${f}`)
      .sort()
  : [];

const ALL_PAGES = [...PT_PAGES, ...EN_PAGES];
const QUADROS = ['google-glass.html', 'en/google-glass.html'];

// Mapeia todos os arquivos existentes no repositório em um Set para verificação instantânea em memória
function indexRepositoryFiles(dir, prefix = '') {
  const fileSet = new Set();
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (['.git', 'node_modules'].includes(entry.name)) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const subFiles = indexRepositoryFiles(full, rel);
      for (const f of subFiles) fileSet.add(f);
    } else {
      fileSet.add(rel.replace(/\\/g, '/'));
    }
  }

  return fileSet;
}

const REPO_FILES = indexRepositoryFiles(ROOT_DIR);

/** Extrai as tags com atributos de um HTML */
function extractTags(html) {
  const clean = html.replace(/<!--[\s\S]*?-->/g, '');
  const tags = [];
  const tagRegex = /<([a-zA-Z][\w-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>]+))?)*)\s*\/?>/g;
  const attrRegex = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>]+)))?/g;

  for (const match of clean.matchAll(tagRegex)) {
    const tagName = match[1].toLowerCase();
    const rawAttrs = match[2];
    const attrs = {};

    for (const attrMatch of rawAttrs.matchAll(attrRegex)) {
      const key = attrMatch[1].toLowerCase();
      const val = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
      attrs[key] = val;
    }

    tags.push({ name: tagName, attrs });
  }

  return tags;
}

const pagesData = Object.fromEntries(
  ALL_PAGES.map(pageFile => {
    const html = fs.readFileSync(path.join(ROOT_DIR, pageFile), 'utf8');
    const tags = extractTags(html);
    const ids = tags.filter(t => t.attrs.id).map(t => t.attrs.id);
    return [pageFile, { html, tags, ids }];
  })
);

function resolveRelativePath(basePage, url) {
  const dir = path.posix.dirname(basePage);
  return path.posix.normalize(path.posix.join(dir, url));
}

function isExternalUrl(url) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|mailto:|tel:)/i.test(url);
}

// -----------------------------------------------------------------------------
// SUÍTE DE TESTES: INTEGRIDADE DE LINKS INTERNOS
// -----------------------------------------------------------------------------

test('Cobertura de páginas: 9 em Português e 9 em Inglês', () => {
  assert.equal(PT_PAGES.length, 9, `Esperado 9 páginas PT, encontradas ${PT_PAGES.length}`);
  assert.equal(EN_PAGES.length, 9, `Esperado 9 páginas EN, encontradas ${EN_PAGES.length}`);
});

test('Validação de links internos, imagens, mídias e âncoras locais', () => {
  const errors = [];
  let checkedCount = 0;

  for (const [pageFile, data] of Object.entries(pagesData)) {
    for (const tag of data.tags) {
      for (const attr of ['href', 'src', 'poster', 'data-icone', 'data-dados', 'action']) {
        const rawUrl = tag.attrs[attr];
        if (!rawUrl || isExternalUrl(rawUrl)) continue;

        checkedCount++;
        const [cleanUrl, fragment] = rawUrl.split('#');
        const targetFile = cleanUrl === '' ? pageFile : resolveRelativePath(pageFile, decodeURI(cleanUrl));

        if (!REPO_FILES.has(targetFile)) {
          errors.push(`[${pageFile}] ${tag.name}[${attr}="${rawUrl}"]: arquivo alvo "${targetFile}" não existe`);
        } else if (fragment && pagesData[targetFile] && !pagesData[targetFile].ids.includes(fragment)) {
          errors.push(`[${pageFile}] âncora #${fragment} não encontrada em "${targetFile}"`);
        }
      }
    }
  }

  assert.deepEqual(errors, []);
  assert.ok(checkedCount >= 400, `Esperado mais de 400 links/referências verificados, total: ${checkedCount}`);
});

test('Pares de idiomas e links bidirecionais (pt-BR <-> en)', () => {
  for (const pageFile of ALL_PAGES) {
    const isEn = pageFile.startsWith('en/');
    const expectedOtherLang = isEn ? 'pt-BR' : 'en';

    const alternateLink = pagesData[pageFile].tags.find(
      t => t.name === 'link' && t.attrs.rel === 'alternate' && t.attrs.hreflang === expectedOtherLang
    );

    assert.ok(alternateLink, `[${pageFile}] deve possuir <link rel="alternate" hreflang="${expectedOtherLang}">`);

    const counterpartPath = resolveRelativePath(pageFile, alternateLink.attrs.href);
    assert.ok(REPO_FILES.has(counterpartPath), `[${pageFile}] counterpart "${counterpartPath}" não existe`);

    // A página oposta deve apontar de volta
    const backLink = pagesData[counterpartPath]?.tags.find(
      t => t.name === 'link' && t.attrs.rel === 'alternate' && t.attrs.hreflang === (isEn ? 'en' : 'pt-BR')
    );
    assert.ok(backLink, `[${counterpartPath}] deve apontar de volta para ${pageFile}`);
  }
});

// -----------------------------------------------------------------------------
// SUÍTE DE TESTES: CONFORMIDADE DE TAGS E ACESSIBILIDADE
// -----------------------------------------------------------------------------

test('Conformidade de cabeçalho HTML e metadados obrigatórios', () => {
  for (const pageFile of ALL_PAGES) {
    const isEn = pageFile.startsWith('en/');
    const data = pagesData[pageFile];

    assert.match(data.html, /<!DOCTYPE\s+html>/i, `[${pageFile}] deve conter doctype HTML5`);

    const htmlTag = data.tags.find(t => t.name === 'html');
    assert.ok(htmlTag, `[${pageFile}] deve conter tag <html>`);
    assert.equal(htmlTag.attrs.lang, isEn ? 'en' : 'pt-BR', `[${pageFile}] lang incorreto`);

    const charsetTag = data.tags.find(t => t.name === 'meta' && t.attrs.charset);
    assert.ok(charsetTag, `[${pageFile}] falta <meta charset="utf-8">`);
    assert.equal(charsetTag.attrs.charset.toLowerCase(), 'utf-8');

    const viewportTag = data.tags.find(t => t.name === 'meta' && t.attrs.name === 'viewport');
    assert.ok(viewportTag, `[${pageFile}] falta <meta name="viewport">`);

    const descTag = data.tags.find(t => t.name === 'meta' && t.attrs.name === 'description');
    assert.ok(descTag && descTag.attrs.content.length > 30, `[${pageFile}] meta description ausente ou muito curta`);

    const titleMatch = data.html.match(/<title>([^<]+)<\/title>/i);
    assert.ok(titleMatch && titleMatch[1].trim().length > 10, `[${pageFile}] title ausente ou muito curto`);
  }
});

test('Unicidade de IDs e conformidade de referências internas (labels e aria)', () => {
  const errors = [];

  for (const [pageFile, data] of Object.entries(pagesData)) {
    const duplicates = data.ids.filter((id, idx) => data.ids.indexOf(id) !== idx);
    if (duplicates.length > 0) {
      errors.push(`[${pageFile}] IDs duplicados: ${duplicates.join(', ')}`);
    }

    for (const tag of data.tags) {
      // Associação de <label for="..."> com inputs
      if (tag.name === 'label' && tag.attrs.for) {
        if (!data.ids.includes(tag.attrs.for)) {
          errors.push(`[${pageFile}] <label for="${tag.attrs.for}"> aponta para ID inexistente`);
        }
      }

      // Atributos ARIA que referenciam IDs
      for (const ariaAttr of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
        const refId = tag.attrs[ariaAttr];
        if (refId && !data.ids.includes(refId)) {
          errors.push(`[${pageFile}] ${ariaAttr}="${refId}" aponta para ID inexistente`);
        }
      }
    }
  }

  assert.deepEqual(errors, []);
});

test('Conformidade de acessibilidade e segurança em tags HTML', () => {
  const errors = [];

  for (const [pageFile, data] of Object.entries(pagesData)) {
    for (const tag of data.tags) {
      // 1. Imagens: alt, width e height
      if (tag.name === 'img') {
        if (typeof tag.attrs.alt !== 'string') {
          errors.push(`[${pageFile}] <img src="${tag.attrs.src}"> sem atributo alt`);
        }
        if (!tag.attrs.width || !tag.attrs.height) {
          errors.push(`[${pageFile}] <img src="${tag.attrs.src}"> sem width/height especificados`);
        }
      }

      // 2. Links com target="_blank" devem ter rel="noopener"
      if (tag.name === 'a' && tag.attrs.target === '_blank') {
        if (!tag.attrs.rel || !tag.attrs.rel.includes('noopener')) {
          errors.push(`[${pageFile}] link externo para ${tag.attrs.href} sem rel="noopener"`);
        }
      }

      // 3. Botões com atributo type
      if (tag.name === 'button') {
        if (!tag.attrs.type) {
          errors.push(`[${pageFile}] <button> sem atributo type`);
        }
      }

      // 4. Iframes com title descritivo
      if (tag.name === 'iframe') {
        if (!tag.attrs.title) {
          errors.push(`[${pageFile}] <iframe> sem atributo title`);
        }
      }
    }

    // Páginas completas (não quadros) devem conter exatamente um <h1> e um <main>
    if (!QUADROS.includes(pageFile)) {
      const h1Count = data.tags.filter(t => t.name === 'h1').length;
      if (h1Count !== 1) {
        errors.push(`[${pageFile}] deve ter exatamente um <h1> (encontrados ${h1Count})`);
      }

      const mainCount = data.tags.filter(t => t.name === 'main').length;
      if (mainCount !== 1) {
        errors.push(`[${pageFile}] deve ter exatamente um <main> (encontrados ${mainCount})`);
      }
    }
  }

  assert.deepEqual(errors, []);
});

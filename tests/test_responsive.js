'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');

test('Validação de Metatag Viewport em HTML', () => {
    const htmlFiles = [
        ...fs.readdirSync(RAIZ).filter(f => f.endsWith('.html')).map(f => path.join(RAIZ, f)),
        ...(fs.existsSync(path.join(RAIZ, 'en')) ? fs.readdirSync(path.join(RAIZ, 'en')).filter(f => f.endsWith('.html')).map(f => path.join('en', f)) : [])
    ];
    for (const file of htmlFiles) {
        const fullPath = path.isAbsolute(file) ? file : path.join(RAIZ, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.ok(content.includes('viewport'), `Arquivo ${file} deve conter a metatag viewport`);
    }
});

test('Validação de Media Queries e Responsividade CSS', () => {
    const cssDir = path.join(RAIZ, '_css');
    const cssFiles = fs.existsSync(cssDir) ? fs.readdirSync(cssDir).filter(f => f.endsWith('.css')) : [];
    let hasMedia = false;
    for (const file of cssFiles) {
        const content = fs.readFileSync(path.join(cssDir, file), 'utf8');
        if (content.includes('@media')) hasMedia = true;
    }
    assert.ok(hasMedia, 'CSS deve conter media queries para viewports (375px, 768px, 1200px+)');
});

// A3-03/A3-18: uma única versão de publicação (js/versao.js) nos "?v=" do index.html e no precache do sw.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const ler = f => fs.readFileSync(path.join(raiz, f), 'utf8');

const pub = /ESTIMATIVA_PUBLICACAO = '([^']+)'/.exec(ler('js/versao.js'))[1];

test('todo arquivo local do index.html (css/js/vendor) leva ?v=<publicação de js/versao.js>', () => {
    const html = ler('index.html');
    const refs = [...html.matchAll(/(?:src|href)="((?:css|js|vendor)\/[^"]+)"/g)].map(m => m[1]);
    assert.ok(refs.length >= 7, refs.join(','));
    for (const ref of refs) assert.ok(ref.endsWith('?v=' + pub), `${ref} sem ?v=${pub}`);
});
test('sw.js monta o precache com a mesma publicação e casa URL exata', () => {
    const sw = ler('sw.js');
    assert.match(sw, /importScripts\('js\/versao\.js'\)/);
    assert.match(sw, /const V = `\?v=\$\{self\.ESTIMATIVA_PUBLICACAO\}`/);
    assert.doesNotMatch(sw, /ignoreSearch/);
    const html = ler('index.html');
    const refs = [...html.matchAll(/(?:src|href)="((?:css|js|vendor)\/[^"?]+)\?v=/g)].map(m => m[1]);
    for (const ref of refs) assert.ok(sw.includes(`'${ref}'`), `${ref} fora do precache`);
});
test('registro do service worker com updateViaCache none', () => {
    assert.match(ler('js/app.js'), /register\('sw\.js', \{ updateViaCache: 'none' \}\)/);
});

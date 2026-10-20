// M4.4: as bibliotecas em vendor/ precisam ser exatamente as baixadas da fonte oficial (SHA-384 de vendor/README.md).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ESPERADO = {
    'chart.js-3.9.1/chart.min.js': 'sha384-9MhbyIRcBVQiiC7FSd7T38oJNj2Zh+EfxS7/vjhBi4OOT78NlHSnzM31EZRWR1LZ',
    'chartjs-plugin-annotation-1.4.0/chartjs-plugin-annotation.min.js': 'sha384-WVRZ5bDoBpBp9eKFxji3f7JiiY/SCi2kWJpzG+AgHnafhqQOzp4mmqsPBZgiCxlu',
    'jspdf-2.5.1/jspdf.umd.min.js': 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk'
};
const raiz = path.join(__dirname, '..');

for (const [arq, hash] of Object.entries(ESPERADO)) {
    test(`vendor ${arq}: SHA-384 confere`, () => {
        const dados = fs.readFileSync(path.join(raiz, 'vendor', arq));
        assert.equal('sha384-' + crypto.createHash('sha384').update(dados).digest('base64'), hash);
    });
}
test('index.html usa só as bibliotecas locais e o sw.js as guarda no cache', () => {
    const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
    assert.doesNotMatch(html, /<script[^>]+src="https?:/);
    assert.doesNotMatch(html, /<link[^>]+href="https?:/);
    for (const arq of Object.keys(ESPERADO)) {
        assert.ok(html.includes(`src="vendor/${arq}"`), arq);
        assert.ok(sw.includes(`./vendor/${arq}`), arq);
    }
});

// Testes ouro do núcleo de cálculo. Sem dependências: node --test tests/
// 1) js/calc.js == núcleo original (cópia congelada de index.html 6e0bdc9) em todos os cenários (tol 1e-9)
// 2) js/calc.js == fixtures_ouro.json (contrato para M2)
// 3) Caso real C45 CP V-ARI: 32,04 MPa aos 14 d (só 7 d) e 34,18 MPa aos 28 d (7 d + 14 d)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { carregarOriginal, carregarNovo, trechoIndexAtual, trechoReferencia } = require('./nucleo');
const { CENARIOS, executar } = require('./cenarios');

const TOL = 1e-9;
const orig = carregarOriginal();
const novo = carregarNovo();
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures_ouro.json'), 'utf8'));

function comparar(a, b, caminho = '') {
    if (typeof a === 'number' && typeof b === 'number') {
        if (Number.isNaN(a) && Number.isNaN(b)) return;
        const lim = TOL * Math.max(1, Math.abs(a), Math.abs(b));
        assert.ok(Math.abs(a - b) <= lim, `${caminho}: ${a} != ${b}`);
        return;
    }
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
        assert.equal(a, b, `${caminho}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
        return;
    }
    assert.equal(Array.isArray(a), Array.isArray(b), `${caminho}: tipo diferente`);
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
    assert.deepEqual(ka, kb, `${caminho}: chaves diferentes`);
    for (const k of ka) comparar(a[k], b[k], `${caminho}.${k}`);
}

test('referência congelada é idêntica ao núcleo ainda embutido no index.html', (t) => {
    const atual = trechoIndexAtual();
    if (atual === null) { t.skip('index.html já não embute o núcleo (M3 em diante)'); return; }
    const norm = s => s.replace(/\s+/g, ' ').trim();
    assert.equal(norm(atual), norm(trechoReferencia()));
});

test('calc.js exporta Beta, DataValidator e Calculator', () => {
    for (const k of ['Beta', 'DataValidator', 'Calculator']) assert.ok(novo[k], k);
    assert.equal(typeof novo.Calculator.performAnalysis, 'function');
});

test('fixtures cobrem todos os cenários', () => {
    assert.deepEqual(fixtures.cenarios.map(c => c.id), CENARIOS.map(c => c.id));
});

for (const c of CENARIOS) {
    test(`ouro ${c.id}: calc.js == original`, () => {
        comparar(executar(novo, c), executar(orig, c), c.id);
    });
    test(`ouro ${c.id}: calc.js == fixtures_ouro.json`, () => {
        const fx = fixtures.cenarios.find(f => f.id === c.id);
        comparar(executar(novo, c), fx.saida, c.id);
    });
}

test('caso real C45 CP V-ARI (parecer técnico a1/a2)', () => {
    const a1 = executar(novo, CENARIOS.find(c => c.id === 'a1_c45_cpv_1ponto_7d'));
    const a2 = executar(novo, CENARIOS.find(c => c.id === 'a2_c45_cpv_7d_14d'));
    assert.equal(a1.previsao[14].toFixed(2), '32.04');
    assert.equal(a2.previsao[28].toFixed(2), '34.18');
    assert.equal(a1.analise.fcm_base.toFixed(2), '51.60');
    assert.equal(a2.analise.s.toFixed(4), '0.1816');
});

test('cobertura de ramos: ruleApplied, curvas de tendência e exclusão automática', () => {
    const r = id => executar(novo, CENARIOS.find(c => c.id === id));
    assert.equal(r('c3_regra_referencia').analise.ruleApplied, true);
    assert.equal(r('c1_acima_com_28d').analise.showFreeTrendCurve, true);
    assert.equal(r('g2_s_personalizado_060').analise.showPlausibleTrendCurve, true);
    assert.deepEqual(r('e3_outlier_com_autodrop').excluidos, [7]);
});

test('calc.js funciona como script de navegador (window.EstimativaCalc)', () => {
    const vm = require('vm');
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'calc.js'), 'utf8');
    const janela = {};
    janela.self = janela;
    vm.runInNewContext(src, janela);
    assert.ok(janela.EstimativaCalc && janela.EstimativaCalc.Calculator);
    const c = CENARIOS.find(x => x.id === 'a2_c45_cpv_7d_14d');
    comparar(executar(janela.EstimativaCalc, c), executar(orig, c), 'navegador');
});

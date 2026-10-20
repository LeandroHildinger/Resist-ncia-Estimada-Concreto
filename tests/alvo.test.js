// Pergunta inversa (2026-10-20): diaParaResistencia(analise, alvo, maiorIdade) e analyze({ resistenciaAlvo }).
const test = require('node:test');
const assert = require('node:assert/strict');
const { carregarNovo } = require('./nucleo');
const { CENARIOS } = require('./cenarios');

const { analyze, diaParaResistencia, preverEm } = carregarNovo();
const perto = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b)), `${msg}: ${a} != ${b}`);

// Caso C45 do botão "Carregar exemplo" (CP V-ARI, sd 4,0, 3/7/14 d).
const C45 = { fck: 45, sd: 4, cementType: '0.20', analysisMode: 'adjusted', autoDrop: false,
    rows: [{ days: 3, mpa: 30 }, { days: 7, mpa: 38 }, { days: 14, mpa: 44 }] };
const entrada = c => ({ fck: c.fck, sd: c.sd, cementType: c.cement === 'custom' ? 'custom' : String(c.cement), customS: c.customS,
    analysisMode: c.mode, autoDrop: c.autoDrop, rows: c.data });

// Referência independente: bisseção sobre preverEm (a mesma curva que a tela mostra).
function bissecao(analise, alvo) {
    let a = 1e-6, b = 1e7;
    for (let i = 0; i < 300; i++) { const m = (a + b) / 2; if (preverEm(analise, m).estimada < alvo) a = m; else b = m; }
    return (a + b) / 2;
}

test('C45 exemplo: alvo 40 MPa -> dia 8,853 (9º dia), já atingido pela projeção aos 14 d', () => {
    const r = analyze({ ...C45, resistenciaAlvo: 40 });
    const x = r.alvo;
    assert.equal(x.valido, true);
    perto(x.dia, 8.85325182777335, 'dia', 1e-12);
    assert.equal(x.diaInteiro, 9);
    assert.ok(preverEm(r.analise, 8).estimada < 40 && preverEm(r.analise, 9).estimada >= 40, 'dia 9 é o 1º dia inteiro com f_proj >= 40');
    perto(preverEm(r.analise, x.dia).estimada, 40, 'ida e volta', 1e-12);
    assert.equal(x.extrapolacao, false);
    assert.equal(x.naoAtinge, false);
    assert.equal(x.maiorIdade, 14);
    perto(x.projecaoMaiorIdade, preverEm(r.analise, 14).estimada, 'projeção aos 14 d');
    assert.equal(x.jaAtingido, true);
});

test('C45 exemplo: alvo = fck 45 -> dia 17,38 (18º dia), ainda não atingido; alvo = estimada28 -> dia 28', () => {
    const r = analyze({ ...C45, resistenciaAlvo: '45' });
    perto(r.alvo.dia, 17.380355840623157, 'dia', 1e-12);
    assert.equal(r.alvo.diaInteiro, 18);
    assert.equal(r.alvo.jaAtingido, false);
    assert.equal(r.alvo.extrapolacao, false);
    const r28 = analyze({ ...C45, resistenciaAlvo: r.estimada28 });
    perto(r28.alvo.dia, 28, 'dia da estimada28', 1e-10);
    assert.equal(r28.alvo.diaInteiro, 28);
});

test('alvo acima da projeção aos 28 d -> extrapolação (D3)', () => {
    const x = analyze({ ...C45, resistenciaAlvo: 50 }).alvo;
    assert.equal(x.extrapolacao, true);
    assert.equal(x.naoAtinge, false);
    assert.ok(x.dia > 28 && x.diaInteiro === Math.ceil(x.dia));
});

test('alvo na assíntota ou acima -> naoAtinge, sem dia', () => {
    const r = analyze(C45);
    const a = r.analise;
    const assintota = a.fcm * Math.exp(a.s) - a.offset;
    for (const alvo of [assintota, assintota + 0.01, 200]) {
        const x = diaParaResistencia(a, alvo, 14);
        assert.equal(x.valido, true);
        assert.equal(x.naoAtinge, true, `alvo ${alvo}`);
        assert.equal(x.dia, null);
        assert.equal(x.diaInteiro, null);
        assert.equal(x.extrapolacao, false);
        assert.equal(x.jaAtingido, false);
        perto(x.assintota, assintota, 'assíntota');
    }
    // logo abaixo da assíntota: atinge, muito tarde
    const quase = diaParaResistencia(a, assintota - 0.001, 14);
    assert.equal(quase.naoAtinge, false);
    assert.ok(quase.dia > 1e5 && quase.extrapolacao);
});

test('alvo igual à projeção na maior idade ensaiada -> jaAtingido (limite inclusivo)', () => {
    const r = analyze(C45);
    const p14 = preverEm(r.analise, 14).estimada;
    assert.equal(diaParaResistencia(r.analise, p14, 14).jaAtingido, true);
    assert.equal(diaParaResistencia(r.analise, p14 + 1e-6, 14).jaAtingido, false);
    assert.equal(diaParaResistencia(r.analise, p14).jaAtingido, false, 'sem maiorIdade não afirma');
});

test('ruído de ponto flutuante: alvo igual ao único CP de 3 d -> dia 3, já atingido (não dia 4)', () => {
    const r = analyze({ fck: 45, sd: 4, cementType: '0.20', rows: [{ days: 3, mpa: 26 }], resistenciaAlvo: 26 });
    assert.equal(r.alvo.diaInteiro, 3);
    assert.equal(r.alvo.jaAtingido, true);
    assert.equal(r.alvo.extrapolacao, false);
    const e = analyze(C45);
    const x = diaParaResistencia(e.analise, e.estimada28, 14);
    assert.equal(x.diaInteiro, 28);
    assert.equal(x.extrapolacao, false, 'alvo = estimada aos 28 d não é extrapolação');
});

test('alvo inválido: zero, negativo, texto -> valido false; vírgula aceita', () => {
    const a = analyze(C45).analise;
    for (const alvo of [0, -5, 'abc', '45abc', NaN]) {
        const x = diaParaResistencia(a, alvo, 14);
        assert.equal(x.valido, false, String(alvo));
        assert.ok(x.motivo);
    }
    assert.equal(diaParaResistencia(a, '', 14).motivo, 'resistência-alvo não informada');
    perto(diaParaResistencia(a, '40,5', 14).dia, diaParaResistencia(a, 40.5, 14).dia, 'vírgula');
    assert.equal(diaParaResistencia({ fcm: 0, s: 0.2, offset: 0 }, 30).valido, false);
    assert.equal(diaParaResistencia({ fcm: 50, s: 0, offset: 0 }, 30).valido, false);
});

test('analyze sem resistenciaAlvo (ou vazio) -> alvo null; com alvo inválido o resto continua ok', () => {
    assert.equal(analyze(C45).alvo, null);
    assert.equal(analyze({ ...C45, resistenciaAlvo: '' }).alvo, null);
    assert.equal(analyze({ ...C45, resistenciaAlvo: '  ' }).alvo, null);
    const r = analyze({ ...C45, resistenciaAlvo: 'x' });
    assert.equal(r.ok, true);
    assert.equal(r.alvo.valido, false);
});

test('NENHUM número existente muda com resistenciaAlvo (todos os cenários ouro + C45)', () => {
    const casos = [...CENARIOS.map(entrada), C45];
    for (const e of casos) {
        const { alvo: alvoSem, ...sem } = analyze(e);
        const { alvo, ...com } = analyze({ ...e, resistenciaAlvo: 40 });
        assert.equal(alvoSem, null);
        assert.equal(alvo.valido, true);
        assert.deepEqual(com, sem);
    }
});

test('forma fechada == bisseção na curva da tela, em todos os cenários ouro e vários alvos', () => {
    for (const c of CENARIOS) {
        const r = analyze(entrada(c));
        if (!r.ok) continue;
        const a = r.analise;
        const assintota = a.fcm * Math.exp(a.s) - a.offset;
        const p28 = preverEm(a, 28).estimada;
        for (const alvo of [0.3 * p28, 0.7 * p28, 0.95 * p28, p28, 1.02 * p28, (p28 + assintota) / 2]) {
            if (!(alvo > 0)) continue;
            const x = diaParaResistencia(a, alvo);
            assert.equal(x.naoAtinge, false, `${c.id} alvo ${alvo}`);
            perto(x.dia, bissecao(a, alvo), `${c.id} alvo ${alvo}`, 1e-8);
            assert.equal(x.extrapolacao, x.dia > 28 + 1e-9);
            assert.ok(preverEm(a, x.diaInteiro).estimada >= alvo - 1e-9 * alvo, `${c.id}: dia inteiro alcança`);
            if (x.diaInteiro > 1) assert.ok(preverEm(a, x.diaInteiro - 1).estimada < alvo, `${c.id}: dia anterior não alcança`);
        }
    }
});

test('dia cresce com o alvo e a função não muta a análise', () => {
    const r = analyze(C45);
    const copia = JSON.stringify(r.analise);
    let anterior = 0;
    for (let alvo = 5; alvo < 60; alvo += 2.5) {
        const x = diaParaResistencia(r.analise, alvo, 14);
        assert.ok(x.dia > anterior, `alvo ${alvo}`);
        anterior = x.dia;
    }
    assert.equal(JSON.stringify(r.analise), copia);
});

test('sem ensaios: responde pela curva de referência, sem maior idade e sem jaAtingido', () => {
    const r = analyze({ ...C45, rows: [], resistenciaAlvo: 40 });
    assert.equal(r.ok, true);
    assert.equal(r.alvo.valido, true);
    assert.equal(r.alvo.maiorIdade, null);
    assert.equal(r.alvo.jaAtingido, false);
    perto(preverEm(r.analise, r.alvo.dia).estimada, 40, 'ida e volta na referência', 1e-12);
});

test('com parâmetro inválido analyze não calcula o alvo', () => {
    const r = analyze({ ...C45, fck: 'abc', resistenciaAlvo: 40 });
    assert.equal(r.ok, false);
    assert.equal(r.alvo, undefined);
});

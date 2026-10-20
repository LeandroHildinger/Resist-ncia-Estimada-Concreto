// Testes do M2: correções de defeito (IDs dos pareceres) e decisões D2/D4, via analyze/parseCsv.
const test = require('node:test');
const assert = require('node:assert/strict');
const { carregarOriginal, carregarNovo } = require('./nucleo');
const { CENARIOS, IDADES, executar } = require('./cenarios');
const fixtures = require('./fixtures_ouro.json');

const orig = carregarOriginal();
const novo = carregarNovo();
const { analyze, parseCsv, Calculator, DataValidator, Beta, compararS } = novo;
const TOL = 1e-9;
const perto = (a, b, msg, tol = TOL) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b)), `${msg}: ${a} != ${b}`);

const entrada = (c, extra = {}) => ({
    fck: c.fck, sd: c.sd, cementType: c.cement === 'custom' ? 'custom' : String(c.cement), customS: c.customS,
    analysisMode: c.mode, autoDrop: c.autoDrop, rows: c.data, ...extra
});
const base = (rows, extra = {}) => ({ fck: 45, sd: 4, cementType: '0.20', analysisMode: 'adjusted', autoDrop: false, rows, ...extra });
const semNaoNumericos = r => JSON.parse(JSON.stringify(r.analise));

// ---------------------------------------------------------------------------
// Contrato: analyze reproduz os 21 cenários ouro (sem defeito) do app atual.
// g2 mudou por T-23 (ver ouro.test.js): comparado com o núcleo novo.
// delta28 do app atual (circular) foi substituído por validacao28 (D4): não comparado aqui.
// ---------------------------------------------------------------------------
for (const c of CENARIOS) {
    test(`analyze == ouro ${c.id}`, () => {
        const r = analyze(entrada(c));
        assert.equal(r.ok, true);
        const ref = c.id === 'g2_s_personalizado_060' ? executar(novo, c) : fixtures.cenarios.find(f => f.id === c.id).saida;
        perto(r.params.s_normative, ref.s_normative, 's_normative');
        for (const k of Object.keys(ref.analise)) {
            const a = r.analise[k], b = ref.analise[k];
            if (typeof b === 'number') perto(a, b, `analise.${k}`); else assert.equal(a, b, `analise.${k}`);
        }
        assert.deepEqual(r.avisosDados, ref.avisos);
        assert.deepEqual(r.excluidos, ref.excluidos);
        r.previsoes.forEach(p => {
            perto(p.estimada, ref.previsao[p.t], `estimada ${p.t}`);
            perto(p.media, ref.media[p.t], `media ${p.t}`);
            if (ref.previsaoPlausivel) perto(p.plausivel, ref.previsaoPlausivel[p.t], `plausivel ${p.t}`); else assert.equal(p.plausivel, null);
            if (ref.previsaoLivre) perto(p.livre, ref.previsaoLivre[p.t], `livre ${p.t}`); else assert.equal(p.livre, null);
        });
        assert.equal(r.atendeEstimada28, ref.diagnosticoSatisfatorio);
    });
}

// ---------------------------------------------------------------------------
// C-01, C-09: CSV
// ---------------------------------------------------------------------------
test('C-01: ";" com vírgula decimal (Excel pt-BR)', () => {
    const r = parseCsv('idade;resistencia\n7;25,5\n3,5;20,1\n');
    assert.deepEqual(r.rows, [{ days: 7, mpa: 25.5 }, { days: 3.5, mpa: 20.1 }]);
    assert.equal(r.cabecalho, true);
    assert.equal(r.lidas, 2);
    assert.deepEqual(r.ignoradas, []);
});
test('C-01: "," com ponto decimal continua valendo; "7,25,5" ambíguo é ignorado com motivo', () => {
    const r = parseCsv('dias,mpa\n7,25.5\n7,25,5\n14,30');
    assert.deepEqual(r.rows, [{ days: 7, mpa: 25.5 }, { days: 14, mpa: 30 }]);
    assert.equal(r.ignoradas.length, 1);
    assert.equal(r.ignoradas[0].linha, 3);
    assert.match(r.ignoradas[0].motivo, /2 campos/);
});
test('C-09: sem cabeçalho não perde a 1ª linha; tab, aspas, BOM, CRLF e linha em branco', () => {
    assert.deepEqual(parseCsv('7;25\n14;30').rows, [{ days: 7, mpa: 25 }, { days: 14, mpa: 30 }]);
    assert.equal(parseCsv('7;25\n14;30').cabecalho, false);
    assert.deepEqual(parseCsv('"7";"25,5"\r\n"14";"30"').rows, [{ days: 7, mpa: 25.5 }, { days: 14, mpa: 30 }]);
    assert.deepEqual(parseCsv('idade\tfc\n7\t25,5\n\n14\t30\n').rows, [{ days: 7, mpa: 25.5 }, { days: 14, mpa: 30 }]);
    assert.deepEqual(parseCsv('﻿idade;fc\n7;25').rows, [{ days: 7, mpa: 25 }]);
    assert.deepEqual(parseCsv('7;25;\n').rows, [{ days: 7, mpa: 25 }], 'campo vazio no fim (Excel) é tolerado');
});
test('C-09: linhas ignoradas são contadas e listadas', () => {
    const r = parseCsv('idade;fc\n7;25\nabc;30\n14\n28;40');
    assert.equal(r.lidas, 4);
    assert.equal(r.rows.length, 2);
    assert.deepEqual(r.ignoradas.map(i => i.linha), [3, 4]);
});

// ---------------------------------------------------------------------------
// C-07, C-08, T-07: CPs brutos, agregação pela mediana só no cálculo
// ---------------------------------------------------------------------------
test('C-07: CSV não agrega; duas importações acrescentadas dão a mediana dos 6 CPs (26), não mediana de mediana (30)', () => {
    const a = parseCsv('7;20\n7;21\n7;22').rows;
    const b = parseCsv('7;30\n7;30\n7;30').rows;
    assert.equal(a.length, 3);
    const r = analyze(base([...a, ...b]));
    assert.equal(r.pontos.length, 1);
    assert.equal(r.pontos[0].mpa, 26);
    assert.equal(r.pontos[0].n, 6);
    assert.ok(r.avisos.some(w => w.tipo === 'agregado' && /6 CPs aos 7 d/.test(w.texto)));
});
test('C-07: ponto manual + CSV de mesma idade agregados com aviso visível', () => {
    const r = analyze(base([{ days: 7, mpa: 15 }, ...parseCsv('7;25').rows]));
    assert.equal(r.pontos[0].mpa, 20);
    assert.ok(r.avisos.some(w => w.tipo === 'agregado' && /2 CPs aos 7 d/.test(w.texto)));
});
test('C-08/T-07: idades repetidas não dependem da ordem e não geram "7 dias menor que 7 dias"', () => {
    const r1 = analyze(base([{ days: 7, mpa: 20 }, { days: 7, mpa: 38 }, { days: 14, mpa: 33 }]));
    const r2 = analyze(base([{ days: 14, mpa: 33 }, { days: 7, mpa: 38 }, { days: 7, mpa: 20 }]));
    assert.deepEqual(semNaoNumericos(r1), semNaoNumericos(r2));
    assert.deepEqual(r1.avisosDados, r2.avisosDados);
    assert.ok(!r1.avisosDados.some(w => /7 dias.*7 dias/.test(w)));
    assert.equal(r1.pontos.find(p => p.days === 7).mpa, 29);
});
test('C-08: exclusão automática atua sobre o ponto agregado da idade (um ponto por idade)', () => {
    const r = analyze(base([{ days: 3, mpa: 22 }, { days: 7, mpa: 35 }, { days: 7, mpa: 35 }, { days: 14, mpa: 30 }], { fck: 40, autoDrop: true }));
    assert.deepEqual(r.excluidos, [7]);
    assert.deepEqual(r.pontosUsados.map(p => p.days), [3, 14]);
});

// ---------------------------------------------------------------------------
// C-04, C-19, T-08: linhas inválidas ficam fora com aviso
// ---------------------------------------------------------------------------
const valido = [{ days: 3, mpa: 22 }, { days: 7, mpa: 28 }, { days: 14, mpa: 33 }];
for (const [desc, linha, motivo] of [
    ['idade vazia', { days: NaN, mpa: 30 }, /idade vazia/],
    ['idade texto vazio', { days: '', mpa: 30 }, /idade vazia/],
    ['resistência vazia', { days: 28, mpa: NaN }, /resistência vazia/],
    ['idade 0', { days: 0, mpa: 10 }, /idade deve ser maior/],
    ['idade negativa', { days: -3, mpa: 10 }, /idade deve ser maior/],
    ['resistência 0', { days: 28, mpa: 0 }, /resistência deve ser maior/],
    ['resistência negativa (C-19)', { days: 7, mpa: -5 }, /resistência deve ser maior/]
]) {
    test(`C-04/T-08: ${desc} fica fora do cálculo, com aviso`, () => {
        const r = analyze(base([...valido.slice(0, 2), linha, valido[2]]));
        const limpo = analyze(base(valido));
        assert.equal(r.ok, true);
        assert.equal(r.linhas[2].status, 'invalida');
        assert.match(r.linhas[2].motivo, motivo);
        assert.ok(r.avisos.some(w => w.tipo === 'linha_invalida' && w.indice === 2 && /Linha 3/.test(w.texto)));
        assert.deepEqual(semNaoNumericos(r), semNaoNumericos(limpo));
        assert.ok(Number.isFinite(r.estimada28));
    });
}
test('C-04: texto com vírgula decimal na tabela é aceito como número', () => {
    const r = analyze(base([{ days: '7', mpa: '28,5' }]));
    assert.equal(r.linhas[0].status, 'ok');
    assert.equal(r.pontos[0].mpa, 28.5);
});

// ---------------------------------------------------------------------------
// C-02/C-03, C-18, C-20, C-21
// ---------------------------------------------------------------------------
test('C-02/C-03: erro de parâmetro devolve ok:false, erros e NENHUM resultado', () => {
    for (const fck of ['', NaN, 5, 200]) {
        const r = analyze(base(valido, { fck }));
        assert.equal(r.ok, false);
        assert.ok(r.erros.length >= 1);
        for (const k of ['analise', 'previsoes', 'selo', 'confianca', 'validacao28', 'estimada28']) assert.equal(r[k], undefined, k);
        assert.equal(r.linhas.length, 3, 'linhas continuam marcadas para a UI');
    }
    assert.equal(analyze(base(valido, { cementType: 'custom', customS: 0.7 })).ok, false);
    assert.equal(analyze(base(valido, { cementType: 'custom', customS: '' })).ok, false);
    assert.equal(analyze(base(valido, { analysisMode: 'x' })).ok, false);
});
test('C-18: sd vazio = 4,0 com aviso; sd 0 é erro; sd < 2 é erro', () => {
    for (const sd of ['', '  ', null, undefined]) {   // A2-04: NaN numérico deixou de ser 'não informado'
        const r = analyze(base(valido, { sd }));
        assert.equal(r.ok, true);
        assert.equal(r.params.sd, 4);
        assert.equal(r.params.sdPadrao, true);
        assert.ok(r.avisos.some(w => w.tipo === 'sd_padrao'));
    }
    assert.equal(analyze(base(valido, { sd: 0 })).ok, false);
    assert.equal(analyze(base(valido, { sd: '0' })).ok, false);
    assert.equal(analyze(base(valido, { sd: 1.5 })).ok, false);
    const r = analyze(base(valido, { sd: 4 }));
    assert.equal(r.params.sdPadrao, false);
    assert.ok(!r.avisos.some(w => w.tipo === 'sd_padrao'));
});
test('C-20: analyze não muta a entrada (linhas congeladas, ordem preservada)', () => {
    const rows = Object.freeze([{ days: 14, mpa: 30 }, { days: 3, mpa: 22 }, { days: 7, mpa: 35 }].map(Object.freeze));
    const r = analyze(base(rows, { fck: 40, autoDrop: true }));
    assert.equal(r.ok, true);
    assert.deepEqual(rows.map(p => p.days), [14, 3, 7]);
});
test('C-21: s_normative resolvido uma vez e devolvido em params e analise', () => {
    const r = analyze(base(valido, { cementType: 'custom', customS: '0,33' }));
    assert.equal(r.params.s_normative, 0.33, 'A2-04: vírgula decimal aceita no s personalizado');
    const r2 = analyze(base(valido, { cementType: 'custom', customS: 0.33 }));
    assert.equal(r2.params.s_normative, 0.33);
    assert.equal(r2.analise.s_normative, 0.33);
    assert.equal(analyze(base(valido, { cementType: '0.38' })).analise.s_normative, 0.38);
});

// ---------------------------------------------------------------------------
// T-14, T-21, T-22, T-23, C-25
// ---------------------------------------------------------------------------
test('T-14: ruleApplied inalterado; mensagem correta devolvida como dado', () => {
    const c = CENARIOS.find(x => x.id === 'c3_regra_referencia');
    const r = analyze(entrada(c));
    assert.equal(r.analise.ruleApplied, true);
    assert.match(r.mensagens.regraReferencia, /limitado ao teto fck \+ 1,65·sd/);
    assert.ok(r.avisos.some(w => w.tipo === 'regra_referencia'));
    assert.equal(analyze(base(valido)).mensagens.regraReferencia, null);
});
test('T-21: ramo "< 0.03" era inalcançável (prova analítica + varredura no núcleo original)', () => {
    for (const { alpha } of orig.DataValidator.alphaConfig) assert.ok(alpha / (1 + alpha) > 0.03);
    let rnd = 12345;
    const aleat = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
    let foraDaBanda = 0;
    for (let i = 0; i < 5000; i++) {
        const s = [0.2, 0.25, 0.38, 0.05 + 0.55 * aleat()][i % 4];
        const dados = [2, 3, 7, 14, 28].filter(() => aleat() < 0.7).map(t => ({ days: t, mpa: 5 + 60 * aleat() }));
        const byDay = Object.fromEntries(dados.map(p => [p.days, p.mpa]));
        for (const { p1, p2, alpha } of orig.DataValidator.alphaConfig) {
            if (!(byDay[p1] > 0 && byDay[p2] > 0)) continue;
            const r_obs = byDay[p2] / byDay[p1], r_exp = orig.Beta.beta1(p2, s) / orig.Beta.beta1(p1, s);
            if (r_obs < r_exp * (1 - alpha) || r_obs > r_exp * (1 + alpha)) {
                foraDaBanda++;
                const f1 = orig.Beta.f28_from_point(byDay[p1], p1, s), f2 = orig.Beta.f28_from_point(byDay[p2], p2, s);
                assert.ok(Math.abs(f1 - f2) / Math.max(f1, f2) >= 0.03);
            }
        }
        assert.deepEqual(DataValidator.suggestDropsForFit(dados, s), orig.DataValidator.suggestDropsForFit(dados, s));
    }
    assert.ok(foraDaBanda > 1000, `varredura exercitou ${foraDaBanda} pares fora da banda`);
});
test('T-22: comparação de s numérica com tolerância 0,0005', () => {
    assert.equal(compararS(0.2004, 0.2), 'equivalente');
    assert.equal(compararS(0.1996, 0.2), 'equivalente');
    assert.equal(compararS(0.2006, 0.2), 'mais_lento');
    assert.equal(compararS(0.1994, 0.2), 'mais_rapido');
    assert.equal(analyze(base([{ days: 7, mpa: 28.5 }, { days: 14, mpa: 31.7 }])).comparacaoS, 'mais_rapido');
});
test('T-23: com s personalizado 0,60 a janela plausível não passa de 0,60 (antes ia a 0,63)', () => {
    const dados = [3, 7, 14].map(t => ({ days: t, mpa: 50 * Beta.beta1(t, 0.66) }));
    const st = { fck: 45, sd: 4, s_normative: 0.6, realData: dados, analysisMode: 'adjusted' };
    const antigo = orig.Calculator.performAnalysis(st), atual = Calculator.performAnalysis(st);
    assert.ok(antigo.plausibleTrendS > 0.6, `antes: ${antigo.plausibleTrendS}`);
    assert.ok(atual.plausibleTrendS <= 0.6, `agora: ${atual.plausibleTrendS}`);
});
test('C-25: computeOffsetResiduals sem p95, maxPos igual ao original', () => {
    const d = [{ days: 3, mpa: 22 }, { days: 7, mpa: 28 }, { days: 14, mpa: 33 }];
    const a = Calculator.computeOffsetResiduals(d, 40, 0.22), b = orig.Calculator.computeOffsetResiduals(d, 40, 0.22);
    assert.deepEqual(Object.keys(a), ['maxPos']);
    assert.equal(a.maxPos, b.maxPos);
});

// ---------------------------------------------------------------------------
// D2: confiança e selo
// ---------------------------------------------------------------------------
test('D2: confiança baixa (1 idade ou só ≤ 3 d) dá selo Indicativo', () => {
    const r1 = analyze(base([{ days: 7, mpa: 28.5 }]));
    assert.equal(r1.confianca.nivel, 'baixa');
    assert.equal(r1.confianca.rotulo, 'apenas sinal');
    assert.equal(r1.selo.codigo, 'indicativo');
    const r2 = analyze(base([{ days: 1, mpa: 20 }, { days: 3, mpa: 30 }]));
    assert.equal(r2.confianca.nivel, 'baixa');
    assert.equal(r2.selo.texto, 'Indicativo');
    const r3 = analyze(base([{ days: 14, mpa: 40 }, { days: 14, mpa: 41 }]));
    assert.equal(r3.confianca.nivel, 'baixa', 'vários CPs na mesma idade continuam sendo 1 idade');
});
test('D2: confiança média (maior idade 4 a 13 d) e boa (≥ 2 idades, maior ≥ 14 d)', () => {
    const m = analyze(base([{ days: 3, mpa: 20.75 }, { days: 7, mpa: 28.8 }]));
    assert.equal(m.confianca.nivel, 'media');
    assert.equal(m.selo.codigo, 'nao_atende');
    const b = analyze(base([{ days: 7, mpa: 28.5 }, { days: 14, mpa: 31.7 }]));
    assert.equal(b.confianca.nivel, 'boa');
    assert.equal(b.selo.texto, 'Não atende');
    assert.equal(b.selo.base, 'estimativa');
    const a = analyze(base([{ days: 3, mpa: 36 }, { days: 7, mpa: 44 }, { days: 14, mpa: 49 }]));
    assert.equal(a.selo.texto, 'Atende');
});
test('D2: com ensaio real de 28 d o selo vem do ensaio (mediana dos CPs)', () => {
    const r = analyze(base([{ days: 7, mpa: 30 }, { days: 28, mpa: 44 }, { days: 28, mpa: 47 }]));
    assert.equal(r.real28, 45.5);
    assert.equal(r.selo.base, 'ensaio28');
    assert.equal(r.selo.texto, 'Atende pelo ensaio de 28 d');
    const n = analyze(base([{ days: 7, mpa: 30 }, { days: 28, mpa: 40 }]));
    assert.equal(n.selo.texto, 'Não atende pelo ensaio de 28 d');
});

// ---------------------------------------------------------------------------
// D4: validação honesta e D3: flag de extrapolação
// ---------------------------------------------------------------------------
test('D4: previsão de 28 d refeita SEM o ensaio de 28 d e comparada ao real', () => {
    const rows = [{ days: 3, mpa: 40 }, { days: 7, mpa: 47 }, { days: 14, mpa: 52 }, { days: 28, mpa: 57 }];
    const r = analyze(base(rows));
    const v = r.validacao28;
    assert.equal(v.calculada, true);
    const sem28 = Calculator.performAnalysis({ fck: 45, sd: 4, s_normative: 0.2, realData: rows.slice(0, 3), analysisMode: 'adjusted' });
    const esperado = Math.max(0, Calculator.calculateResistance(sem28.fcm, sem28.s, 28) - sem28.offset);
    perto(v.previsto28, esperado, 'previsto28');
    perto(v.erroPct, (esperado - 57) / 57 * 100, 'erroPct');
    assert.equal(v.classificacao, v.erroPct > 0 ? 'superestimou' : 'conservador');
    assert.deepEqual(v.idadesUsadas, [3, 7, 14]);
});
test('D4: sem ensaio < 28 d ou sem ensaio de 28 d, não calcula e diz o motivo', () => {
    const so28 = analyze(base([{ days: 28, mpa: 50 }])).validacao28;
    assert.equal(so28.calculada, false);
    assert.match(so28.motivo, /antes de 28 d/);
    const sem = analyze(base([{ days: 7, mpa: 30 }])).validacao28;
    assert.equal(sem.calculada, false);
    assert.match(sem.motivo, /Sem ensaio de 28 d/);
});
test('D4: modo normativo também é respeitado na validação', () => {
    const rows = [{ days: 7, mpa: 30 }, { days: 14, mpa: 35 }, { days: 28, mpa: 40 }];
    const r = analyze(base(rows, { analysisMode: 'normative' }));
    const sem28 = Calculator.performAnalysis({ fck: 45, sd: 4, s_normative: 0.2, realData: rows.slice(0, 2), analysisMode: 'normative' });
    perto(r.validacao28.previsto28, Math.max(0, Calculator.calculateResistance(sem28.fcm, sem28.s, 28) - sem28.offset), 'previsto28');
});
test('D3: previsões trazem extrapolacao = t > 28; idadePrevisao opcional', () => {
    const r = analyze(base(valido, { idadePrevisao: 90 }));
    assert.deepEqual(r.previsoes.map(p => [p.t, p.extrapolacao]), IDADES.map(t => [t, t > 28]));
    assert.equal(r.previsaoIdade.t, 90);
    assert.equal(r.previsaoIdade.extrapolacao, true);
    assert.equal(analyze(base(valido)).previsaoIdade, null);
    const r14 = analyze(base(valido, { idadePrevisao: '14' }));
    assert.equal(r14.previsaoIdade.estimada, r14.previsoes.find(p => p.t === 14).estimada);
});
test('caso real C45 via analyze: 32,04 aos 14 d (só 7 d) e 34,18 aos 28 d (7 d + 14 d)', () => {
    assert.equal(analyze(base([{ days: 7, mpa: 28.5 }])).previsoes.find(p => p.t === 14).estimada.toFixed(2), '32.04');
    assert.equal(analyze(base([{ days: 7, mpa: 28.5 }, { days: 14, mpa: 31.7 }])).estimada28.toFixed(2), '34.18');
});

// ---------------------------------------------------------------------------
// M2.1: ajustes da auditoria (parecer_M2_nucleo.md, A2-xx)
// ---------------------------------------------------------------------------
test('A2-04: parâmetros em texto usam vírgula decimal; lixo é erro (nada de parseFloat silencioso)', () => {
    const rows = [{ days: 7, mpa: 36 }, { days: 14, mpa: 41.05 }];
    const num = analyze(base(rows, { fck: 45.5 })), txt = analyze(base(rows, { fck: '45,5' }));
    assert.equal(txt.params.fck, 45.5);
    assert.equal(txt.selo.codigo, num.selo.codigo);
    perto(txt.estimada28, num.estimada28, 'estimada28');
    assert.equal(analyze(base(rows, { sd: '4,5' })).params.sd, 4.5);
    assert.equal(analyze(base(rows, { sd: '4,5' })).analise.fcm_base, 45 + 1.65 * 4.5);
    assert.equal(analyze(base(rows, { cementType: 'custom', customS: '0,33' })).params.s_normative, 0.33);
    for (const ruim of [{ fck: '45abc' }, { sd: '4,5x' }, { sd: NaN }, { cementType: 'custom', customS: '0,3a' }]) {
        const r = analyze(base(rows, ruim));
        assert.equal(r.ok, false, JSON.stringify(ruim));
        assert.ok(r.erros.some(e => /deve ser um número/.test(e)), JSON.stringify(r.erros));
    }
});
test('A2-07: CSV com vírgula decimal entre aspas e separador vírgula', () => {
    assert.deepEqual(parseCsv('idade,fc\n7,"25,5"\n14,"30,1"').rows, [{ days: 7, mpa: 25.5 }, { days: 14, mpa: 30.1 }]);
    assert.deepEqual(parseCsv('"7";"25,5"').rows, [{ days: 7, mpa: 25.5 }]);
    const r = parseCsv('"7";"25;5"');
    assert.equal(r.rows.length, 0);
    assert.equal(r.ignoradas.length, 1);
});
test('A2-02: sem ensaios, confiança e selo não falam em "uma idade" nem dão estimativa', () => {
    const r = analyze(base([]));
    assert.equal(r.confianca.rotulo, 'sem ensaios');
    assert.doesNotMatch(r.confianca.motivo, /uma idade/);
    assert.equal(r.selo.codigo, 'sem_dados');
    assert.doesNotMatch(r.selo.motivo, /\d/);
});
test('A2-03: idade fracionária não é arredondada nos textos', () => {
    const m = analyze(base([{ days: 3, mpa: 20 }, { days: 13.5, mpa: 30 }]));
    assert.equal(m.confianca.nivel, 'media');
    assert.match(m.confianca.motivo, /13,5 d/);
    const g = analyze(base([{ days: 3.5, mpa: 20 }, { days: 3.5, mpa: 22 }]));
    assert.ok(g.avisos.some(a => /aos 3,5 d/.test(a.texto)));
    assert.match(analyze(base([{ days: 3, mpa: 20 }, { days: 14, mpa: 30 }])).confianca.motivo, /14 d/);
});
test('A2-05: cimento fora da lista é erro; 0.2 numérico equivale a "0.20"', () => {
    for (const c of ['5', '0.3', 'abc', '', undefined]) assert.equal(analyze(base(valido, { cementType: c })).ok, false, String(c));
    const r = analyze(base(valido, { cementType: 0.2 }));
    assert.equal(r.ok, true);
    assert.equal(r.params.cementType, '0.20');
    assert.equal(r.params.s_normative, 0.2);
});
test('A2-06: autoDrop só liga com true ou "true"', () => {
    const rows = [{ days: 3, mpa: 22 }, { days: 7, mpa: 35 }, { days: 14, mpa: 30 }];
    assert.deepEqual(analyze(base(rows, { fck: 40, autoDrop: 'false' })).excluidos, []);
    assert.deepEqual(analyze(base(rows, { fck: 40, autoDrop: 1 })).excluidos, []);
    assert.deepEqual(analyze(base(rows, { fck: 40, autoDrop: 'true' })).excluidos, [7]);
    assert.deepEqual(analyze(base(rows, { fck: 40, autoDrop: true })).excluidos, [7]);
});

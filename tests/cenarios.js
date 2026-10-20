// Cenários dos testes ouro e a "cola" que reproduz App.update (index.html 6e0bdc9, linhas 700-722)
// e as fórmulas de exibição (923-925 previsão; 954-956 delta 28 d; 991-995 diagnóstico).
// Nada aqui corrige defeito: é o comportamento atual, inclusive o sort que reordena os dados (C-20).

const S = { CPV: 0.20, CPII: 0.25, CPIII: 0.38 };
const IDADES = [3, 7, 14, 28, 63];

const pts = (...pares) => pares.map(([days, mpa]) => ({ days, mpa }));

const CENARIOS = [
    { id: 'a1_c45_cpv_1ponto_7d', desc: 'Caso real C45 CP V-ARI sd 4: só 7d=28,5 (esperado 32,04 aos 14 d)',
      fck: 45, sd: 4, cement: S.CPV, mode: 'adjusted', autoDrop: false, data: pts([7, 28.5]) },
    { id: 'a2_c45_cpv_7d_14d', desc: 'Caso real C45 CP V-ARI sd 4: 7d=28,5 + 14d=31,7 (esperado 34,18 aos 28 d)',
      fck: 45, sd: 4, cement: S.CPV, mode: 'adjusted', autoDrop: false, data: pts([7, 28.5], [14, 31.7]) },
    { id: 'a3_c45_cpv_3_7_14', desc: 'Roteiro CSV mediana: 3d=20,75 7d=28,8 14d=31,7',
      fck: 45, sd: 4, cement: S.CPV, mode: 'adjusted', autoDrop: false, data: pts([3, 20.75], [7, 28.8], [14, 31.7]) },
    { id: 'b1_1ponto_acima', desc: '1 ponto acima da referência: 7d=50',
      fck: 45, sd: 4, cement: S.CPV, mode: 'adjusted', autoDrop: false, data: pts([7, 50]) },
    { id: 'b2_1ponto_precoce', desc: '1 ponto em idade precoce: 1d=20',
      fck: 45, sd: 4, cement: S.CPV, mode: 'adjusted', autoDrop: false, data: pts([1, 20]) },
    { id: 'c1_acima_com_28d', desc: 'Acima da referência com ensaio de 28 d: 3d=40 7d=47 14d=52 28d=57',
      fck: 45, sd: 4, cement: S.CPV, mode: 'adjusted', autoDrop: false, data: pts([3, 40], [7, 47], [14, 52], [28, 57]) },
    { id: 'c2_acima_moderado', desc: 'Acima da referência: 3d=36 7d=44 14d=49',
      fck: 45, sd: 4, cement: S.CPV, mode: 'adjusted', autoDrop: false, data: pts([3, 36], [7, 44], [14, 49]) },
    { id: 'c3_regra_referencia', desc: 'Pontos sobre/acima da referência que acionam ruleApplied: 3d=34,21 7d=42,25 14d=47,74',
      fck: 45, sd: 4, cement: S.CPV, mode: 'adjusted', autoDrop: false, data: pts([3, 34.21], [7, 42.25], [14, 47.74]) },
    { id: 'd1_abaixo', desc: 'Abaixo da referência: 3d=22 7d=28 14d=33',
      fck: 45, sd: 4, cement: S.CPV, mode: 'adjusted', autoDrop: false, data: pts([3, 22], [7, 28], [14, 33]) },
    { id: 'e1_nao_monotonico_cpii', desc: 'Não monotônico C35 CP II: 3d=16 7d=14,5',
      fck: 35, sd: 4, cement: S.CPII, mode: 'adjusted', autoDrop: false, data: pts([3, 16], [7, 14.5]) },
    { id: 'e2_outlier_sem_autodrop', desc: 'Outlier C40 CP V: 3d=22 7d=35 14d=30, auto-exclusão desligada',
      fck: 40, sd: 4, cement: S.CPV, mode: 'adjusted', autoDrop: false, data: pts([3, 22], [7, 35], [14, 30]) },
    { id: 'e3_outlier_com_autodrop', desc: 'Outlier C40 CP V: 3d=22 7d=35 14d=30, auto-exclusão ligada',
      fck: 40, sd: 4, cement: S.CPV, mode: 'adjusted', autoDrop: true, data: pts([3, 22], [7, 35], [14, 30]) },
    { id: 'e4_autodrop_sem_violacao', desc: 'Auto-exclusão ligada sem razão fora da banda (dados de a2)',
      fck: 45, sd: 4, cement: S.CPV, mode: 'adjusted', autoDrop: true, data: pts([7, 28.5], [14, 31.7]) },
    { id: 'e5_autodrop_2d_3d', desc: 'Auto-exclusão com par 3d/2d e dados fora de ordem: 7d=30 2d=10 3d=20',
      fck: 45, sd: 4, cement: S.CPV, mode: 'adjusted', autoDrop: true, data: pts([7, 30], [2, 10], [3, 20]) },
    { id: 'f1_cpiii', desc: 'CP III C30: 3d=12 7d=18 14d=24 28d=29',
      fck: 30, sd: 4, cement: S.CPIII, mode: 'adjusted', autoDrop: false, data: pts([3, 12], [7, 18], [14, 24], [28, 29]) },
    { id: 'g1_s_personalizado_005', desc: 's personalizado 0,05: C45 7d=35 14d=38',
      fck: 45, sd: 4, cement: 'custom', customS: 0.05, mode: 'adjusted', autoDrop: false, data: pts([7, 35], [14, 38]) },
    { id: 'g2_s_personalizado_060', desc: 's personalizado 0,60: C45 7d=35 14d=38',
      fck: 45, sd: 4, cement: 'custom', customS: 0.60, mode: 'adjusted', autoDrop: false, data: pts([7, 35], [14, 38]) },
    { id: 'h1_normativo_2pontos', desc: 'Modo normativo com dados de a2',
      fck: 45, sd: 4, cement: S.CPV, mode: 'normative', autoDrop: false, data: pts([7, 28.5], [14, 31.7]) },
    { id: 'h2_normativo_acima', desc: 'Modo normativo com dados de c1 (acima, com 28 d)',
      fck: 45, sd: 4, cement: S.CPV, mode: 'normative', autoDrop: false, data: pts([3, 40], [7, 47], [14, 52], [28, 57]) },
    { id: 'i1_sem_dados', desc: 'Sem ensaios (só curva de referência)',
      fck: 45, sd: 4, cement: S.CPV, mode: 'adjusted', autoDrop: false, data: [] },
    { id: 'k1_sd_6', desc: 'sd = 6, C35 CP II: 7d=25 28d=38',
      fck: 35, sd: 6, cement: S.CPII, mode: 'adjusted', autoDrop: false, data: pts([7, 25], [28, 38]) }
];

// Reproduz App.update + exibição usando o núcleo passado (original ou novo).
function executar(nucleo, c) {
    const { Beta, DataValidator, Calculator } = nucleo;
    const realData = c.data.map(p => ({ ...p }));            // cópia: o app reordena state.realData no sort
    const s_normative = c.cement === 'custom'
        ? Calculator.validateInput(c.customS, 'S Personalizado', 0.05, 0.6)
        : parseFloat(c.cement);
    Calculator.validateInput(c.fck, 'FCK de Projeto', 10, 150);
    Calculator.validateInput(c.sd, 'Desvio Padrão', 2.0);

    const warnings = DataValidator.checkAll(realData, s_normative);
    let drops = [];
    if (c.autoDrop) drops = DataValidator.suggestDropsForFit(realData.sort((a, b) => a.days - b.days), s_normative);
    const realDataForFit = realData.filter(p => !drops.includes(p.days));

    const r = Calculator.performAnalysis({ fck: c.fck, sd: c.sd, s_normative, realData: realDataForFit, analysisMode: c.mode });

    const carac = (fcm, s, off) => Object.fromEntries(IDADES.map(t => [t, Math.max(0, Calculator.calculateResistance(fcm, s, t) - off)]));
    const media = (fcm, s) => Object.fromEntries(IDADES.map(t => [t, Calculator.calculateResistance(fcm, s, t)]));

    const p28 = realData.find(p => p.days === 28);
    let delta28 = null;
    if (p28) {
        const ck28 = Math.max(0, Calculator.calculateResistance(r.fcm, r.s, 28) - r.offset);
        delta28 = ((ck28 - p28.mpa) / p28.mpa) * 100;
    }
    const fck28_relatorio = Calculator.calculateResistance(r.fcm, r.s, 28) - r.offset;
    const curva = Calculator.generateCurveData(r.fcm, r.s);
    const curvaRef = Calculator.generateCurveData(r.fcm_base, s_normative);

    return {
        s_normative,
        analise: r,                                   // fcm, s, offset, fcm_base, ruleApplied, flags e tendências
        avisos: warnings,
        excluidos: drops,
        previsao: carac(r.fcm, r.s, r.offset),        // "Resistência Característica Estimada" (rótulo atual)
        media: media(r.fcm, r.s),
        previsaoPlausivel: r.showPlausibleTrendCurve ? carac(r.plausibleTrendFcm, r.plausibleTrendS, r.plausibleTrendOffset) : null,
        previsaoLivre: r.showFreeTrendCurve ? carac(r.freeTrendFcm, r.freeTrendS, r.freeTrendOffset) : null,
        delta28,
        diagnosticoSatisfatorio: fck28_relatorio >= c.fck,
        curva: { n: curva.length, somaY: curva.reduce((a, p) => a + p.y, 0) },
        curvaRef: { n: curvaRef.length, somaY: curvaRef.reduce((a, p) => a + p.y, 0) },
        beta1: Object.fromEntries(IDADES.map(t => [t, Beta.beta1(t, s_normative)]))
    };
}

module.exports = { CENARIOS, IDADES, executar };

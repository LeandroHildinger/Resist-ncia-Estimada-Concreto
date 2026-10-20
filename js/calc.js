/*
 * Estimativa Fck - núcleo de cálculo (puro, sem DOM).
 * Origem: index.html commit 6e0bdc9, linhas 269-513 (Beta, DataValidator, Calculator),
 * copiado sem alteração de lógica no marco M1 da modernização (2026-10-20).
 * M2 (2026-10-20): correções T-21, T-23, C-25 no núcleo (comentadas no local) e pipeline
 * analyze(input) / parseCsv(text) no fim do arquivo (C-01..C-09, C-18..C-21, T-07, T-08, T-14, T-22, D2, D4).
 * Uso no navegador: <script src="js/calc.js"></script> -> window.EstimativaCalc
 * Uso no Node: const { analyze, parseCsv, Calculator } = require('./js/calc.js')
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.EstimativaCalc = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    const Beta = {
        beta1(t, s){ return Math.exp(s*(1 - Math.sqrt(28/t))); },
        f28_from_point(mpa_t, t, s){ return mpa_t / this.beta1(t, s); }
    };

    const DataValidator = {
        alphaConfig: [
            {p1:2, p2:3, alpha:0.20, label:'3d/2d'},
            {p1:3, p2:7, alpha:0.20, label:'7d/3d'},
            {p1:7, p2:14, alpha:0.12, label:'14d/7d'},
            {p1:14, p2:28, alpha:0.10, label:'28d/14d'}
        ],

        checkAll(dataPoints, s_normative) {
            if (dataPoints.length < 2) return [];
            const sortedData = [...dataPoints].sort((a, b) => a.days - b.days);
            const monotonicityWarnings = this.checkMonotonicity(sortedData);
            const ratioWarnings = this.checkRatios(sortedData, s_normative);
            return [...monotonicityWarnings, ...ratioWarnings];
        },

        checkMonotonicity(sortedData) {
            const warnings = [];
            for (let i = 1; i < sortedData.length; i++) {
                if (sortedData[i].mpa < sortedData[i - 1].mpa) {
                    warnings.push(`<b>Inconsistência de Monotonia:</b> A resistência aos ${sortedData[i].days} dias (${sortedData[i].mpa.toFixed(1)} MPa) é menor que a dos ${sortedData[i - 1].days} dias (${sortedData[i - 1].mpa.toFixed(1)} MPa).`);
                }
            }
            return warnings;
        },
        
        checkRatios(sortedData, s_normative) {
            const warnings = [];
            const byDay = Object.fromEntries(sortedData.map(p => [p.days, p.mpa]));

            this.alphaConfig.forEach(({p1,p2,alpha,label})=>{
                if(!(byDay[p1]>0 && byDay[p2]>0)) return;
                const r_obs = byDay[p2]/byDay[p1];
                const r_exp = Beta.beta1(p2, s_normative)/Beta.beta1(p1, s_normative);
                const low = r_exp*(1-alpha), high = r_exp*(1+alpha);
                if(r_obs<low || r_obs>high){
                    warnings.push(`<b>Razão ${label} Incomum:</b> O valor de ${r_obs.toFixed(2)} está fora da banda dinâmica esperada (${low.toFixed(2)} a ${high.toFixed(2)}).`);
                }
            });
            return warnings;
        },

        suggestDropsForFit(sortedData, s_normative){
            const drops = new Set();
            const byDay = Object.fromEntries(sortedData.map(p => [p.days, p.mpa]));
            this.alphaConfig.forEach(({p1,p2,alpha})=>{
                if(!(byDay[p1]>0 && byDay[p2]>0)) return;
                const r_obs = byDay[p2]/byDay[p1];
                const r_exp = Beta.beta1(p2, s_normative)/Beta.beta1(p1, s_normative);
                const low = r_exp*(1-alpha), high = r_exp*(1+alpha);
                if(r_obs<low || r_obs>high){
                    const f28_1 = Beta.f28_from_point(byDay[p1], p1, s_normative);
                    const f28_2 = Beta.f28_from_point(byDay[p2], p2, s_normative);
                    // T-21 (M2): removido o ramo "< 0.03" (inalcançável). Fora da banda,
                    // f28_2/f28_1 = r_obs/r_exp sai de [1-alpha, 1+alpha], logo a diferença
                    // relativa é >= alpha/(1+alpha) >= 0,0909 com alpha >= 0,10. Prova em tests/m2.test.js.
                    drops.add(f28_1 > f28_2 ? p1 : p2);
                }
            });
            return [...drops];
        }
    };

    const Calculator = {
        validateInput(value, name, min = -Infinity, max = Infinity) {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) throw new Error(`Parâmetro "${name}" deve ser um número.`);
            if (numValue < min) throw new Error(`Parâmetro "${name}" deve ser no mínimo ${min}.`);
            if (numValue > max) throw new Error(`Parâmetro "${name}" deve ser no máximo ${max}.`);
            return numValue;
        },

        calculateResistance: (fcm, s, t) => {
            if (t <= 0) return 0;
            return fcm * Math.exp(s * (1 - Math.sqrt(28 / t)));
        },

        generateCurveData(fcm, s, maxDays = 90) {
            const data = [];
            for (let t = 1; t <= maxDays; t += 0.5) {
                data.push({ x: t, y: this.calculateResistance(fcm, s, t) });
            }
            data.sort((a, b) => a.x - b.x);
            return data;
        },
        
        goldenSection(min, max, fn, tol=1e-4, maxIter=60){
          const gr = (Math.sqrt(5)-1)/2;
          let a=min, b=max, c=b-gr*(b-a), d=a+gr*(b-a);
          let fc=fn(c), fd=fn(d);
          for(let i=0;i<maxIter && Math.abs(b-a)>tol;i++){
            if(fc>fd){ a=c; c=d; fc=fd; d=a+gr*(b-a); fd=fn(d); }
            else     { b=d; d=c; fd=fc; c=b-gr*(b-a); fc=fn(c); }
          }
          return (a+b)/2;
        },

        findBestFitParameters(dataPoints, s_min, s_max){
            if (dataPoints.length < 2) return null;
            const sse = (s) => {
                const fcm = this.findBestFitFcm(dataPoints, s);
                if (fcm === null) return Infinity;
                return dataPoints.reduce((acc,p)=>{
                    const pred = this.calculateResistance(fcm, s, p.days);
                    return acc + (p.mpa - pred)**2;
                },0);
            };
            const s_opt = this.goldenSection(s_min, s_max, sse);
            return { s: s_opt, fcm: this.findBestFitFcm(dataPoints, s_opt) };
        },
        
        findTrulyBestFitParameters(dataPoints) {
            if (dataPoints.length < 2) return null;
            return this.findBestFitParameters(dataPoints, 0.05, 0.60);
        },

        findBestFitFcm(dataPoints, s) {
            if (dataPoints.length < 1) return null;
            let numerator = 0;
            let denominator = 0;
            dataPoints.forEach(point => {
                if (point.days > 0) {
                    const k = Math.exp(s * (1 - Math.sqrt(28 / point.days)));
                    numerator += point.mpa * k;
                    denominator += k * k;
                }
            });
            return denominator > 0 ? numerator / denominator : null;
        },
        
        computeOffsetResiduals(data, fcm, s){
            const res = data.map(p => this.calculateResistance(fcm, s, p.days) - p.mpa);
            const positives = res.filter(x=>x>0).sort((a,b)=>a-b);
            const maxPos = positives.length? positives[positives.length-1] : 0;
            // C-25 (M2): removido o p95, calculado e nunca usado.
            return {maxPos};
        },

        performAnalysis(state) {
            const { fck, sd, s_normative, realData, analysisMode } = state;
            const fcm_base = fck + 1.65 * sd;
                            
            let s_final = s_normative;
            let fcm_final = fcm_base;
            let safetyOffset = 0;
            let ruleApplied = false;
                            
            let plausibleTrendFcm = fcm_base;
            let plausibleTrendS = s_normative;
            let plausibleTrendOffset = 0;
            let showPlausibleTrendCurve = false;
            let tendencySuperiority = 0;

            let freeTrendFcm = fcm_base;
            let freeTrendS = s_normative;
            let freeTrendOffset = 0;
            let showFreeTrendCurve = false;

            if (realData.length > 0) {
                if (analysisMode === 'adjusted' && realData.length > 1) {
                    const s_range_offset = 0.03;
                    const s_min_plausible = Math.max(0.05, s_normative - s_range_offset);
                    // T-23 (M2): teto da janela plausível limitado a 0,60 (domínio do ajuste livre e do campo).
                    const s_max_plausible = Math.min(0.60, s_normative + s_range_offset);

                    const bestFitPlausible = this.findBestFitParameters(realData, s_min_plausible, s_max_plausible);
                    if (bestFitPlausible) {
                         plausibleTrendS = bestFitPlausible.s;
                         plausibleTrendFcm = bestFitPlausible.fcm;
                    }
                    const bestFitFree = this.findTrulyBestFitParameters(realData);
                    if (bestFitFree) {
                        freeTrendS = bestFitFree.s;
                        freeTrendFcm = bestFitFree.fcm;
                    }

                } else if (analysisMode === 'normative' || realData.length <= 1) {
                     plausibleTrendFcm = this.findBestFitFcm(realData, plausibleTrendS) || fcm_base;
                     freeTrendFcm = plausibleTrendFcm;
                }

                if (plausibleTrendFcm > fcm_base) {
                    showPlausibleTrendCurve = true;
                    const fcm_ref_28 = this.calculateResistance(fcm_base, s_normative, 28);
                    const fcm_plausible_28 = this.calculateResistance(plausibleTrendFcm, plausibleTrendS, 28);
                    if (fcm_ref_28 > 0) {
                        tendencySuperiority = ((fcm_plausible_28 / fcm_ref_28) - 1) * 100;
                    }
                    plausibleTrendOffset = this.computeOffsetResiduals(realData, plausibleTrendFcm, plausibleTrendS).maxPos;
                }
                
                if (freeTrendFcm > fcm_base && analysisMode === 'adjusted') {
                    showFreeTrendCurve = true;
                    freeTrendOffset = this.computeOffsetResiduals(realData, freeTrendFcm, freeTrendS).maxPos;
                }

                let reg_fcm_limited = Math.min(plausibleTrendFcm, fcm_base);
                let reg_s_final = plausibleTrendS;
                                    
                let shouldUseTheoretical = false;
                if (realData.length > 1 && analysisMode === 'adjusted') {
                    let isRefCurveBelowAllPoints = true;
                    let sse_ref = 0;
                    realData.forEach(point => {
                        const predicted_ref = this.calculateResistance(fcm_base, s_normative, point.days);
                        if (point.mpa < predicted_ref) { isRefCurveBelowAllPoints = false; }
                        sse_ref += Math.pow(point.mpa - predicted_ref, 2);
                    });

                    if (isRefCurveBelowAllPoints) {
                        let sse_reg = 0;
                        realData.forEach(point => {
                            const predicted_reg = this.calculateResistance(reg_fcm_limited, reg_s_final, point.days);
                            sse_reg += Math.pow(point.mpa - predicted_reg, 2);
                        });
                        if (sse_ref < sse_reg) {
                            shouldUseTheoretical = true;
                            ruleApplied = true;
                        }
                    }
                }
                                    
                if (shouldUseTheoretical) {
                    s_final = s_normative;
                    fcm_final = fcm_base;
                } else {
                    s_final = reg_s_final;
                    fcm_final = reg_fcm_limited;
                }

                safetyOffset = this.computeOffsetResiduals(realData, fcm_final, s_final).maxPos;
            }
                            
            return { 
                fcm: fcm_final, s: s_final, offset: safetyOffset, fcm_base, ruleApplied,
                showPlausibleTrendCurve, plausibleTrendFcm, plausibleTrendS, plausibleTrendOffset, tendencySuperiority,
                showFreeTrendCurve, freeTrendFcm, freeTrendS, freeTrendOffset
            };
        }
    };

    // =====================================================================
    // M2: pipeline puro (antes espalhado em App.update, renderPrediction,
    // renderDelta28, generateReport e handleCsvImport do index.html).
    // A UI só chama analyze(input) e desenha o que vier.
    // =====================================================================

    const IDADES_PADRAO = [3, 7, 14, 28, 63];
    const SD_PADRAO = 4.0;
    const TOL_S = 0.0005;            // T-22
    const CIMENTOS = { '0.25': 'CP I / CP II', '0.38': 'CP III / CP IV', '0.20': 'CP V-ARI' };

    const vazio = v => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (typeof v === 'number' && Number.isNaN(v));

    // Converte número da tabela/CSV: aceita number ou texto com vírgula decimal. Vazio/lixo -> NaN.
    function paraNumero(v) {
        if (typeof v === 'number') return v;
        if (vazio(v)) return NaN;
        const t = String(v).trim().replace(',', '.');
        if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return NaN;
        return Number(t);
    }

    // C-04, C-19, T-08: mesma validação para linha digitada e linha de CSV.
    function validarLinha(linha) {
        const days = paraNumero(linha && linha.days);
        const mpa = paraNumero(linha && linha.mpa);
        if (!Number.isFinite(days)) return { ok: false, days, mpa, motivo: 'idade vazia ou não numérica' };
        if (!Number.isFinite(mpa)) return { ok: false, days, mpa, motivo: 'resistência vazia ou não numérica' };
        if (days <= 0) return { ok: false, days, mpa, motivo: 'idade deve ser maior que 0' };
        if (mpa <= 0) return { ok: false, days, mpa, motivo: 'resistência deve ser maior que 0' };
        return { ok: true, days, mpa, motivo: null };
    }

    // Mesmo critério de mediana do CSV original (index.html 6e0bdc9, linhas 1060-1074).
    function mediana(valores) {
        const arr = [...valores].sort((a, b) => a - b);
        const mid = Math.floor(arr.length / 2);
        return (arr.length % 2) ? arr[mid] : (0.5 * (arr[mid - 1] + arr[mid]));
    }

    // C-07, C-08, T-07: agrega CPs da mesma idade pela mediana, sem mutar a entrada.
    function agregarPorIdade(validas) {
        const porIdade = new Map();
        validas.forEach(l => {
            if (!porIdade.has(l.days)) porIdade.set(l.days, { valores: [], indices: [] });
            const g = porIdade.get(l.days);
            g.valores.push(l.mpa);
            g.indices.push(l.indice);
        });
        return [...porIdade.entries()]
            .map(([days, g]) => ({ days, mpa: mediana(g.valores), n: g.valores.length, indices: g.indices, valores: [...g.valores] }))
            .sort((a, b) => a.days - b.days);
    }

    function fmt(v, casas) { return v.toFixed(casas).replace('.', ','); }
    // A2-03: idade com até 1 casa, sem ",0" quando inteira (13,5 d não vira 14 d).
    function fmtIdade(v) { return Number.isInteger(v) ? String(v) : fmt(Math.round(v * 10) / 10, 1); }

    // A2-04: parâmetro em texto passa por paraNumero (vírgula decimal; lixo -> NaN -> erro),
    // nunca por parseFloat ('45,5' virava 45 e '45abc' virava 45 em silêncio).
    function numParam(v) { return typeof v === 'string' ? paraNumero(v) : v; }
    // A2-04: sd "não informado" é só ausente ou texto em branco; NaN numérico é erro.
    const sdAusente = v => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    // A2-05: só os cimentos da lista (ou 'custom').
    const S_CIMENTOS = { '0.25': 0.25, '0.38': 0.38, '0.20': 0.20 };

    // C-18, C-21: valida e resolve os parâmetros uma única vez.
    function validarParametros(input) {
        const erros = [];
        const avisos = [];
        const tenta = (fn) => { try { return fn(); } catch (e) { erros.push(e.message); return NaN; } };

        const fck = tenta(() => Calculator.validateInput(numParam(input.fck), 'FCK de Projeto', 10, 150));

        let sd, sdPadrao = false;
        if (sdAusente(input.sd)) {
            sd = SD_PADRAO; sdPadrao = true;
            avisos.push({ tipo: 'sd_padrao', texto: `Desvio padrão não informado: usado o padrão ${fmt(SD_PADRAO, 1)} MPa.` });
        } else {
            sd = tenta(() => Calculator.validateInput(numParam(input.sd), 'Desvio Padrão', 2.0));
        }

        let s_normative;
        let tipo = input.cementType === undefined ? '' : String(input.cementType).trim();
        if (tipo === 'custom') {
            s_normative = tenta(() => Calculator.validateInput(numParam(input.customS), 'S Personalizado', 0.05, 0.6));
        } else {
            const chave = Object.keys(S_CIMENTOS).find(k => S_CIMENTOS[k] === Number(tipo));   // aceita '0.2' e 0.2
            if (tipo === '' || chave === undefined) { erros.push('Tipo de cimento inválido.'); s_normative = NaN; }
            else { tipo = chave; s_normative = S_CIMENTOS[chave]; }
        }

        const analysisMode = input.analysisMode === undefined ? 'adjusted' : input.analysisMode;
        if (analysisMode !== 'adjusted' && analysisMode !== 'normative') erros.push('Modo de análise inválido.');

        return { erros, avisos, params: { fck, sd, sdPadrao, s_normative, cementType: tipo, analysisMode, autoDrop: input.autoDrop === true || input.autoDrop === 'true' } };   // A2-06
    }

    function ajustar(pontos, params) {
        // C-20: trabalha sobre cópia ordenada; nunca ordena o array de quem chamou.
        const ordenados = pontos.map(p => ({ days: p.days, mpa: p.mpa })).sort((a, b) => a.days - b.days);
        const avisosDados = DataValidator.checkAll(ordenados, params.s_normative);
        const excluidos = params.autoDrop ? DataValidator.suggestDropsForFit(ordenados, params.s_normative) : [];
        const usados = ordenados.filter(p => !excluidos.includes(p.days));
        const analise = Calculator.performAnalysis({
            fck: params.fck, sd: params.sd, s_normative: params.s_normative,
            realData: usados, analysisMode: params.analysisMode
        });
        return { avisosDados, excluidos, usados, analise };
    }

    function preverEm(analise, t) {
        const C = Calculator;
        const media = C.calculateResistance(analise.fcm, analise.s, t);
        return {
            t,
            estimada: Math.max(0, media - analise.offset),
            media,
            plausivel: analise.showPlausibleTrendCurve
                ? Math.max(0, C.calculateResistance(analise.plausibleTrendFcm, analise.plausibleTrendS, t) - analise.plausibleTrendOffset) : null,
            livre: analise.showFreeTrendCurve
                ? Math.max(0, C.calculateResistance(analise.freeTrendFcm, analise.freeTrendS, t) - analise.freeTrendOffset) : null,
            extrapolacao: t > 28            // D3: a UI esmaece e usa traço no trecho > 28 d
        };
    }

    // D2: confiança pelo número de idades distintas e pela maior idade ensaiada.
    function avaliarConfianca(usados) {
        const idades = [...new Set(usados.map(p => p.days))].sort((a, b) => a - b);
        const maior = idades.length ? idades[idades.length - 1] : 0;
        if (idades.length === 0) {   // A2-02
            return { nivel: 'baixa', rotulo: 'sem ensaios', idades, maiorIdade: 0,
                motivo: 'Sem ensaios: só a curva de referência (fcm alvo de dosagem), sem estimativa a partir de CPs.' };
        }
        if (idades.length < 2 || maior <= 3) {
            return { nivel: 'baixa', rotulo: 'apenas sinal', idades, maiorIdade: maior,
                motivo: idades.length < 2
                    ? 'Só uma idade ensaiada: a curva não tem como ser conferida.'
                    : 'Só idades até 3 d: nessas idades a projeção tende a superestimar.' };
        }
        if (maior < 14) {
            return { nivel: 'media', rotulo: 'média', idades, maiorIdade: maior,
                motivo: `Maior idade ensaiada: ${fmtIdade(maior)} d. A projeção melhora com o ensaio de 14 d.` };
        }
        return { nivel: 'boa', rotulo: 'boa', idades, maiorIdade: maior,
            motivo: `${idades.length} idades ensaiadas, a maior com ${fmtIdade(maior)} d.` };
    }

    // D2: selo Atende / Não atende / Indicativo.
    function avaliarSelo(fck, estimada28, real28, confianca) {
        if (real28 === null && confianca.idades.length === 0) {   // A2-02
            return { codigo: 'sem_dados', base: 'sem_dados', texto: 'Sem ensaios',
                motivo: 'Adicione ensaios para estimar; a curva exibida é só a referência da norma.' };
        }
        if (real28 !== null) {
            const atende = real28 >= fck;
            return { codigo: atende ? 'atende' : 'nao_atende', base: 'ensaio28',
                texto: atende ? 'Atende pelo ensaio de 28 d' : 'Não atende pelo ensaio de 28 d',
                motivo: `Ensaio de 28 d: ${fmt(real28, 1)} MPa contra fck = ${fmt(fck, 1)} MPa.` };
        }
        if (confianca.nivel === 'baixa') {
            return { codigo: 'indicativo', base: 'indicativo', texto: 'Indicativo',
                motivo: `${confianca.motivo} Estimada aos 28 d: ${fmt(estimada28, 1)} MPa (fck = ${fmt(fck, 1)} MPa), apenas sinal.` };
        }
        const atende = estimada28 >= fck;
        return { codigo: atende ? 'atende' : 'nao_atende', base: 'estimativa',
            texto: atende ? 'Atende' : 'Não atende',
            motivo: `Resistência estimada conservadora aos 28 d: ${fmt(estimada28, 1)} MPa contra fck = ${fmt(fck, 1)} MPa.` };
    }

    // D4: validação honesta, sem os ensaios de 28 d (e posteriores) no ajuste.
    function validar28(pontos, params, real28) {
        if (real28 === null) return { calculada: false, motivo: 'Sem ensaio de 28 d para comparar.' };
        const antes = pontos.filter(p => p.days < 28);
        if (antes.length === 0) return { calculada: false, motivo: 'Sem ensaios antes de 28 d: não há previsão independente para comparar.' };
        const aj = ajustar(antes, params);
        if (aj.usados.length === 0) return { calculada: false, motivo: 'Todos os ensaios antes de 28 d foram excluídos do ajuste.' };
        const previsto28 = preverEm(aj.analise, 28).estimada;
        const erroPct = ((previsto28 - real28) / real28) * 100;
        return { calculada: true, motivo: null, previsto28, real28, erroPct,
            classificacao: erroPct > 0 ? 'superestimou' : 'conservador',
            idadesUsadas: aj.usados.map(p => p.days), excluidos: aj.excluidos };
    }

    // T-22: comparação numérica com tolerância.
    function compararS(s, s_normative) {
        if (s < s_normative - TOL_S) return 'mais_rapido';
        if (s > s_normative + TOL_S) return 'mais_lento';
        return 'equivalente';
    }

    // T-14: texto correto do caso ruleApplied (a lógica não muda).
    const MSG_REGRA_REFERENCIA = 'A curva de referência normativa foi adotada: com o fcm limitado ao teto fck + 1,65·sd, '
        + 'a forma normativa ajustou os ensaios melhor que a regressão limitada a esse teto.';

    /**
     * analyze(input) -> resultado completo para a UI.
     * input: { fck, sd, cementType ('0.25'|'0.38'|'0.20'|'custom'), customS, analysisMode ('adjusted'|'normative'),
     *          autoDrop (bool), rows: [{days, mpa}] (CPs brutos, podem ter vazios), idadePrevisao (opcional),
     *          idades (opcional, padrão [3,7,14,28,63]) }
     * Com erro de parâmetro: { ok:false, erros, linhas } e nenhum resultado (C-02, C-03).
     */
    function analyze(input) {
        input = input || {};
        const vp = validarParametros(input);
        const rows = Array.isArray(input.rows) ? input.rows : [];
        const linhas = rows.map((r, indice) => {
            const v = validarLinha(r);
            return { indice, days: v.days, mpa: v.mpa, status: v.ok ? 'ok' : 'invalida', motivo: v.motivo };
        });
        if (vp.erros.length) return { ok: false, erros: vp.erros, linhas };

        const params = vp.params;
        const avisos = [...vp.avisos];
        linhas.filter(l => l.status === 'invalida').forEach(l => {
            avisos.push({ tipo: 'linha_invalida', indice: l.indice, texto: `Linha ${l.indice + 1} fora do cálculo: ${l.motivo}.` });
        });
        const pontos = agregarPorIdade(linhas.filter(l => l.status === 'ok'));
        pontos.filter(p => p.n > 1).forEach(p => {
            avisos.push({ tipo: 'agregado', days: p.days, texto: `${p.n} CPs aos ${fmtIdade(p.days)} d agregados pela mediana (${fmt(p.mpa, 2)} MPa).` });
        });

        const aj = ajustar(pontos, params);
        const analise = { ...aj.analise, s_normative: params.s_normative };   // C-21
        if (analise.ruleApplied) avisos.push({ tipo: 'regra_referencia', texto: MSG_REGRA_REFERENCIA });

        const idades = Array.isArray(input.idades) ? input.idades : IDADES_PADRAO;
        const previsoes = idades.map(t => preverEm(analise, t));
        const tp = paraNumero(input.idadePrevisao);
        const previsaoIdade = Number.isFinite(tp) && tp > 0 ? preverEm(analise, tp) : null;

        const estimada28 = preverEm(analise, 28).estimada;
        const p28 = pontos.find(p => p.days === 28);
        const real28 = p28 ? p28.mpa : null;
        const confianca = avaliarConfianca(aj.usados);

        return {
            ok: true, erros: [], params, linhas, pontos,
            pontosUsados: aj.usados, excluidos: aj.excluidos,
            avisos, avisosDados: aj.avisosDados,
            analise, previsoes, previsaoIdade,
            estimada28, atendeEstimada28: (Calculator.calculateResistance(analise.fcm, analise.s, 28) - analise.offset) >= params.fck,
            real28, comparacaoS: compararS(analise.s, params.s_normative),
            confianca, selo: avaliarSelo(params.fck, estimada28, real28, confianca),
            validacao28: validar28(pontos, params, real28),
            mensagens: { regraReferencia: analise.ruleApplied ? MSG_REGRA_REFERENCIA : null }
        };
    }

    /**
     * parseCsv(text) -> { rows, lidas, ignoradas:[{linha, conteudo, motivo}], cabecalho }
     * C-01: linha com ";" separa por ";" (vírgula decimal); com tab separa por tab; senão por ",".
     * C-09: 1ª linha só é cabeçalho se não for numérica; aspas e BOM removidos; linhas ignoradas listadas.
     * C-07: só devolve linhas brutas; quem chama ACRESCENTA ao que já existe (sem mediana aqui).
     * Valores <= 0 passam como linha e são marcados inválidos por analyze (mesma regra da tabela, C-19).
     */
    function dividirComAspas(linha, sep) {
        const campos = [];
        let atual = '', aspas = false;
        for (let i = 0; i < linha.length; i++) {
            const ch = linha[i];
            if (ch === '"') {
                if (aspas && linha[i + 1] === '"') { atual += '"'; i++; }
                else aspas = !aspas;
            } else if (ch === sep && !aspas) { campos.push(atual); atual = ''; }
            else atual += ch;
        }
        campos.push(atual);
        return campos;
    }

    function parseCsv(text) {
        const linhasTxt = String(text || '').replace(/^﻿/, '').replace(/\r/g, '').split('\n');
        const rows = [], ignoradas = [];
        let cabecalho = false, lidas = 0;
        linhasTxt.forEach((bruta, i) => {
            const conteudo = bruta.trim();
            if (conteudo === '') return;
            lidas++;
            // A2-07: separador detectado fora das aspas; split respeita aspas (7,"25,5" -> 7 e 25,5).
            const foraAspas = conteudo.replace(/"[^"]*"/g, '');
            let sep = ',';
            if (foraAspas.includes(';')) sep = ';';
            else if (foraAspas.includes('\t')) sep = '\t';
            let campos = dividirComAspas(conteudo, sep).map(c => c.trim().replace(/^'(.*)'$/, '$1').trim());
            while (campos.length && campos[campos.length - 1] === '') campos.pop();
            const num = c => paraNumero(c);
            const ehNumerica = campos.length === 2 && campos.every(c => Number.isFinite(num(c)));
            if (!ehNumerica) {
                if (lidas === 1 && !campos.some(c => Number.isFinite(paraNumero(c)))) { cabecalho = true; return; }
                ignoradas.push({ linha: i + 1, conteudo: bruta,
                    motivo: campos.length !== 2 ? `esperados 2 campos (idade e resistência), encontrados ${campos.length}` : 'valor não numérico' });
                return;
            }
            rows.push({ days: num(campos[0]), mpa: num(campos[1]) });
        });
        return { rows, lidas: lidas - (cabecalho ? 1 : 0), ignoradas, cabecalho };
    }

    return {
        Beta, DataValidator, Calculator,
        analyze, parseCsv, validarLinha, agregarPorIdade, mediana, paraNumero, preverEm, compararS,
        IDADES_PADRAO, SD_PADRAO, CIMENTOS, MSG_REGRA_REFERENCIA
    };
}));

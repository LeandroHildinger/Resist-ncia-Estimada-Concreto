// REFERÊNCIA CONGELADA: cópia literal de index.html (commit 6e0bdc9), linhas 269-513.
// Não editar. Serve para os testes ouro compararem o núcleo novo (js/calc.js) com o original.
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
                        if (Math.abs(f28_1 - f28_2)/Math.max(f28_1,f28_2) < 0.03){
                            drops.add(Math.min(p1,p2)); 
                        } else {
                            drops.add(f28_1 > f28_2 ? p1 : p2);
                        }
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
                const p95 = positives.length? positives[Math.floor(0.95*(positives.length-1))] : 0;
                return {maxPos, p95};
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
                        const s_max_plausible = s_normative + s_range_offset;

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

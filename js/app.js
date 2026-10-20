/*
 * Estimativa fck v2.0 - interface (M3).
 * Toda a lógica de cálculo está em js/calc.js (window.EstimativaCalc.analyze); aqui só se lê
 * a tela, chama analyze e desenha o resultado.
 */
(function () {
    'use strict';

    const C = window.EstimativaCalc;
    const $ = id => document.getElementById(id);
    const CHAVE = 'estimativaFck.v2';
    const VERSAO = '2.0';

    const PADRAO = { fck: '', sd: '', cementType: '0.25', customS: '0,25', analysisMode: 'adjusted', autoDrop: false, rows: [], idadePrev: '28', exemplo: false };
    const EXEMPLO = { fck: '45', sd: '4,0', cementType: '0.20', customS: '0,25', analysisMode: 'adjusted', autoDrop: false,
        rows: [{ days: 3, mpa: 30 }, { days: 7, mpa: 38 }, { days: 14, mpa: 44 }], idadePrev: '28', exemplo: true };
    const NOMES_CIMENTO = { '0.25': 'CP I / CP II', '0.38': 'CP III / CP IV', '0.20': 'CP V-ARI', custom: 's personalizado' };

    let estado = clonar(PADRAO);
    let r = null;                 // último resultado de analyze
    let grafico = null;
    let listaSuja = true;

    // ------------------------------------------------------------------ utilitários
    function clonar(o) { return JSON.parse(JSON.stringify(o)); }
    function f1(v) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
    function fn(v, n) { return v.toLocaleString('pt-BR', { minimumFractionDigits: n, maximumFractionDigits: n }); }
    function fd(v) { return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }); }
    function sinal(v) { return (v >= 0 ? '+' : '−') + f1(Math.abs(v)); }
    function paraCampo(v) { return typeof v === 'number' ? String(v).replace('.', ',') : (v == null ? '' : String(v)); }
    function paramNum(v) { const n = C.paraNumero(v); return Number.isFinite(n) ? n : v; }
    function esc(s) { return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
    function cssVar(nome) { return getComputedStyle(document.documentElement).getPropertyValue(nome).trim(); }
    function comAlfa(cor, a) {
        const m = /^#([0-9a-f]{6})$/i.exec(cor);
        if (!m) return cor;
        const n = parseInt(m[1], 16);
        return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    }
    function dataLocal() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // ------------------------------------------------------------------ persistência (U-09)
    function salvar() {
        try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* armazenamento indisponível */ }
    }
    function carregar() {
        try {
            const bruto = localStorage.getItem(CHAVE);
            if (!bruto) return;
            const o = JSON.parse(bruto);
            if (!o || typeof o !== 'object') return;
            const novo = clonar(PADRAO);
            for (const k of Object.keys(PADRAO)) if (k in o) novo[k] = o[k];
            if (!Array.isArray(novo.rows)) novo.rows = [];
            novo.rows = novo.rows.filter(x => x && typeof x === 'object').map(x => ({ days: x.days, mpa: x.mpa }));
            estado = novo;
        } catch (e) { /* ignora estado corrompido */ }
    }

    // ------------------------------------------------------------------ debounce por campo (C-05)
    const timers = new Map();
    const pendentes = new Map();
    function agendar(chave, fnc, ms = 300) {
        clearTimeout(timers.get(chave));
        pendentes.set(chave, fnc);
        timers.set(chave, setTimeout(() => { pendentes.delete(chave); timers.delete(chave); fnc(); }, ms));
    }
    function executarJa(chave) {
        const fnc = pendentes.get(chave);
        if (!fnc) return;
        clearTimeout(timers.get(chave));
        pendentes.delete(chave); timers.delete(chave);
        fnc();
    }
    function cancelar(chave) { clearTimeout(timers.get(chave)); timers.delete(chave); pendentes.delete(chave); }
    function executarTodos() { [...pendentes.keys()].forEach(executarJa); }

    // ------------------------------------------------------------------ cálculo
    function entradaAnalyze() {
        return {
            fck: paramNum(estado.fck),
            sd: paramNum(estado.sd),
            cementType: estado.cementType,
            customS: paramNum(estado.customS),
            analysisMode: estado.analysisMode,
            autoDrop: !!estado.autoDrop,
            rows: estado.rows,
            idadePrevisao: paramNum(estado.idadePrev)
        };
    }
    function calcular() {
        r = C.analyze(entradaAnalyze());
        render();
    }
    function mudou() { estado.exemplo = false; salvar(); calcular(); }

    // ------------------------------------------------------------------ campos de parâmetro
    const CAMPOS = [
        { id: 'fck', chave: 'fck' },
        { id: 'sd', chave: 'sd' },
        { id: 'customS', chave: 'customS' },
        { id: 'idadePrev', chave: 'idadePrev' }
    ];
    function preencherCampos() {
        $('fck').value = paraCampo(estado.fck);
        $('sd').value = paraCampo(estado.sd);
        $('customS').value = paraCampo(estado.customS);
        $('idadePrev').value = paraCampo(estado.idadePrev);
        $('cimento').value = estado.cementType;
        $('modo').value = estado.analysisMode;
        $('autoDrop').checked = !!estado.autoDrop;
        $('campoS').hidden = estado.cementType !== 'custom';
    }
    function ligarCampos() {
        CAMPOS.forEach(({ id, chave }) => {
            const el = $(id);
            const commit = () => { estado[chave] = el.value; mudou(); };
            el.addEventListener('input', () => agendar(id, commit));
            // change/blur gravam já o valor do campo (mesmo sem input antes: autopreenchimento, colar)
            const agora = () => { cancelar(id); if (String(estado[chave]) !== el.value) commit(); };
            el.addEventListener('change', agora);
            el.addEventListener('blur', agora);
        });
        $('cimento').addEventListener('change', e => {
            estado.cementType = e.target.value;
            $('campoS').hidden = estado.cementType !== 'custom';
            mudou();
        });
        $('modo').addEventListener('change', e => { estado.analysisMode = e.target.value; mudou(); });
        $('autoDrop').addEventListener('change', e => { estado.autoDrop = e.target.checked; mudou(); });
    }

    function textoErro(msg) {
        return msg
            .replace('Parâmetro "FCK de Projeto"', 'O fck de projeto')
            .replace('Parâmetro "Desvio Padrão"', 'O desvio-padrão sd')
            .replace('Parâmetro "S Personalizado"', 'O s personalizado')
            .replace(/(\d)\.(\d)/g, '$1,$2')
            .replace(/no mínimo (\d+(?:,\d+)?)\./, 'no mínimo $1.')
            .replace(/no máximo (\d+(?:,\d+)?)\./, 'no máximo $1.');
    }
    function campoDoErro(msg) {
        if (msg.includes('FCK')) return 'fck';
        if (msg.includes('Desvio')) return 'sd';
        if (msg.includes('S Personalizado')) return 'customS';
        return null;
    }
    function renderErrosCampos() {
        ['fck', 'sd', 'customS'].forEach(id => { $(id).removeAttribute('aria-invalid'); $(id + 'Erro').textContent = ''; });
        if (!r || r.ok) return;
        const fckVazio = String(estado.fck).trim() === '';
        r.erros.forEach(e => {
            const id = campoDoErro(e);
            if (!id) return;
            if (id === 'fck' && fckVazio) {
                $('fckErro').textContent = estado.rows.length ? 'Informe o fck de projeto (10 a 150 MPa).' : '';
                if (estado.rows.length) $('fck').setAttribute('aria-invalid', 'true');
                return;
            }
            $(id).setAttribute('aria-invalid', 'true');
            $(id + 'Erro').textContent = textoErro(e);
            if (id === 'sd') $('avancadas').open = true;
        });
    }

    // ------------------------------------------------------------------ ensaios
    function ligarEnsaios() {
        $('formEnsaio').addEventListener('submit', e => {
            e.preventDefault();
            const v = C.validarLinha({ days: $('novaIdade').value, mpa: $('novaMpa').value });
            if (!v.ok) {
                $('formErro').textContent = 'Não adicionado: ' + v.motivo + '.';
                ($('novaIdade').value.trim() && Number.isFinite(C.paraNumero($('novaIdade').value)) ? $('novaMpa') : $('novaIdade')).focus();
                return;
            }
            $('formErro').textContent = '';
            const pos = estado.rows.findIndex(x => C.paraNumero(x.days) > v.days);
            estado.rows.splice(pos < 0 ? estado.rows.length : pos, 0, { days: v.days, mpa: v.mpa });
            $('novaMpa').value = '';
            $('novaIdade').value = '';
            listaSuja = true;
            mudou();
            $('novaIdade').focus();
        });

        const lista = $('listaEnsaios');
        lista.addEventListener('input', e => {
            const el = e.target;
            if (el.tagName !== 'INPUT') return;
            const i = Number(el.dataset.i), prop = el.dataset.prop;
            agendar(`linha${i}${prop}`, () => { if (estado.rows[i]) { estado.rows[i][prop] = el.value; mudou(); } });
        });
        lista.addEventListener('change', e => {
            const el = e.target;
            if (el.tagName !== 'INPUT') return;
            const i = Number(el.dataset.i), prop = el.dataset.prop;
            cancelar(`linha${i}${prop}`);
            if (estado.rows[i] && paraCampo(estado.rows[i][prop]) !== el.value) { estado.rows[i][prop] = el.value; mudou(); }
        });
        lista.addEventListener('click', e => {
            const b = e.target.closest('button[data-remover]');
            if (!b) return;
            executarTodos();
            const i = Number(b.dataset.remover);
            const [removida] = estado.rows.splice(i, 1);
            listaSuja = true;
            mudou();
            const idade = C.paraNumero(removida.days);
            mostrarToast(`Ensaio de ${Number.isFinite(idade) ? fd(idade) + ' d' : 'idade vazia'} removido.`, () => {
                estado.rows.splice(Math.min(i, estado.rows.length), 0, removida);
                listaSuja = true;
                mudou();
            });
        });

        $('btnCsv').addEventListener('click', () => $('arquivoCsv').click());
        $('arquivoCsv').addEventListener('change', e => {
            const arq = e.target.files && e.target.files[0];
            if (!arq) return;
            const leitor = new FileReader();
            leitor.onload = () => {
                const p = C.parseCsv(String(leitor.result || ''));
                const caixa = $('csvMsg');
                if (p.rows.length === 0) {
                    caixa.className = 'msg msg-erro';
                    caixa.innerHTML = `Nenhum ensaio lido de "${esc(arq.name)}". Formato: idade;resistência por linha.` + listaIgnoradas(p);
                } else {
                    estado.rows.push(...p.rows.map(x => ({ days: x.days, mpa: x.mpa })));   // C-07: acrescenta CPs brutos
                    listaSuja = true;
                    mudou();
                    caixa.className = p.ignoradas.length ? 'msg msg-atencao' : 'msg msg-ok';
                    caixa.innerHTML = `${p.lidas} linha(s) lida(s) de "${esc(arq.name)}": ${p.rows.length} importada(s), ${p.ignoradas.length} ignorada(s).` + listaIgnoradas(p);
                }
            };
            leitor.onerror = () => { $('csvMsg').className = 'msg msg-erro'; $('csvMsg').textContent = 'Não foi possível ler o arquivo.'; };
            leitor.readAsText(arq);
            e.target.value = '';
        });
    }
    function listaIgnoradas(p) {
        if (!p.ignoradas.length) return '';
        const itens = p.ignoradas.slice(0, 8).map(x => `<li>Linha ${x.linha}: ${esc(x.motivo)}</li>`).join('');
        return `<ul>${itens}${p.ignoradas.length > 8 ? `<li>… e mais ${p.ignoradas.length - 8}</li>` : ''}</ul>`;
    }

    const ICONE_LIXO = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>';
    function renderLista() {
        const lista = $('listaEnsaios');
        if (listaSuja) {
            lista.innerHTML = estado.rows.map((x, i) => `
                <li class="ensaio" data-i="${i}">
                    <div class="entrada"><input type="text" inputmode="decimal" autocomplete="off" data-i="${i}" data-prop="days" value="${esc(paraCampo(x.days))}" aria-label="Idade do ensaio ${i + 1} (dias)"><span class="unid">d</span></div>
                    <div class="entrada"><input type="text" inputmode="decimal" autocomplete="off" data-i="${i}" data-prop="mpa" value="${esc(paraCampo(x.mpa))}" aria-label="Resistência do ensaio ${i + 1} (MPa)"><span class="unid">MPa</span></div>
                    <button type="button" class="btn btn-icone" data-remover="${i}" aria-label="Remover ensaio ${i + 1}">${ICONE_LIXO}</button>
                    <div class="motivo" hidden></div>
                    <div class="marca-exc" hidden>Ignorado no ajuste (destoa do vizinho); continua no gráfico.</div>
                </li>`).join('');
            listaSuja = false;
        }
        $('listaVazia').hidden = estado.rows.length > 0;
        $('contagem').textContent = estado.rows.length ? `(${estado.rows.length})` : '';
        const linhas = r ? r.linhas : [];
        const excl = r && r.ok ? r.excluidos : [];
        lista.querySelectorAll('li.ensaio').forEach(li => {
            const l = linhas[Number(li.dataset.i)];
            const inval = l && l.status === 'invalida';
            li.classList.toggle('invalida', !!inval);
            li.querySelector('.motivo').hidden = !inval;
            li.querySelector('.motivo').textContent = inval ? `Fora do cálculo: ${l.motivo}.` : '';
            const exc = l && !inval && excl.includes(l.days);
            li.classList.toggle('excluido', !!exc);
            li.querySelector('.marca-exc').hidden = !exc;
        });
    }

    // ------------------------------------------------------------------ toast com desfazer (U-08)
    let toastTimer = null, toastDesfazer = null;
    function mostrarToast(texto, desfazer) {
        $('toastTexto').textContent = texto;
        toastDesfazer = desfazer || null;
        $('toastDesfazer').hidden = !desfazer;
        $('toast').hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { $('toast').hidden = true; toastDesfazer = null; }, 5000);
    }

    // ------------------------------------------------------------------ cartão de resultado
    function temPontos() { return r && r.ok && r.pontos.length > 0; }

    function descricaoBase() {
        const p = r.params;
        const nCP = r.pontos.reduce((a, x) => a + x.n, 0);
        const idades = r.pontos.map(x => x.days);
        const cim = p.cementType === 'custom' ? `s = ${fn(p.s_normative, 2)}` : NOMES_CIMENTO[p.cementType] || '';
        const partes = [
            `${nCP} CP${nCP > 1 ? 's' : ''} em ${idades.length} idade${idades.length > 1 ? 's' : ''} (até ${fd(Math.max(...idades))} d)`,
            `fck ${fd(p.fck)} MPa`, cim, `sd ${f1(p.sd)}${p.sdPadrao ? ' (padrão)' : ''}`
        ];
        if (p.analysisMode === 'normative') partes.push('forma da norma');
        if (r.excluidos.length) partes.push(`${r.excluidos.length} idade(s) ignorada(s) no ajuste: ${r.excluidos.map(fd).join(', ')} d`);
        return partes.join(' · ');
    }

    function textoSelo() {
        const s = r.selo;
        if (s.base === 'estimativa') return `${s.texto} o fck de ${fd(r.params.fck)} MPa (${sinal(r.estimada28 - r.params.fck)} MPa aos 28 d)`;
        return s.texto;
    }

    function renderCartao() {
        const vazio = $('resVazio'), erro = $('resErro'), cont = $('resConteudo');
        $('seloExemplo').hidden = !estado.exemplo;
        $('idadePrevErro').textContent = '';
        $('idadePrev').removeAttribute('aria-invalid');

        if (!r.ok) {
            const soFckVazio = String(estado.fck).trim() === '' && estado.rows.length === 0;
            cont.hidden = true;
            if (soFckVazio) {
                erro.hidden = true; vazio.hidden = false;
                $('resVazioTexto').textContent = 'Informe o fck de projeto e adicione o 1º ensaio para ver a estimativa.';
            } else {
                vazio.hidden = true; erro.hidden = false;
                const fckVazio = String(estado.fck).trim() === '';
                erro.innerHTML = '<b>Corrija os parâmetros para calcular:</b><ul>' + r.erros.map(e =>
                    `<li>${esc(fckVazio && campoDoErro(e) === 'fck' ? 'Informe o fck de projeto (10 a 150 MPa).' : textoErro(e))}</li>`).join('') + '</ul>';
            }
            $('resValor').textContent = '--'; $('resSelo').textContent = ''; $('resMotivo').textContent = '';   // C-02: nada de resultado velho
            $('resValidacao').hidden = true; $('resExtrap').hidden = true;
            return;
        }
        erro.hidden = true;
        if (!temPontos()) {
            cont.hidden = true; vazio.hidden = false;
            $('resVazioTexto').textContent = estado.rows.length
                ? 'Nenhum ensaio válido: corrija as linhas marcadas em vermelho.'
                : 'Adicione o 1º ensaio para ver a estimativa.';
            return;
        }
        vazio.hidden = true; cont.hidden = false;

        let prev = r.previsaoIdade;
        if (!prev) {
            if (String(estado.idadePrev).trim() !== '') {
                $('idadePrevErro').textContent = 'Idade inválida: mostrando 28 d.';
                $('idadePrev').setAttribute('aria-invalid', 'true');
            }
            prev = r.previsoes.find(x => x.t === 28) || C.preverEm(r.analise, 28);
        }
        $('resRotulo').textContent = `Resistência estimada conservadora aos ${fd(prev.t)} d`;
        $('resValor').innerHTML = `${f1(prev.estimada)}<small>MPa</small>`;
        const selo = $('resSelo');
        selo.className = 'selo selo-' + r.selo.codigo;
        selo.textContent = textoSelo();
        $('resMotivo').textContent = r.selo.base === 'estimativa' ? '' : r.selo.motivo;   // na estimativa o selo já diz o número
        $('resMotivo').hidden = r.selo.base === 'estimativa';
        $('resConfianca').innerHTML = `Confiança: <b>${esc(r.confianca.rotulo)}</b> · ${esc(r.confianca.motivo)}`;
        $('resBase').textContent = descricaoBase();
        $('resExtrap').hidden = !prev.extrapolacao;

        const v = r.validacao28, box = $('resValidacao');
        if (r.real28 === null) { box.hidden = true; }
        else if (!v.calculada) { box.hidden = false; box.textContent = `Comparação com o ensaio de 28 d: ${v.motivo}`; }
        else {
            box.hidden = false;
            box.innerHTML = `<b>Comparação com o ensaio de 28 d (validação sem ele):</b> com os ensaios até ${fd(Math.max(...v.idadesUsadas))} d, a previsão aos 28 d seria <b class="num">${f1(v.previsto28)} MPa</b>; o ensaio deu <b class="num">${f1(v.real28)} MPa</b>. Diferença: <b class="num">${sinal(v.erroPct)}%</b> (${v.classificacao}).`;
        }

        // resumo fixo no celular
        $('rfValor').textContent = `${f1(prev.estimada)} MPa aos ${fd(prev.t)} d`;
        $('rfSelo').className = 'selo selo-' + r.selo.codigo;
        $('rfSelo').textContent = r.selo.texto;
        $('rfBase').textContent = `confiança ${r.confianca.rotulo}`;
    }

    // ------------------------------------------------------------------ atenção aos dados (U-13)
    function avisoAmigavel(html) {
        let m = /^<b>Inconsistência de Monotonia:<\/b> A resistência aos (\S+) dias \((\S+) MPa\) é menor que a dos (\S+) dias \((\S+) MPa\)\.$/.exec(html);
        if (m) return `A resistência caiu com a idade: ${m[1]} d = ${m[2]} MPa, abaixo dos ${m[3]} d = ${m[4]} MPa.`.replace(/(\d)\.(\d)/g, '$1,$2');
        m = /^<b>Razão (\d+)d\/(\d+)d Incomum:<\/b> O valor de (\S+) está fora da banda dinâmica esperada \((\S+) a (\S+)\)\.$/.exec(html);
        if (m) return `O ensaio de ${m[1]} d ficou fora do esperado em relação ao de ${m[2]} d: razão ${m[3]} (esperado entre ${m[4]} e ${m[5]}).`.replace(/(\d)\.(\d)/g, '$1,$2');
        return html.replace(/<[^>]+>/g, '');
    }
    function renderAtencao() {
        const itens = [];
        if (r && r.ok) {
            r.avisos.filter(a => a.tipo !== 'regra_referencia').forEach(a => itens.push(a.texto));
            r.avisosDados.forEach(a => itens.push(avisoAmigavel(a)));
            if (r.excluidos.length) itens.push(`Ignorado no ajuste (destoa do vizinho): ${r.excluidos.map(fd).join(', ')} d. Continua no gráfico e na lista.`);
        } else if (r) {
            r.linhas.filter(l => l.status === 'invalida').forEach(l => itens.push(`Linha ${l.indice + 1} fora do cálculo: ${l.motivo}.`));
        }
        $('atencao').hidden = itens.length === 0;
        $('atContagem').textContent = itens.length ? `(${itens.length})` : '';
        $('atLista').innerHTML = itens.map(t => `<li>${esc(t)}</li>`).join('');
        $('atLista').style.paddingLeft = '28px';
    }

    // ------------------------------------------------------------------ detalhes técnicos + equações
    function latexNum(v, n) { return v.toFixed(n).replace('.', '{,}'); }
    function renderEq(el, tex) {
        if (window.katex) { try { window.katex.render(tex, el, { throwOnError: false, displayMode: true }); return; } catch (e) { /* cai no texto */ } }
        el.textContent = tex;
    }
    function renderDetalhes() {
        const sec = $('detalhes');
        if (!temPontos()) { sec.hidden = true; return; }
        sec.hidden = false;
        const a = r.analise, p = r.params;
        const comp = { mais_rapido: 'ganho mais rápido que a norma', mais_lento: 'ganho mais lento que a norma', equivalente: 'equivalente à norma' }[r.comparacaoS];
        const limitado = a.showPlausibleTrendCurve && a.fcm >= a.fcm_base - 1e-9;
        const p28 = r.previsoes.find(x => x.t === 28) || C.preverEm(a, 28);
        const linhas = [
            ['Ajuste da curva', p.analysisMode === 'normative' ? 'Manter a forma da norma' : 'Ajustar aos ensaios'],
            ['s do cimento (NBR 6118)', fn(p.s_normative, 3)],
            ['s usado na projeção', `${fn(a.s, 3)} (${comp})`],
            ['fcm alvo de dosagem (fck + 1,65·sd)', `${fn(a.fcm_base, 2)} MPa`],
            ['fcm da curva média ajustada (28 d)', `${fn(a.fcm, 2)} MPa${limitado ? ' (limitado ao alvo de dosagem)' : ''}`],
            ['Desconto do maior desvio abaixo', `${fn(a.offset, 2)} MPa`],
            ['Idades usadas no ajuste', r.pontosUsados.map(x => `${fd(x.days)} d`).join(', ') || '—']
        ];
        if (p28.plausivel !== null) linhas.push(['Tendência dos ensaios, dentro da faixa da norma (28 d)', `${f1(p28.plausivel)} MPa`]);
        if (p28.livre !== null) linhas.push(['Tendência dos ensaios, sem limite (28 d)', `${f1(p28.livre)} MPa`]);
        $('detTabela').innerHTML = linhas.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');

        const notas = [];
        if (r.mensagens.regraReferencia) notas.push(r.mensagens.regraReferencia);
        if (a.showPlausibleTrendCurve) notas.push(`Os ensaios indicam potencial ${f1(a.tendencySuperiority)}% acima do previsto pela norma aos 28 d; por segurança, a projeção conservadora não usa esse ganho.`);
        $('detNotas').innerHTML = notas.map(t => `<p class="msg msg-info">${esc(t)}</p>`).join('');

        const exp = s => `e^{${latexNum(s, 3)}\\left(1-\\sqrt{28/t}\\right)}`;
        renderEq($('eqRef'), `f_{cm,ref}(t) = ${latexNum(a.fcm_base, 2)}\\cdot ${exp(p.s_normative)}`);
        renderEq($('eqEst'), `f_{c,est}(t) = ${latexNum(a.fcm, 2)}\\cdot ${exp(a.s)} - ${latexNum(a.offset, 2)}`);
        $('eqTendBloco').hidden = !a.showPlausibleTrendCurve;
        if (a.showPlausibleTrendCurve) renderEq($('eqTend'), `f_{c,tend}(t) = ${latexNum(a.plausibleTrendFcm, 2)}\\cdot ${exp(a.plausibleTrendS)} - ${latexNum(a.plausibleTrendOffset, 2)}`);
        $('eqLivreBloco').hidden = !a.showFreeTrendCurve;
        if (a.showFreeTrendCurve) renderEq($('eqLivre'), `f_{c,livre}(t) = ${latexNum(a.freeTrendFcm, 2)}\\cdot ${exp(a.freeTrendS)} - ${latexNum(a.freeTrendOffset, 2)}`);
    }

    // ------------------------------------------------------------------ gráfico (U-14, C-06, C-16, D3)
    const pluginExtrap = {
        id: 'extrapolacao',
        beforeDatasetsDraw(chart, args, opts) {
            if (!opts || !opts.ativo) return;
            const { ctx, chartArea: ca, scales } = chart;
            const x28 = scales.x.getPixelForValue(28);
            if (!(x28 < ca.right)) return;
            ctx.save();
            ctx.fillStyle = opts.fundo;
            ctx.fillRect(x28, ca.top, ca.right - x28, ca.bottom - ca.top);
            ctx.fillStyle = opts.cor;
            ctx.font = '600 11px ' + cssVar('--font');
            ctx.textAlign = 'left';
            ctx.fillText('extrapolação:', x28 + 6, ca.bottom - 22);
            ctx.font = '11px ' + cssVar('--font');
            ctx.fillText('fora do escopo da NBR 6118', x28 + 6, ca.bottom - 8);
            ctx.restore();
        }
    };

    function iniciarGrafico() {
        if (typeof window.Chart === 'undefined') {
            mensagemGrafico('Gráfico indisponível: a biblioteca não carregou (sem conexão?). O cálculo continua valendo.');
            return;
        }
        const linha = (label, extra) => ({ label, data: [], type: 'line', borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 0, pointStyle: 'line', tension: 0, fill: false, ...extra });
        grafico = new window.Chart($('grafico').getContext('2d'), {
            type: 'line',
            data: { datasets: [
                linha('Curva esperada pela norma (NBR 6118)', { borderWidth: 2, borderDash: [5, 5] }),
                linha('Curva de projeção conservadora', { borderWidth: 3 }),
                linha('Tendência dos ensaios (dentro da faixa da norma)', { borderWidth: 2 }),
                linha('Tendência dos ensaios (sem limite)', { borderWidth: 1.5 }),
                { type: 'scatter', label: 'Ensaios (CPs)', data: [], pointRadius: 6, pointHoverRadius: 8, pointBorderWidth: 2, order: -1 },
                { type: 'scatter', label: 'Ignorado no ajuste', data: [], pointRadius: 7, pointHoverRadius: 9, pointBorderWidth: 2, pointStyle: 'rectRot', order: -1 }
            ] },
            plugins: [pluginExtrap],
            options: {
                responsive: true, maintainAspectRatio: false, animation: false,
                parsing: false, normalized: true,
                interaction: { mode: 'nearest', intersect: false },
                scales: {
                    x: { type: 'linear', min: 0, max: 90, title: { display: true, text: 'Idade (dias)' }, ticks: { stepSize: 7 } },
                    y: { beginAtZero: true, title: { display: true, text: 'Resistência (MPa)' } }
                },
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 10, padding: 12, font: { size: 12 },
                        filter: (item, data) => data.datasets[item.datasetIndex].data.length > 0 } },
                    tooltip: { callbacks: {
                        title: items => items.length ? `Idade: ${fd(items[0].parsed.x)} d` : '',
                        label: ctx => `${ctx.dataset.label}: ${fn(ctx.parsed.y, 1)} MPa`
                    } },
                    annotation: { annotations: {} },
                    extrapolacao: { ativo: false }
                }
            }
        });
    }
    function mensagemGrafico(texto) {
        const m = $('graficoMsg');
        m.hidden = !texto;
        m.querySelector('span').textContent = texto || '';
    }

    function curva(fcm, s, desconto) {
        return C.Calculator.generateCurveData(fcm, s).map(p => ({ x: p.x, y: Math.max(0, p.y - desconto) }));
    }
    function estiloLinha(ds, cor, tracoBase) {
        ds.borderColor = cor;
        ds.backgroundColor = cor;
        ds.segment = {
            borderColor: ctx => ctx.p0.parsed.x >= 28 ? comAlfa(cor, 0.4) : cor,
            borderDash: ctx => ctx.p0.parsed.x >= 28 ? [6, 4] : (tracoBase || [])
        };
    }

    function renderGrafico() {
        if (!grafico) return;
        const ds = grafico.data.datasets;
        const cores = {
            ref: cssVar('--chart-ref'), proj: cssVar('--chart-proj'), tend: cssVar('--chart-tend'), livre: cssVar('--chart-livre'),
            ensaio: cssVar('--chart-ensaio'), fck: cssVar('--chart-fck'), grade: cssVar('--chart-grid'), texto: cssVar('--ink-2'),
            superficie: cssVar('--surface'), extrap: cssVar('--chart-extrap'), aviso: cssVar('--warn-soft'), ink: cssVar('--ink')
        };
        ds.forEach(d => { d.data = []; });
        estiloLinha(ds[0], cores.ref, [5, 5]);
        estiloLinha(ds[1], cores.proj);
        estiloLinha(ds[2], cores.tend, [8, 3]);
        estiloLinha(ds[3], cores.livre, [2, 3]);
        ds[4].backgroundColor = cores.ensaio; ds[4].borderColor = cores.superficie;
        ds[5].backgroundColor = cores.superficie; ds[5].borderColor = cores.ensaio;

        const o = grafico.options;
        [o.scales.x, o.scales.y].forEach(ax => {
            ax.grid = { color: cores.grade };
            ax.ticks.color = cores.texto;
            ax.ticks.callback = v => Number(v).toLocaleString('pt-BR');
            ax.title.color = cores.texto;
        });
        o.plugins.legend.labels.color = cores.texto;
        const estreito = $('grafico').clientWidth < 520;
        o.scales.x.ticks.stepSize = estreito ? 14 : 7;
        o.plugins.legend.labels.font = { size: estreito ? 11 : 12 };
        o.plugins.legend.labels.padding = estreito ? 8 : 12;
        o.plugins.extrapolacao = { ativo: false, fundo: cores.extrap, cor: cores.texto };
        const anot = {};

        if (!r || !r.ok) {
            const inicio = String(estado.fck).trim() === '' && estado.rows.length === 0;
            mensagemGrafico(inicio ? 'Informe o fck de projeto para ver a curva esperada pela norma.' : 'Corrija os parâmetros para ver o gráfico.');
        } else {
            const a = r.analise;
            ds[0].data = curva(a.fcm_base, r.params.s_normative, 0);
            anot.fck = { type: 'line', display: true, yMin: r.params.fck, yMax: r.params.fck, borderColor: cores.fck, borderWidth: 2, borderDash: [10, 5],
                label: { enabled: true, content: `fck = ${fd(r.params.fck)} MPa`, position: 'start', backgroundColor: cores.aviso, color: cores.ink, font: { size: 12, weight: '600' } } };
            if (!temPontos()) {
                mensagemGrafico(estado.rows.length ? 'Nenhum ensaio válido para estimar.' : 'Adicione os resultados dos CPs para estimar.');
            } else {
                mensagemGrafico('');
                o.plugins.extrapolacao.ativo = true;
                ds[1].data = curva(a.fcm, a.s, a.offset);
                if (a.showPlausibleTrendCurve) ds[2].data = curva(a.plausibleTrendFcm, a.plausibleTrendS, a.plausibleTrendOffset);
                if (a.showFreeTrendCurve) ds[3].data = curva(a.freeTrendFcm, a.freeTrendS, a.freeTrendOffset);
                const validas = r.linhas.filter(l => l.status === 'ok');
                ds[4].data = validas.filter(l => !r.excluidos.includes(l.days)).map(l => ({ x: l.days, y: l.mpa }));
                ds[5].data = validas.filter(l => r.excluidos.includes(l.days)).map(l => ({ x: l.days, y: l.mpa }));
                if (r.real28 !== null) {   // C-06: só existe com ensaio real de 28 d
                    anot.real28 = { type: 'line', display: true, scaleID: 'x', value: 28, borderColor: comAlfa(cores.ensaio.startsWith('#') ? cores.ensaio : '#17212b', 0.35), borderWidth: 1.5, borderDash: [2, 3],
                        label: { enabled: true, content: `28 d real: ${f1(r.real28)} MPa`, position: 'end', backgroundColor: cores.superficie, color: cores.ink, font: { size: 11 } } };
                }
                const maxY = Math.max(r.params.fck, ...ds[4].data.map(p => p.y), ...ds[5].data.map(p => p.y), ...ds[1].data.map(p => p.y));
                o.scales.y.suggestedMax = Math.ceil(maxY * 1.1 / 5) * 5;
            }
        }
        o.plugins.annotation.annotations = anot;
        grafico.update('none');
    }

    // ------------------------------------------------------------------ relatório interpretativo
    function relatorioHtml() {
        const p = r.params, a = r.analise, s = r.selo;
        const classe = s.codigo === 'atende' ? 'ok' : s.codigo === 'nao_atende' ? 'ruim' : 'indicativo';
        let veredito;
        if (s.base === 'ensaio28') {
            veredito = `<b>${esc(s.texto)}.</b> ${esc(s.motivo)} A resistência estimada conservadora aos 28 d pelos ensaios é ${f1(r.estimada28)} MPa.`;
        } else if (s.base === 'estimativa') {
            veredito = s.codigo === 'atende'
                ? `<b>Atende.</b> A projeção indica que o lote deve atingir o fck de projeto aos 28 dias: resistência estimada conservadora de ${f1(r.estimada28)} MPa para fck = ${fd(p.fck)} MPa (folga estimada de ${f1(r.estimada28 - p.fck)} MPa).`
                : `<b>Não atende.</b> A projeção indica que o lote não deve atingir o fck de projeto aos 28 dias: resistência estimada conservadora de ${f1(r.estimada28)} MPa para fck = ${fd(p.fck)} MPa (falta estimada de ${f1(p.fck - r.estimada28)} MPa).`;
        } else {
            veredito = `<b>Indicativo (apenas sinal).</b> ${esc(s.motivo)}`;
        }
        const comp = { mais_rapido: '<b>mais rápido</b> que o previsto pela norma', mais_lento: '<b>mais lento</b> que o previsto pela norma', equivalente: '<b>equivalente</b> ao previsto pela norma' }[r.comparacaoS];
        const nivel = a.fcm >= a.fcm_base - 1e-9
            ? `os ensaios atingem ou superam o fcm alvo de dosagem (fck + 1,65·sd = ${f1(a.fcm_base)} MPa); por segurança, a projeção fica limitada a esse alvo`
            : `a curva média ajustada aos ensaios aos 28 d (${f1(a.fcm)} MPa) está <b>abaixo</b> do fcm alvo de dosagem (fck + 1,65·sd = ${f1(a.fcm_base)} MPa)`;
        const avisos = [...r.avisos.filter(x => x.tipo !== 'regra_referencia').map(x => x.texto), ...r.avisosDados.map(avisoAmigavel)];
        if (r.excluidos.length) avisos.push(`Ignorado no ajuste: ${r.excluidos.map(fd).join(', ')} d.`);
        const v = r.validacao28;

        let h = `<div class="rel-veredito ${classe}">${veredito}</div>`;
        h += `<h4>Base da estimativa</h4><ul>
            <li>Confiança: ${esc(r.confianca.rotulo)}. ${esc(r.confianca.motivo)}</li>
            <li>${esc(descricaoBase())}</li>
            ${v.calculada ? `<li>Comparação com o ensaio de 28 d (validação sem ele): previsão ${f1(v.previsto28)} MPa; ensaio ${f1(v.real28)} MPa; diferença ${sinal(v.erroPct)}% (${v.classificacao}).</li>` : ''}
        </ul>`;
        if (avisos.length) h += `<h4>Atenção aos dados</h4><ul>${avisos.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
        h += `<h4>Desempenho observado</h4><ul>
            <li><b>Velocidade de ganho (s = ${fn(a.s, 3)}; norma ${fn(p.s_normative, 3)}):</b> o ganho de resistência está ${comp}.</li>
            <li><b>Nível de resistência:</b> ${nivel}.</li>
            ${r.mensagens.regraReferencia ? `<li>${esc(r.mensagens.regraReferencia)}</li>` : ''}
        </ul>`;
        if (s.codigo !== 'atende') {
            h += `<h4>Possíveis causas a investigar</h4><ul>
                <li><b>Nível baixo (fcm):</b> relação água/cimento elevada; consumo de cimento abaixo do especificado; erro na pesagem dos materiais; qualidade dos agregados.</li>
                <li><b>Velocidade e nível (s e fcm):</b> qualidade do cimento; temperatura; cura inadequada; falhas de execução.</li>
                <li><b>Ensaio:</b> não conformidades na moldagem, cura e rompimento dos corpos de prova (NBR 5738 e NBR 5739).</li>
            </ul>
            <h4>Recomendações</h4><ul>
                <li><b>Ação imediata:</b> verificar os registros de dosagem e os relatórios de controle da central de concreto.</li>
                <li><b>Investigação:</b> inspecionar as condições de cura na estrutura e continuar o acompanhamento com ensaios em idades seguintes.</li>
                <li><b>Análise estrutural:</b> comunicar o projetista para avaliar a necessidade de ensaios complementares e as implicações para segurança e durabilidade.</li>
            </ul>`;
        } else {
            h += `<h4>Recomendações</h4><ul>
                <li>Manter o plano de controle tecnológico e os procedimentos de execução.</li>
                <li>Confirmar com o ensaio de 28 d: a projeção é apoio à decisão e não substitui o controle por ensaio.</li>
            </ul>`;
        }
        h += `<p class="res-base">Estimativa fck v${VERSAO} · curva β1 da NBR 6118 · projeção conservadora = curva média ajustada menos o maior desvio abaixo (não é o fck estatístico da NBR 12655).</p>`;
        return h;
    }

    let abridorModal = null;
    function ligarModal() {
        const dlg = $('modalRelatorio');
        $('btnRelatorio').addEventListener('click', e => {
            executarTodos();
            if (!temPontos()) { msgAcoes('Sem resultado válido para o relatório.', 'erro'); return; }
            $('relatorioConteudo').innerHTML = relatorioHtml();
            abridorModal = e.currentTarget;
            if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
            $('fecharRelatorio').focus();
        });
        $('fecharRelatorio').addEventListener('click', () => fecharModal());
        dlg.addEventListener('click', e => { if (e.target === dlg) fecharModal(); });   // clique fora
        dlg.addEventListener('close', () => { if (abridorModal) abridorModal.focus(); });
        dlg.addEventListener('keydown', e => { if (e.key === 'Escape' && typeof dlg.showModal !== 'function') fecharModal(); });
    }
    function fecharModal() {
        const dlg = $('modalRelatorio');
        if (typeof dlg.close === 'function') dlg.close(); else { dlg.removeAttribute('open'); if (abridorModal) abridorModal.focus(); }
    }
    function msgAcoes(texto, tipo) {
        const m = $('acoesMsg');
        m.className = texto ? `msg msg-${tipo || 'info'}` : '';
        m.textContent = texto || '';
    }

    // ------------------------------------------------------------------ PDF (refeito no M4; aqui com os novos rótulos)
    async function exportarPdf() {
        executarTodos();
        if (!temPontos()) { msgAcoes('Sem resultado válido para exportar.', 'erro'); return; }
        if (!window.jspdf || !window.html2canvas) { msgAcoes('PDF indisponível: as bibliotecas não carregaram (sem conexão?).', 'erro'); return; }
        const btn = $('btnPdf');
        btn.disabled = true; btn.textContent = 'Gerando PDF…';
        msgAcoes('');
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const p = r.params, a = r.analise;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
            doc.text('Estimativa fck - relatório', 105, 15, { align: 'center' });
            doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
            doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')} · Estimativa fck v${VERSAO}`, 14, 23);
            doc.line(14, 25, 196, 25);
            doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.text(`Resistência estimada conservadora aos 28 d: ${f1(r.estimada28)} MPa  ·  ${r.selo.texto}`, 14, 32);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
            doc.text(doc.splitTextToSize(`Confiança: ${r.confianca.rotulo}. ${r.confianca.motivo}`, 182), 14, 38);
            doc.text(`fck de projeto: ${fd(p.fck)} MPa · sd: ${f1(p.sd)} MPa${p.sdPadrao ? ' (padrão)' : ''} · cimento: ${NOMES_CIMENTO[p.cementType] || ''} · s = ${fn(p.s_normative, 3)}`, 14, 48);

            const canvas = await window.html2canvas($('captureArea'), { scale: 2.5, backgroundColor: cssVar('--surface') || '#ffffff' });
            const img = canvas.toDataURL('image/png');
            const largura = 182, topo = 54, maxAlt = 120;
            let w = largura, hgt = w * canvas.height / canvas.width;
            if (hgt > maxAlt) { hgt = maxAlt; w = hgt * canvas.width / canvas.height; }
            doc.addImage(img, 'PNG', 14 + (largura - w) / 2, topo, w, hgt);
            let y = topo + hgt + 10;

            doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
            doc.text('Equações', 14, y);
            const exp = s => `e^{${latexNum(s, 3)}\\left(1-\\sqrt{28/t}\\right)}`;
            y = await katexNoPdf(doc, `f_{cm,ref}(t) = ${latexNum(a.fcm_base, 2)}\\cdot ${exp(p.s_normative)}`, 14, y + 10, 'Curva esperada pela norma (NBR 6118):');
            y = await katexNoPdf(doc, `f_{c,est}(t) = ${latexNum(a.fcm, 2)}\\cdot ${exp(a.s)} - ${latexNum(a.offset, 2)}`, 14, y, 'Curva de projeção conservadora:');

            doc.addPage();
            doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
            doc.text('Relatório interpretativo', 105, 15, { align: 'center' });
            htmlNoPdf(doc, relatorioHtml(), 14, 25);
            doc.save(`estimativa-fck-${dataLocal()}.pdf`);
            msgAcoes('PDF gerado.', 'ok');
        } catch (err) {
            console.error('Erro ao gerar PDF:', err);
            msgAcoes('Ocorreu um erro ao gerar o PDF.', 'erro');
        } finally {
            btn.textContent = 'Exportar PDF';
            btn.disabled = !temPontos();
        }
    }
    async function katexNoPdf(doc, tex, x, y, titulo) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.text(titulo, x, y - 4);
        if (!window.katex) { doc.setFont('helvetica', 'normal'); doc.text(tex, x, y + 2); return y + 12; }
        const div = document.createElement('div');
        Object.assign(div.style, { position: 'absolute', left: '-9999px', background: '#ffffff', color: '#000000', display: 'inline-block', lineHeight: '1', padding: '0' });
        document.body.appendChild(div);
        window.katex.render(tex, div, { throwOnError: false, displayMode: true });
        await new Promise(res => setTimeout(res, 100));
        const cv = await window.html2canvas(div, { scale: 3, backgroundColor: null });
        const w = cv.width / 11.8, hgt = cv.height / 11.8;
        doc.addImage(cv.toDataURL('image/png'), 'PNG', x, y, w, hgt);
        document.body.removeChild(div);
        return y + hgt + 8;
    }
    function htmlNoPdf(doc, html, x0, y0) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        let y = y0;
        const alturaPag = doc.internal.pageSize.height, margem = 20;
        const quebra = n => { if (y + n > alturaPag - margem) { doc.addPage(); y = 15; } };
        for (const el of Array.from(tmp.children)) {
            const texto = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (el.tagName === 'H4') {
                quebra(12); y += 6;
                doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
                doc.text(doc.splitTextToSize(texto, 182), x0, y); y += 7;
            } else if (el.tagName === 'P') {
                doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
                const l = doc.splitTextToSize(texto, 182); quebra(l.length * 4.5);
                doc.text(l, x0, y); y += l.length * 4.5 + 2;
            } else if (el.tagName === 'UL') {
                doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
                for (const li of Array.from(el.querySelectorAll('li'))) {
                    const l = doc.splitTextToSize(li.textContent.replace(/\s+/g, ' ').trim(), 176);
                    quebra(l.length * 4.5);
                    doc.text('•', x0, y);
                    doc.text(l, x0 + 4, y);
                    y += l.length * 4.5 + 1;
                }
                y += 3;
            } else if (el.tagName === 'DIV') {
                doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
                const ok = el.classList.contains('ok'), ruim = el.classList.contains('ruim');
                const l = doc.splitTextToSize(texto, 176);
                const alt = l.length * 4.5 + 6;
                quebra(alt);
                doc.setDrawColor(ok ? '#9fd8b4' : ruim ? '#f1b0aa' : '#f0d58a');
                doc.setFillColor(ok ? '#e4f4ea' : ruim ? '#fdecea' : '#fff4dc');
                doc.rect(x0, y - 4, 182, alt, 'FD');
                doc.text(l, x0 + 3, y + 1);
                y += alt + 2;
            }
        }
    }

    // ------------------------------------------------------------------ ajudas tocáveis (U-16)
    function ligarAjudas() {
        document.addEventListener('click', e => {
            const b = e.target.closest('button.info');
            document.querySelectorAll('button.info[aria-expanded="true"]').forEach(x => {
                if (x !== b) { x.setAttribute('aria-expanded', 'false'); $(x.getAttribute('aria-controls')).hidden = true; }
            });
            if (b) {
                const aberto = b.getAttribute('aria-expanded') === 'true';
                b.setAttribute('aria-expanded', String(!aberto));
                $(b.getAttribute('aria-controls')).hidden = aberto;
            }
        });
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            document.querySelectorAll('button.info[aria-expanded="true"]').forEach(x => {
                x.setAttribute('aria-expanded', 'false'); $(x.getAttribute('aria-controls')).hidden = true; x.focus();
            });
        });
    }

    // ------------------------------------------------------------------ exemplo / novo lote
    function aplicarEstado(novo) {
        timers.forEach(t => clearTimeout(t)); timers.clear(); pendentes.clear();
        estado = clonar(novo);
        listaSuja = true;
        preencherCampos();
        $('csvMsg').className = ''; $('csvMsg').textContent = '';
        $('formErro').textContent = '';
        msgAcoes('');
        salvar();
        calcular();
    }
    function ligarTopo() {
        const exemplo = () => {
            const antes = clonar(estado);
            aplicarEstado(EXEMPLO);
            if (antes.rows.length) mostrarToast('Exemplo carregado (C45, CP V-ARI, 3/7/14 d).', () => aplicarEstado(antes));
        };
        $('btnExemplo').addEventListener('click', exemplo);
        $('btnExemplo2').addEventListener('click', exemplo);
        $('btnNovo').addEventListener('click', () => {
            const antes = clonar(estado);
            aplicarEstado(PADRAO);
            mostrarToast('Lote limpo.', () => aplicarEstado(antes));
            $('fck').focus();
        });
        $('toastDesfazer').addEventListener('click', () => {
            const f = toastDesfazer;
            $('toast').hidden = true; toastDesfazer = null; clearTimeout(toastTimer);
            if (f) f();
        });
        $('btnPdf').addEventListener('click', exportarPdf);
    }

    // ------------------------------------------------------------------ render geral
    function render() {
        renderErrosCampos();
        renderLista();
        renderCartao();
        renderAtencao();
        renderDetalhes();
        renderGrafico();
        const pode = temPontos();
        $('btnRelatorio').disabled = !pode;     // C-02/C-03/U-01
        $('btnPdf').disabled = !pode;
        if (!pode) msgAcoes('');
        $('resumoFixo').hidden = !pode;
    }

    function iniciar() {
        if (!C || typeof C.analyze !== 'function') {
            document.body.insertAdjacentHTML('afterbegin', '<p class="msg msg-erro">Falha ao carregar js/calc.js.</p>');
            return;
        }
        carregar();
        preencherCampos();
        ligarCampos();
        ligarEnsaios();
        ligarModal();
        ligarAjudas();
        ligarTopo();
        iniciarGrafico();
        const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
        if (mq && mq.addEventListener) mq.addEventListener('change', () => renderGrafico());
        calcular();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

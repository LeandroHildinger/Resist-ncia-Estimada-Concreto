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
    const VERSAO = self.ESTIMATIVA_VERSAO || '2.0';   // js/versao.js (A3-03)

    const PADRAO = { fck: '', sd: '', cementType: '0.25', customS: '0,25', analysisMode: 'adjusted', autoDrop: false, rows: [], idadePrev: '28', alvo: '', exemplo: false,
        ident: { obra: '', elemento: '', lote: '', laboratorio: '', responsavel: '' } };
    const EXEMPLO = { fck: '45', sd: '4,0', cementType: '0.20', customS: '0,25', analysisMode: 'adjusted', autoDrop: false,
        rows: [{ days: 3, mpa: 30 }, { days: 7, mpa: 38 }, { days: 14, mpa: 44 }], idadePrev: '28', alvo: '', exemplo: true,
        ident: { obra: 'Exemplo', elemento: '', lote: 'C45 CP V-ARI', laboratorio: '', responsavel: '' } };
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
            // A3-10: cada chave só é aceita com o tipo e os valores esperados; senão fica o padrão.
            const texto = v => typeof v === 'number' ? String(v).replace('.', ',') : (typeof v === 'string' ? v : null);
            ['fck', 'sd', 'customS', 'idadePrev', 'alvo'].forEach(k => { const t = texto(o[k]); if (t !== null) novo[k] = t; });
            if (['0.25', '0.38', '0.20', 'custom'].includes(String(o.cementType))) novo.cementType = String(o.cementType);
            else if (Number(o.cementType) === 0.2) novo.cementType = '0.20';
            if (['adjusted', 'normative'].includes(o.analysisMode)) novo.analysisMode = o.analysisMode;
            if (typeof o.autoDrop === 'boolean') novo.autoDrop = o.autoDrop;
            if (typeof o.exemplo === 'boolean') novo.exemplo = o.exemplo;
            if (Array.isArray(o.rows)) novo.rows = o.rows;
            if (!Array.isArray(novo.rows)) novo.rows = [];
            novo.rows = novo.rows.filter(x => x && typeof x === 'object').map(x => ({ days: x.days, mpa: x.mpa }));
            const id = (o.ident && typeof o.ident === 'object') ? o.ident : {};
            novo.ident = {};
            Object.keys(PADRAO.ident).forEach(k => { novo.ident[k] = typeof id[k] === 'string' ? id[k] : ''; });
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
            idadePrevisao: paramNum(estado.idadePrev),
            resistenciaAlvo: paramNum(estado.alvo)   // pergunta inversa (vazio = não pedido)
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
        { id: 'idadePrev', chave: 'idadePrev' },
        { id: 'alvo', chave: 'alvo' }
    ];
    function preencherCampos() {
        $('fck').value = paraCampo(estado.fck);
        $('sd').value = paraCampo(estado.sd);
        $('customS').value = paraCampo(estado.customS);
        $('idadePrev').value = paraCampo(estado.idadePrev);
        $('alvo').value = paraCampo(estado.alvo);
        $('cimento').value = estado.cementType;
        $('modo').value = estado.analysisMode;
        $('autoDrop').checked = !!estado.autoDrop;
        $('campoS').hidden = estado.cementType !== 'custom';
        Object.keys(PADRAO.ident).forEach(k => { $('id_' + k).value = (estado.ident && estado.ident[k]) || ''; });
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
        // Identificação: só vai para o PDF; não recalcula.
        Object.keys(PADRAO.ident).forEach(k => {
            $('id_' + k).addEventListener('input', e => { estado.ident = estado.ident || {}; estado.ident[k] = e.target.value; salvar(); });
        });
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
        const itens = p.ignoradas.slice(0, 8).map(x => `<li>Linha ${x.linha} do arquivo: ${esc(x.motivo)}</li>`).join('');
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

        renderAlvo();

        // resumo fixo no celular
        $('rfValor').textContent = `${f1(prev.estimada)} MPa aos ${fd(prev.t)} d${prev.extrapolacao ? ' (extrapolação)' : ''}`;
        $('rfSelo').className = 'selo selo-' + r.selo.codigo;
        $('rfSelo').textContent = r.selo.texto;
        $('rfBase').textContent = `confiança ${r.confianca.rotulo}`;
    }

    // ------------------------------------------------------------------ pergunta inversa: dia da resistência-alvo
    // Textos únicos para cartão, relatório e PDF. null quando o alvo não foi pedido ou é inválido.
    function textoAlvo() {
        const x = r && r.ok ? r.alvo : null;
        if (!x || !x.valido) return null;
        const R = `${f1(x.alvo)} MPa`;
        if (x.naoAtinge) {
            return { resposta: 'Não atinge', aviso: null,
                detalhe: `A projeção conservadora não chega a ${R} em nenhuma idade: a curva tende a ${f1(x.assintota)} MPa.` };
        }
        let detalhe = `A projeção conservadora chega a ${R} aos ${fn(x.dia, 1)} d (dia arredondado para cima).`;
        if (x.jaAtingido) detalhe += ` Pela projeção, o alvo já foi alcançado até o ensaio mais recente (${fd(x.maiorIdade)} d).`;
        if (x.diaInteiro > 90) detalhe += ' Fora do gráfico (vai até 90 d).';
        if (r.confianca.nivel === 'baixa') detalhe += ` Confiança ${r.confianca.rotulo}: use como indicação e confirme com novo ensaio.`;
        return { resposta: `≈ dia ${x.diaInteiro.toLocaleString('pt-BR')}`, detalhe,
            aviso: x.extrapolacao ? 'Dia acima de 28 d: extrapolação, fora do escopo da NBR 6118. O ganho depois dos 28 d depende de cura e umidade e não é garantido.' : null };
    }
    function renderAlvo() {
        const x = r.alvo, t = textoAlvo();
        const vazioAlvo = String(estado.alvo == null ? '' : estado.alvo).trim() === '';
        const invalido = !vazioAlvo && x && !x.valido;
        $('alvoErro').textContent = invalido ? 'Informe uma resistência maior que 0 (ex.: 35 ou 32,5).' : '';
        if (invalido) $('alvo').setAttribute('aria-invalid', 'true'); else $('alvo').removeAttribute('aria-invalid');
        $('alvoResp').hidden = !t;
        $('alvoResp').innerHTML = t ? `<span class="alvo-dia num">${esc(t.resposta)}</span>${esc(t.detalhe)}` : '';
        $('alvoExtrap').hidden = !(t && t.aviso);
    }

    // ------------------------------------------------------------------ atenção aos dados (U-13)
    function avisoAmigavel(html) {
        let m = /^<b>Inconsistência de Monotonia:<\/b> A resistência aos (\S+) dias \((\S+) MPa\) é menor que a dos (\S+) dias \((\S+) MPa\)\.$/.exec(html);
        if (m) return `A resistência caiu com a idade: ${m[1]} d = ${m[2]} MPa, abaixo dos ${m[3]} d = ${m[4]} MPa.`.replace(/(\d)\.(\d)/g, '$1,$2');
        m = /^<b>Razão (\d+)d\/(\d+)d Incomum:<\/b> O valor de (\S+) está fora da banda dinâmica esperada \((\S+) a (\S+)\)\.$/.exec(html);
        if (m) return `O ensaio de ${m[1]} d ficou fora do esperado em relação ao de ${m[2]} d: razão ${m[3]} (esperado entre ${m[4]} e ${m[5]}).`.replace(/(\d)\.(\d)/g, '$1,$2');
        return html.replace(/<[^>]+>/g, '');
    }
    // A3-08: na tela a numeração é a da lista de ensaios (a do CSV é "linha do arquivo").
    function textoAviso(a) { return a.tipo === 'linha_invalida' ? a.texto.replace(/^Linha (\d+)/, 'Ensaio nº $1') : a.texto; }
    function renderAtencao() {
        const itens = [];
        if (r && r.ok) {
            r.avisos.filter(a => a.tipo !== 'regra_referencia').forEach(a => itens.push(textoAviso(a)));
            r.avisosDados.forEach(a => itens.push(avisoAmigavel(a)));
            if (r.excluidos.length) itens.push(`Ignorado no ajuste (destoa do vizinho): ${r.excluidos.map(fd).join(', ')} d. Continua no gráfico e na lista.`);
        } else if (r) {
            r.linhas.filter(l => l.status === 'invalida').forEach(l => itens.push(`Ensaio nº ${l.indice + 1} fora do cálculo: ${l.motivo}.`));
        }
        $('atencao').hidden = itens.length === 0;
        $('atContagem').textContent = itens.length ? `(${itens.length})` : '';
        $('atLista').innerHTML = itens.map(t => `<li>${esc(t)}</li>`).join('');
        $('atLista').style.paddingLeft = '28px';
    }

    // ------------------------------------------------------------------ detalhes técnicos + equações
    // Equações em HTML simples (sem KaTeX: uma dependência e ~60 arquivos de fonte a menos para o offline).
    function eqHtml(nome, fcm, sv, desconto) {
        return `<span class="eq">f<sub>${nome}</sub>(t) = ${fn(fcm, 2)} · e<sup>${fn(sv, 3)} · (1 − √(28/t))</sup>${desconto === null ? '' : ` − ${fn(desconto, 2)}`}</span>`;
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

        $('eqRef').innerHTML = eqHtml('cm,ref', a.fcm_base, p.s_normative, null);
        $('eqEst').innerHTML = eqHtml('proj', a.fcm, a.s, a.offset);
        $('eqTendBloco').hidden = !a.showPlausibleTrendCurve;
        if (a.showPlausibleTrendCurve) $('eqTend').innerHTML = eqHtml('tend', a.plausibleTrendFcm, a.plausibleTrendS, a.plausibleTrendOffset);
        $('eqLivreBloco').hidden = !a.showFreeTrendCurve;
        if (a.showFreeTrendCurve) $('eqLivre').innerHTML = eqHtml('livre', a.freeTrendFcm, a.freeTrendS, a.freeTrendOffset);
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
            const t = 11 * (opts.escala || 1);
            ctx.font = `600 ${t}px ` + (cssVar('--font') || 'sans-serif');
            ctx.textAlign = 'left';
            ctx.fillText('extrapolação:', x28 + 6, ca.bottom - 2 * t);
            ctx.font = `${t}px ` + (cssVar('--font') || 'sans-serif');
            ctx.fillText('fora do escopo da NBR 6118', x28 + 6, ca.bottom - 0.7 * t);
            ctx.restore();
        }
    };

    // Fundo opaco (usado no gráfico do PDF).
    const pluginFundo = {
        id: 'fundo',
        beforeDraw(chart, args, opts) {
            if (!opts || !opts.cor) return;
            const { ctx, width, height } = chart;
            ctx.save(); ctx.fillStyle = opts.cor; ctx.fillRect(0, 0, width, height); ctx.restore();
        }
    };

    function iniciarGrafico() {
        if (typeof window.Chart === 'undefined') {
            mensagemGrafico('Gráfico indisponível: a biblioteca não carregou (sem conexão?). O cálculo continua valendo.');
            return;
        }
        grafico = novoGrafico($('grafico'), true);
    }
    function novoGrafico(canvas, responsivo) {
        const linha = (label, extra) => ({ label, data: [], type: 'line', borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 0, pointStyle: 'line', tension: 0, fill: false, ...extra });
        return new window.Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { datasets: [
                linha('Curva esperada pela norma (NBR 6118)', { borderWidth: 2, borderDash: [5, 5] }),
                linha('Curva de projeção conservadora', { borderWidth: 3 }),
                linha('Tendência dos ensaios (dentro da faixa da norma)', { borderWidth: 2 }),
                linha('Tendência dos ensaios (sem limite)', { borderWidth: 1.5 }),
                { type: 'scatter', label: 'Ensaios (CPs)', data: [], pointRadius: 6, pointHoverRadius: 8, pointBorderWidth: 2, order: -1 },
                { type: 'scatter', label: 'Ignorado no ajuste', data: [], pointRadius: 7, pointHoverRadius: 9, pointBorderWidth: 2, pointStyle: 'rectRot', order: -1 }
            ] },
            plugins: [pluginExtrap, pluginFundo],
            options: {
                responsive: responsivo, maintainAspectRatio: false, animation: false, devicePixelRatio: responsivo ? undefined : 1,
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

    function coresTela() {
        return {
            ref: cssVar('--chart-ref'), proj: cssVar('--chart-proj'), tend: cssVar('--chart-tend'), livre: cssVar('--chart-livre'),
            ensaio: cssVar('--chart-ensaio'), fck: cssVar('--chart-fck'), grade: cssVar('--chart-grid'), texto: cssVar('--ink-2'),
            superficie: cssVar('--surface'), extrap: cssVar('--chart-extrap'), aviso: cssVar('--warn-soft'), ink: cssVar('--ink'),
            alvo: cssVar('--chart-alvo')
        };
    }
    // Paleta fixa do tema claro para o gráfico do PDF (independe do tema da tela).
    const CORES_PDF = { ref: '#8794a1', proj: '#0f4c5c', tend: '#2f8f6b', livre: '#7a4fb5', ensaio: '#17212b', fck: '#b26b00',
        grade: 'rgba(23, 33, 43, 0.10)', texto: '#4a5866', superficie: '#ffffff', extrap: 'rgba(23, 33, 43, 0.05)', aviso: '#fff4dc', ink: '#17212b',
        alvo: '#b4235a' };

    function renderGrafico() {
        if (!grafico) return;
        const msg = pintarGrafico(grafico, coresTela(), $('grafico').clientWidth < 520, 1);
        mensagemGrafico(msg);
        grafico.update('none');
    }

    // Preenche um gráfico com o resultado atual; devolve a mensagem de estado ('' quando há curva).
    function pintarGrafico(chart, cores, estreito, escala) {
        let msg = '';
        const fs = n => ({ size: Math.round(n * escala) });
        const ds = chart.data.datasets;
        ds.forEach(d => { d.data = []; });
        estiloLinha(ds[0], cores.ref, [5, 5]);
        estiloLinha(ds[1], cores.proj);
        estiloLinha(ds[2], cores.tend, [8, 3]);
        estiloLinha(ds[3], cores.livre, [2, 3]);
        ds[4].backgroundColor = cores.ensaio; ds[4].borderColor = cores.superficie;
        ds[5].backgroundColor = cores.superficie; ds[5].borderColor = cores.ensaio;

        const o = chart.options;
        [o.scales.x, o.scales.y].forEach(ax => {
            ax.grid = { color: cores.grade };
            ax.ticks.color = cores.texto;
            ax.ticks.font = fs(12);
            ax.ticks.callback = v => Number(v).toLocaleString('pt-BR');
            ax.title.color = cores.texto;
            ax.title.font = fs(12);
        });
        o.plugins.legend.labels.color = cores.texto;
        o.scales.x.ticks.stepSize = estreito ? 14 : 7;
        o.plugins.legend.labels.font = fs(estreito ? 11 : 12);
        o.plugins.legend.labels.padding = Math.round((estreito ? 8 : 12) * escala);
        o.plugins.legend.labels.boxWidth = Math.round(10 * escala);
        o.plugins.extrapolacao = { ativo: false, fundo: cores.extrap, cor: cores.texto, escala };
        o.plugins.fundo = { cor: escala > 1 ? cores.superficie : null };
        ds.forEach(d => {
            if (d.type === 'scatter') { d.pointRadius = (d.pointStyle === 'rectRot' ? 7 : 6) * escala; d.pointBorderWidth = 2 * escala; }
            else { if (!d.larguraBase) d.larguraBase = d.borderWidth; d.borderWidth = d.larguraBase * escala; }
        });
        const anot = {};

        if (!r || !r.ok) {
            const inicio = String(estado.fck).trim() === '' && estado.rows.length === 0;
            msg = inicio ? 'Informe o fck de projeto para ver a curva esperada pela norma.' : 'Corrija os parâmetros para ver o gráfico.';
        } else {
            const a = r.analise;
            ds[0].data = curva(a.fcm_base, r.params.s_normative, 0);
            anot.fck = { type: 'line', display: true, yMin: r.params.fck, yMax: r.params.fck, borderColor: cores.fck, borderWidth: 2, borderDash: [10, 5],
                drawTime: 'beforeDatasetsDraw',   // A3-02: ensaios desenhados por cima da linha e do rótulo
                label: { enabled: true, content: `fck = ${fd(r.params.fck)} MPa`, position: 'end', backgroundColor: cores.aviso, color: cores.ink, font: { size: Math.round(12 * escala), weight: '600' } } };
            if (!temPontos()) {
                msg = estado.rows.length ? 'Nenhum ensaio válido para estimar.' : 'Adicione os resultados dos CPs para estimar.';
            } else {
                o.plugins.extrapolacao.ativo = true;
                ds[1].data = curva(a.fcm, a.s, a.offset);
                if (a.showPlausibleTrendCurve) ds[2].data = curva(a.plausibleTrendFcm, a.plausibleTrendS, a.plausibleTrendOffset);
                if (a.showFreeTrendCurve) ds[3].data = curva(a.freeTrendFcm, a.freeTrendS, a.freeTrendOffset);
                const validas = r.linhas.filter(l => l.status === 'ok');
                ds[4].data = validas.filter(l => !r.excluidos.includes(l.days)).map(l => ({ x: l.days, y: l.mpa }));
                ds[5].data = validas.filter(l => r.excluidos.includes(l.days)).map(l => ({ x: l.days, y: l.mpa }));
                if (r.real28 !== null) {   // C-06: só existe com ensaio real de 28 d
                    anot.real28 = { type: 'line', display: true, scaleID: 'x', value: 28, borderColor: comAlfa(cores.ensaio.startsWith('#') ? cores.ensaio : '#17212b', 0.35), borderWidth: 1.5, borderDash: [2, 3],
                        label: { enabled: true, content: `28 d real: ${f1(r.real28)} MPa`, position: 'start', backgroundColor: cores.superficie, color: cores.ink, font: { size: Math.round(11 * escala) } } };
                }
                const x = r.alvo && r.alvo.valido ? r.alvo : null;
                if (x) {   // pergunta inversa: linha do alvo e marca do cruzamento com a projeção conservadora
                    // rótulo do alvo à direita ('start' cobriria a curva e os ensaios); no centro se colar no do fck
                    anot.alvo = { type: 'line', display: true, yMin: x.alvo, yMax: x.alvo, borderColor: cores.alvo, borderWidth: 2, borderDash: [4, 4],
                        drawTime: 'beforeDatasetsDraw',
                        label: { enabled: true, content: `alvo ${f1(x.alvo)} MPa`, position: Math.abs(x.alvo - r.params.fck) < 4 ? 'center' : 'end', backgroundColor: cores.superficie, color: cores.alvo, font: { size: Math.round(11 * escala), weight: '600' } } };
                    if (!x.naoAtinge && x.dia <= 90) {
                        anot.alvoDia = { type: 'line', display: true, xMin: x.dia, xMax: x.dia, yMin: 0, yMax: x.alvo, borderColor: comAlfa(cores.alvo, 0.7), borderWidth: 1.5, borderDash: [2, 3],
                            drawTime: 'beforeDatasetsDraw',
                            label: { enabled: true, content: `≈ dia ${x.diaInteiro}`, position: 'start', yAdjust: x.dia >= 28 ? -36 * escala : 0,   // acima da etiqueta de extrapolação
                                backgroundColor: cores.alvo, color: cores.superficie, font: { size: Math.round(11 * escala), weight: '700' } } };
                        anot.alvoPonto = { type: 'point', display: true, xValue: x.dia, yValue: x.alvo, radius: 6 * escala, borderWidth: 2 * escala,
                            backgroundColor: cores.superficie, borderColor: cores.alvo };
                    }
                }
                const maxY = Math.max(r.params.fck, x ? x.alvo : 0, ...ds[4].data.map(p => p.y), ...ds[5].data.map(p => p.y), ...ds[1].data.map(p => p.y));
                o.scales.y.suggestedMax = Math.ceil(maxY * 1.1 / 5) * 5;
            }
        }
        o.plugins.annotation.annotations = anot;
        return msg;
    }

    // Imagem do gráfico para o PDF: canvas fora da tela, tamanho fixo, paleta clara.
    function imagemGraficoPdf() {
        if (typeof window.Chart === 'undefined') return null;
        const caixa = document.createElement('div');
        Object.assign(caixa.style, { position: 'fixed', left: '-10000px', top: '0', width: '1500px', height: '820px' });
        const cv = document.createElement('canvas');
        cv.width = 1500; cv.height = 820;
        caixa.appendChild(cv);
        document.body.appendChild(caixa);
        try {
            const ch = novoGrafico(cv, false);
            pintarGrafico(ch, CORES_PDF, false, 2);
            ch.update('none');
            const url = ch.toBase64Image('image/jpeg', 0.92);   // JPEG: PDF leve (PNG 1500x900 deixava o arquivo com ~5 MB)
            ch.destroy();
            return url;
        } finally {
            document.body.removeChild(caixa);
        }
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
            : `a curva média ajustada, aos 28 d (${f1(a.fcm)} MPa), está <b>abaixo</b> do fcm alvo de dosagem (fck + 1,65·sd = ${f1(a.fcm_base)} MPa)`;
        const avisos = [...r.avisos.filter(x => x.tipo !== 'regra_referencia').map(textoAviso), ...r.avisosDados.map(avisoAmigavel)];
        if (r.excluidos.length) avisos.push(`Ignorado no ajuste: ${r.excluidos.map(fd).join(', ')} d.`);
        const v = r.validacao28;

        let h = `<div class="rel-veredito ${classe}">${veredito}</div>`;
        const ta = textoAlvo();
        if (ta) h += `<h4>Resistência-alvo</h4><ul><li><b>${esc(ta.resposta)}</b> para ${f1(r.alvo.alvo)} MPa. ${esc(ta.detalhe)}</li>${ta.aviso ? `<li>${esc(ta.aviso)}</li>` : ''}</ul>`;
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
                <li>${r.real28 !== null ? 'Seguir o controle de aceitação do lote pela NBR 12655 (a projeção é apoio à decisão).' : 'Confirmar com o ensaio de 28 d: a projeção é apoio à decisão e não substitui o controle por ensaio.'}</li>
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

    // ------------------------------------------------------------------ PDF rastreável (M4; jsPDF com texto nativo, C-14/C-15/C-23/C-25)
    // C-23: a fonte padrão do jsPDF só cobre Latin-1; troca o que estiver fora.
    function latin1(t) {
        return String(t)
            .replace(/[−–—]/g, '-').replace(/≥/g, '>=').replace(/≤/g, '<=')
            .replace(/√/g, 'raiz').replace(/β/g, 'beta').replace(/Δ/g, 'Delta').replace(/…/g, '...')
            .replace(/≈/g, '~').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/✕/g, 'x')
            .replace(/[^\x00-\xff]/g, '?');
    }
    function horaLocal() {
        const d = new Date();
        return `${d.toLocaleDateString('pt-BR')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    function statusLinha(l) {
        if (l.status !== 'ok') return `inválido: ${l.motivo}`;
        if (r.excluidos.includes(l.days)) return 'excluído do ajuste (destoa do vizinho)';
        const pt = r.pontos.find(x => x.days === l.days);
        if (pt && pt.n > 1) return `usado (mediana de ${pt.n} CPs aos ${fd(pt.days)} d: ${fn(pt.mpa, 2)} MPa)`;
        return 'usado';
    }
    function textoEquacoes() {
        const a = r.analise, p = r.params;
        const e = (fcm, s, desc) => `${fn(fcm, 2)} * exp[ ${fn(s, 3)} * (1 - raiz(28/t)) ]${desc === null ? '' : ` - ${fn(desc, 2)}`}`;
        const eq = [
            ['Curva esperada pela norma (NBR 6118)', `f_cm,ref(t) = ${e(a.fcm_base, p.s_normative, null)}`],
            ['Curva de projeção conservadora', `f_proj(t) = ${e(a.fcm, a.s, a.offset)}`]
        ];
        if (a.showPlausibleTrendCurve) eq.push(['Tendência dos ensaios (dentro da faixa da norma)', `f_tend(t) = ${e(a.plausibleTrendFcm, a.plausibleTrendS, a.plausibleTrendOffset)}`]);
        if (a.showFreeTrendCurve) eq.push(['Tendência dos ensaios (sem limite)', `f_livre(t) = ${e(a.freeTrendFcm, a.freeTrendS, a.freeTrendOffset)}`]);
        return eq;
    }

    function montarPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const p = r.params, a = r.analise;
        const M = 14, L = 182, ALT = doc.internal.pageSize.getHeight(), BASE = ALT - 16;
        let y = 0;
        const txt = (t, x, yy, op) => doc.text(Array.isArray(t) ? t.map(latin1) : latin1(t), x, yy, op);
        const quebrar = (t, w) => doc.splitTextToSize(latin1(t), w);
        const fonte = (tam, estilo) => { doc.setFont('helvetica', estilo || 'normal'); doc.setFontSize(tam); };
        const cor = hex => { const n = parseInt(hex.slice(1), 16); doc.setTextColor(n >> 16, (n >> 8) & 255, n & 255); };
        const cabecalho = () => {
            fonte(15, 'bold'); cor('#0f4c5c'); txt(`Estimativa fck v${VERSAO}`, M, 15);
            fonte(9); cor('#4a5866'); txt(`Emitido em ${horaLocal()}`, M + L, 15, { align: 'right' });
            fonte(9); txt('Projeção da resistência do concreto a partir dos rompimentos de CPs (curva beta1 da NBR 6118)', M, 20);
            doc.setDrawColor(200); doc.line(M, 22.5, M + L, 22.5);
            cor('#17212b');
            y = 30;
        };
        const garantir = h => { if (y + h > BASE) { doc.addPage(); cabecalho(); } };   // C-15: quebra controlada
        const titulo = t => { garantir(14); fonte(11.5, 'bold'); cor('#0f4c5c'); txt(t, M, y); cor('#17212b'); y += 6; };
        const paragrafo = (t, tam, estilo) => { fonte(tam || 9.5, estilo); const ls = quebrar(t, L); garantir(ls.length * 4.6); txt(ls, M, y); y += ls.length * 4.6 + 1; };
        const pares = (lista, colChave) => {
            fonte(9.5);
            lista.forEach(([k, v]) => {
                const lv = quebrar(v, L - colChave);
                garantir(lv.length * 4.6);
                fonte(9.5, 'bold'); txt(k, M, y);
                fonte(9.5); txt(lv, M + colChave, y);
                y += lv.length * 4.6 + 0.6;
            });
            y += 2;
        };
        const lista = itens => { fonte(9.5); itens.forEach(t => { const ls = quebrar(t, L - 5); garantir(ls.length * 4.6); txt('-', M + 1, y); txt(ls, M + 5, y); y += ls.length * 4.6 + 0.8; }); y += 2; };

        cabecalho();

        // Identificação (opcional)
        const id = estado.ident || {};
        const idents = [['Obra', id.obra], ['Elemento / peça', id.elemento], ['Lote', id.lote], ['Laboratório', id.laboratorio], ['Responsável', id.responsavel]]
            .filter(([, v]) => v && String(v).trim()).map(([k, v]) => [k, String(v).trim()]);
        if (idents.length) { titulo('Identificação'); pares(idents, 40); }

        // Resultado em destaque
        titulo('Resultado');
        const corSelo = { atende: ['#e4f4ea', '#1d7a45'], nao_atende: ['#fdecea', '#b42318'], indicativo: ['#fff4dc', '#8a5a00'], sem_dados: ['#eef1f4', '#4a5866'] }[r.selo.codigo] || ['#eef1f4', '#4a5866'];
        const prev = r.previsaoIdade || r.previsoes.find(x => x.t === 28);
        const linhasRes = [];
        linhasRes.push(['bold', 13, `Resistência estimada conservadora aos 28 d: ${f1(r.estimada28)} MPa`]);
        if (prev && prev.t !== 28) linhasRes.push(['normal', 10, `Aos ${fd(prev.t)} d: ${f1(prev.estimada)} MPa${prev.extrapolacao ? ' (extrapolação > 28 d, fora do escopo da NBR 6118)' : ''}`]);
        const ta = textoAlvo();
        if (ta) linhasRes.push(['bold', 10, `Resistência-alvo ${f1(r.alvo.alvo)} MPa: ${ta.resposta}${ta.aviso ? ' (extrapolação > 28 d, fora do escopo da NBR 6118)' : ''}`], ['normal', 9.5, ta.detalhe]);
        linhasRes.push(['bold', 11, `${r.selo.texto}${r.selo.base === 'estimativa' ? ` o fck de ${fd(p.fck)} MPa (${sinal(r.estimada28 - p.fck)} MPa aos 28 d)` : ''}`, true]);
        if (r.selo.base !== 'estimativa') linhasRes.push(['normal', 9.5, r.selo.motivo]);   // na estimativa o selo já traz o número
        linhasRes.push(['normal', 9.5, `Confiança: ${r.confianca.rotulo}. ${r.confianca.motivo}`]);
        const v = r.validacao28;
        if (v.calculada) linhasRes.push(['normal', 9.5, `Comparação com o ensaio de 28 d (validação sem ele): previsão ${f1(v.previsto28)} MPa com os ensaios até ${fd(Math.max(...v.idadesUsadas))} d; ensaio ${f1(v.real28)} MPa; diferença ${sinal(v.erroPct)}% (${v.classificacao}).`]);
        else if (r.real28 !== null) linhasRes.push(['normal', 9.5, `Comparação com o ensaio de 28 d: ${v.motivo}`]);
        const blocos = linhasRes.map(([est, tam, t, selo]) => { fonte(tam, est); return { est, tam, selo: !!selo, ls: quebrar(t, L - 8) }; });
        const altBox = blocos.reduce((s, b) => s + b.ls.length * (b.tam * 0.45) + 1.2, 0) + 5;
        garantir(altBox);
        const [fundo, borda] = corSelo;
        doc.setFillColor(fundo); doc.setDrawColor(borda); doc.setLineWidth(0.4);
        doc.roundedRect(M, y - 4, L, altBox, 2, 2, 'FD');
        doc.setLineWidth(0.2);
        let yy = y + 1.5;
        blocos.forEach(b => { fonte(b.tam, b.est); cor(b.selo ? borda : '#17212b'); txt(b.ls, M + 4, yy); yy += b.ls.length * (b.tam * 0.45) + 1.2; });
        cor('#17212b');
        y += altBox + 3;

        // Gráfico logo depois do resultado (A3-15: aproveita a 1ª página)
        const img = imagemGraficoPdf();
        if (img) {
            const hImg = L * 820 / 1500;
            garantir(hImg + 10);
            titulo('Gráfico');
            doc.addImage(img, 'JPEG', M, y - 2, L, hImg);
            y += hImg + 3;
        }

        // Parâmetros
        titulo('Parâmetros');
        const nomeCim = p.cementType === 'custom' ? 's personalizado' : (NOMES_CIMENTO[p.cementType] || '');
        pares([
            ['fck de projeto', `${fd(p.fck)} MPa`],
            ['Cimento', `${nomeCim} (s da norma = ${fn(p.s_normative, 3)})`],
            ['Desvio-padrão sd', `${f1(p.sd)} MPa${p.sdPadrao ? ' (padrão, não informado)' : ''}`],
            ['Ajuste da curva', p.analysisMode === 'normative' ? 'Manter a forma da norma, só ajustar o nível' : 'Ajustar aos ensaios (s até +-0,03 do valor da norma)'],
            ['Ignorar ensaio que destoa', p.autoDrop ? 'ligado' : 'desligado'],
            ['s usado na projeção', fn(a.s, 3)],
            ['fcm alvo de dosagem', `${fn(a.fcm_base, 2)} MPa (fck + 1,65 sd)`],
            ['fcm da curva média ajustada', `${fn(a.fcm, 2)} MPa (28 d)`],
            ['Desconto (maior desvio abaixo)', `${fn(a.offset, 2)} MPa`]
        ], 58);

        // Tabela dos CPs
        const nValidos = r.linhas.filter(l => l.status === 'ok').length;
        titulo(`Ensaios (${r.linhas.length} linha${r.linhas.length === 1 ? '' : 's'}, ${nValidos} CP${nValidos === 1 ? '' : 's'} válido${nValidos === 1 ? '' : 's'})`);
        const cols = [M, M + 12, M + 34, M + 62];
        const cabTabela = () => { fonte(9, 'bold'); doc.setFillColor('#eef1f4'); doc.rect(M, y - 3.8, L, 5.6, 'F'); txt('Nº', cols[0] + 1, y); txt('Idade (d)', cols[1], y); txt('fc (MPa)', cols[2], y); txt('Status', cols[3], y); y += 5.6; };
        garantir(12); cabTabela();
        r.linhas.forEach((l, i) => {
            fonte(9);
            const st = quebrar(statusLinha(l), L - (cols[3] - M));
            const h = st.length * 4.2 + 1.2;
            if (y + h > BASE) { doc.addPage(); cabecalho(); cabTabela(); }
            fonte(9);
            const bruto = estado.rows[i] || {};
            txt(String(i + 1), cols[0] + 1, y);
            txt(Number.isFinite(l.days) ? fd(l.days) : paraCampo(bruto.days) || '(vazio)', cols[1], y);
            txt(Number.isFinite(l.mpa) ? fn(l.mpa, 1) : paraCampo(bruto.mpa) || '(vazio)', cols[2], y);
            if (l.status !== 'ok') cor('#b42318'); else if (r.excluidos.includes(l.days)) cor('#8a5a00');
            txt(st, cols[3], y);
            cor('#17212b');
            doc.setDrawColor(225); doc.line(M, y + h - 3.6, M + L, y + h - 3.6);
            y += h;
        });
        y += 3;

        // Avisos
        const avisos = [...r.avisos.filter(x => x.tipo !== 'regra_referencia').map(textoAviso), ...r.avisosDados.map(avisoAmigavel)];
        if (r.excluidos.length) avisos.push(`Ignorado no ajuste: ${r.excluidos.map(fd).join(', ')} d.`);
        if (r.mensagens.regraReferencia) avisos.push(r.mensagens.regraReferencia);
        if (a.showPlausibleTrendCurve) avisos.push(`Os ensaios indicam potencial ${f1(a.tendencySuperiority)}% acima do previsto pela norma aos 28 d; por segurança, a projeção conservadora não usa esse ganho.`);
        if (avisos.length) { titulo('Atenção aos dados'); lista(avisos); }

        // Equações (texto simples)
        titulo('Equações');
        fonte(9.5);
        textoEquacoes().forEach(([k, e]) => { garantir(10); fonte(9, 'bold'); txt(k, M, y); y += 4.4; fonte(9.5); doc.setFont('courier', 'normal'); txt(quebrar(e, L), M + 2, y); y += 5.6; });
        y += 1;

        // Interpretação (mesmo conteúdo do relatório da tela)
        const tmp = document.createElement('div');
        tmp.innerHTML = relatorioHtml();
        let emLista = null;
        Array.from(tmp.children).forEach(el => {
            if (el.tagName === 'H4' && /Desempenho|Possíveis|Recomendações/.test(el.textContent)) { titulo(el.textContent.trim()); emLista = true; }
            else if (el.tagName === 'H4') emLista = false;
            else if (el.tagName === 'UL' && emLista) lista(Array.from(el.querySelectorAll('li')).map(li => li.textContent.replace(/\s+/g, ' ').trim()));
        });

        // Nota de método e limite
        titulo('Método e limite de uso');
        paragrafo('Projeção conservadora = curva média ajustada aos ensaios (limitada ao fcm alvo de dosagem, fck + 1,65 sd) menos o maior desvio de um ensaio abaixo dela. Não é o fck estatístico (quantil de 5%) da NBR 12655. Extrapolação além de 28 d fica fora do escopo da NBR 6118. Apoio à decisão: não substitui o ensaio de 28 d.', 9);

        // Rodapé com paginação
        const n = doc.getNumberOfPages();
        for (let i = 1; i <= n; i++) {
            doc.setPage(i);
            fonte(8); cor('#6b7885');
            doc.setDrawColor(210); doc.line(M, ALT - 11, M + L, ALT - 11);
            txt(`Estimativa fck v${VERSAO} - apoio à decisão, não substitui o ensaio de 28 d`, M, ALT - 7);
            txt(`Página ${i} de ${n}`, M + L, ALT - 7, { align: 'right' });
        }
        return doc;
    }

    async function exportarPdf() {
        executarTodos();
        if (!temPontos()) { msgAcoes('Sem resultado válido para exportar.', 'erro'); return; }
        if (!window.jspdf) { msgAcoes('PDF indisponível: a biblioteca não carregou (sem conexão?).', 'erro'); return; }
        const btn = $('btnPdf');
        btn.disabled = true; btn.textContent = 'Gerando PDF…';
        msgAcoes('');
        try {
            const doc = montarPdf();
            doc.save(`estimativa-fck-${dataLocal()}.pdf`);   // C-25: data local
            msgAcoes('PDF gerado.', 'ok');
        } catch (err) {
            console.error('Erro ao gerar PDF:', err);
            msgAcoes('Ocorreu um erro ao gerar o PDF.', 'erro');
        } finally {
            btn.textContent = 'Exportar PDF';
            btn.disabled = !temPontos();
        }
    }
    // Para conferência automatizada (devolve o PDF como data URI, sem baixar).
    window.EstimativaApp = { pdfDataUri: () => (temPontos() && window.jspdf ? montarPdf().output('datauristring') : null) };

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
            if (JSON.stringify(antes) !== JSON.stringify(PADRAO)) mostrarToast('Exemplo carregado (C45, CP V-ARI, 3/7/14 d).', () => aplicarEstado(antes));
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
        $('versaoTopo').textContent = 'v' + VERSAO;
        $('versaoRodape').textContent = 'v' + VERSAO;
        carregar();
        preencherCampos();
        ligarCampos();
        ligarEnsaios();
        ligarModal();
        ligarAjudas();
        ligarTopo();
        iniciarGrafico();
        // PWA: service worker só em http/https (não em file://).
        if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
            // A3-18: updateViaCache 'none': o navegador confere sw.js e js/versao.js sem o cache HTTP.
            navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* sem offline; o app segue funcionando */ });
        }
        const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
        if (mq && mq.addEventListener) mq.addEventListener('change', () => renderGrafico());
        calcular();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

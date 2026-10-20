# Mapa do app

## v2.0 (branch `modernizacao-2026-10`, M3)
Arquivos: `index.html` (estrutura), `css/app.css` (estilo próprio, tokens claro/escuro, fonte do sistema; sem Tailwind e sem Google Fonts), `js/calc.js` (núcleo puro, `analyze`), `js/app.js` (interface: lê a tela, chama `analyze`, desenha), `manifest.webmanifest` + `icons/` + `sw.js` (PWA, M4), `js/versao.js` (versão única: tela, PDF e nome do cache; **subir `ESTIMATIVA_PUBLICACAO` a cada publicação**). Bibliotecas ainda por CDN: Chart.js 3.9.1 + annotation 1.4.0 e jsPDF 2.5.1 (vendorizar no M4c, plano em `vendor/README.md`). KaTeX e html2canvas saíram no M4.

| Bloco | Conteúdo |
|---|---|
| Cabeçalho | "Estimativa fck" v2.0, Carregar exemplo (C45, CP V-ARI, sd 4,0, 3/7/14 d), Novo lote (com desfazer) |
| Resumo fixo (celular < 960 px) | valor + selo + confiança, some sem resultado válido |
| ① Concreto | fck, cimento, s personalizado (se "Outro"); Opções avançadas recolhidas: sd, modo, ignorar ensaio que destoa |
| ② Ensaios | formulário Idade + Resistência (só adiciona valores válidos), lista editável com remover + Desfazer 5 s, linhas inválidas marcadas, Importar CSV com resumo lidas/ignoradas, modelo .csv |
| ③ Resultado | idade (padrão 28 d), "Resistência estimada conservadora", selo (Atende / Não atende / Indicativo; com ensaio real, "Ensaio de 28 d acima/abaixo do fck", que não é a aceitação do lote), confiança, base, aviso de extrapolação > 28 d, validação sem o ensaio de 28 d |
| Gráfico | norma (cinza tracejada), projeção conservadora, tendências (só se existirem), ensaios; trecho > 28 d esmaecido e tracejado, faixa "extrapolação: fora do escopo da NBR 6118"; linha 28 d só com ensaio real |
| Atenção aos dados | uma caixa com todos os avisos (linhas inválidas, agregação, sd padrão, razões, monotonia, ignorados) |
| Detalhes técnicos | recolhido: s, fcm alvo, fcm ajustado, desconto, idades, tendências, equações em HTML simples (f_cm,ref; f_proj; f_tend; f_livre) |
| Identificação (opcional) | obra, elemento/peça, lote, laboratório, responsável; salvos e impressos no PDF |
| Relatório / PDF | relatório em `<dialog>` (Esc, clique fora, foco). PDF (M4) em texto nativo do jsPDF: cabeçalho com data/hora local, identificação, resultado em destaque (selo, confiança, validação 28 d), parâmetros, tabela dos CPs com status (usado / agregado / excluído / inválido), avisos, gráfico (canvas fora da tela, paleta clara, JPEG), equações em texto Latin-1, interpretação, nota de método e limite, rodapé com página; nome `estimativa-fck-AAAA-MM-DD.pdf` (data local) |
| Offline (PWA) | `sw.js`: arquivos locais com cache primeiro e atualização em segundo plano; CDN com rede primeiro e cópia de reserva; cache `estimativa-fck-v2.0`; registrado só em http/https |

Selo (`analyze().selo.codigo`): `atende`, `nao_atende`, `indicativo` e `sem_dados` (sem nenhum ensaio: a tela mostra o estado vazio, sem selo colorido).

Estado salvo em `localStorage` (`estimativaFck.v2`, com try/catch). Debounce por campo; change/blur gravam na hora. Campos numéricos `type=text inputmode=decimal` aceitam vírgula.

## v1 (commit `6e0bdc9`, histórico)

Arquivo único `index.html` (1.286 linhas). Sem build. Dependências por CDN: Tailwind Play CDN, Chart.js 3.9.1 + annotation 1.4.0, KaTeX 0.16.0, html2canvas 1.4.1, jsPDF 2.5.1, fonte Inter.

## Layout
- Esquerda (2/3): gráfico `#resistanceChart` dentro de `#captureArea` (capturado no PDF).
- Direita (1/3): Parâmetros (fck, sd, cimento, s personalizado, modo) → Tabela de ensaios (Adicionar, Importar CSV) → Resultados e Ações (guidance, auto-exclusão, avisos, tendência, Δ28, previsão em idade, Relatório, PDF).
- Abaixo: Equações (KaTeX). Modal: Relatório interpretativo.

## Módulos JS (linhas)
| Módulo | Linhas | Papel |
|---|---|---|
| `Beta` | 269–272 | β1(t,s) = exp(s·(1−√(28/t))); f28 a partir de um ponto |
| `DataValidator` | 274–336 | Monotonia; razões 3/2, 7/3, 14/7, 28/14 contra banda ±α; sugestão de exclusão do ponto "menos conservador" |
| `Calculator` | 338–513 | Ajuste: fcm ótimo fechado (mínimos quadrados) para s dado; s por seção áurea; `performAnalysis` |
| `App.store` | 516–525 | Store simples (commit → listeners) |
| `App.init/bindEvents/update/render*` | 529–964 | Eventos, validação, gráfico, tabela, mensagens, equações, previsão, Δ28 |
| Relatório / CSV / PDF | 966–1278 | Diagnóstico textual; import CSV (agrega duplicatas pela mediana); PDF com html2canvas + jsPDF |

## Algoritmo (`performAnalysis`)
1. `fcm_base = fck + 1,65·sd` (sd padrão 4,0). Curva de referência = `fcm_base·β1(t, s_norm)`; s_norm: 0,25 CP I/II, 0,38 CP III/IV, 0,20 CP V, ou personalizado.
2. Modo **ajustado** (≥2 pontos): ajuste "plausível" com s ∈ [s_norm−0,03, s_norm+0,03]; ajuste "livre" com s ∈ [0,05, 0,60].
   Modo **normativo** (ou 1 ponto): s = s_norm, só fcm ajustado.
3. Curva de projeção conservadora (na v1, "característica"): `fcm_final = min(fcm_plausível, fcm_base)`, `s_final = s_plausível`. Se a referência fica abaixo de todos os pontos e tem SSE menor, usa a referência (`ruleApplied`).
4. `offset` = maior resíduo positivo (curva − ponto). Curva de projeção conservadora = curva média − offset (passa em/abaixo de todos os pontos).
5. Tendências plausível/livre só aparecem se o fcm ajustado > fcm_base, cada uma com seu offset.
6. Previsão em idade t = curva de projeção conservadora(t); gráfico vai até 90 dias.

## Observações
- Não há persistência (recarregar perde tudo), não há dados de exemplo, não há PWA/offline.
- `Manual.README.md` está desatualizado (cita `fck + 8`).

## Núcleo `js/calc.js` (M1/M2, branch `modernizacao-2026-10`)
Arquivo UMD sem build: `window.EstimativaCalc` no navegador, `require('./js/calc.js')` no Node. Desde o M3 o `index.html` carrega `js/calc.js` e não tem cópia própria do núcleo (teste em `tests/ouro.test.js`).

| Export | Papel |
|---|---|
| `Beta`, `DataValidator`, `Calculator` | Núcleo original (6e0bdc9, linhas 269–513). M2: T-21 (ramo morto removido), T-23 (s_max plausível ≤ 0,60), C-25 (p95 removido) |
| `analyze(input)` | Pipeline completo que substitui a lógica de `App.update`, previsão, Δ28 e diagnóstico |
| `parseCsv(text)` | Leitura de CSV (`;` + vírgula decimal, tab, `,`, aspas, BOM; cabeçalho só se não numérico); devolve linhas brutas e ignoradas |
| `validarLinha`, `agregarPorIdade`, `mediana`, `paraNumero`, `preverEm`, `compararS` | Auxiliares puros |

### `analyze(input)`
Entrada: `{ fck, sd, cementType ('0.25'|'0.38'|'0.20'|'custom'), customS, analysisMode ('adjusted'|'normative'), autoDrop, rows:[{days, mpa}], idadePrevisao?, idades? }`. `rows` são os CPs brutos (podem ter vazios e idades repetidas).

Com erro de parâmetro: `{ ok:false, erros:[...], linhas }`, sem nenhum resultado (a UI limpa gráfico, relatório e PDF).

Com sucesso: `{ ok:true, params (fck, sd, sdPadrao, s_normative, ...), linhas (status ok/invalida + motivo), pontos (agregados por idade pela mediana, com n e índices), pontosUsados, excluidos, avisos [{tipo, texto}] (sd_padrao, linha_invalida, agregado, regra_referencia), avisosDados (avisos de monotonia/razão originais, HTML), analise (performAnalysis + s_normative), previsoes [{t, estimada, media, plausivel, livre, extrapolacao}], previsaoIdade, estimada28, atendeEstimada28, real28, comparacaoS, confianca {nivel baixa|media|boa, rotulo, motivo}, selo {codigo atende|nao_atende|indicativo, texto, base ensaio28|estimativa|indicativo, motivo}, validacao28 {calculada, previsto28, real28, erroPct, classificacao | motivo}, mensagens.regraReferencia }`.

Regras: linha com idade/resistência vazia, não numérica ou ≤ 0 fica fora com aviso (C-04, C-19, T-08); CPs da mesma idade agregados pela mediana com aviso (C-07, C-08, T-07); sd vazio = 4,0 com aviso, 0 = erro (C-18); nada da entrada é mutado (C-20). Confiança/selo = D2; validação de 28 d sem os ensaios ≥ 28 d = D4; `extrapolacao = t > 28` para o D3.

### Testes
`node --test` na pasta `02_app` (sem dependências). `tests/ouro.test.js` (contrato com o app original e `fixtures_ouro.json`), `tests/m2.test.js` (um teste por ID corrigido e por decisão).

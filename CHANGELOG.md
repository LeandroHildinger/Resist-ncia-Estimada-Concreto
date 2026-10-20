# Changelog

## v2.0 (2026-10-20)

Modernização completa, baseada na auditoria técnica, de código e de usabilidade de 20/10/2026 (IDs entre parênteses referem-se aos pareceres em `03_auditoria/`).

### Cálculo e correções
- CSV do Excel em português (`7;25,5`) deixava de ser lido corretamente e virava 25 MPa (C-01). Agora `;` com vírgula decimal e `,` com ponto decimal funcionam, com aspas e BOM tratados e cabeçalho opcional (C-09).
- Erro de validação (por exemplo, fck inválido) deixava na tela, no relatório e no PDF o resultado antigo, ou "fck = NaN" (C-02, C-03). Agora, com parâmetro inválido, não aparece nenhum resultado.
- Digitar rápido em vários campos podia descartar um valor (debounce único, C-05). Cada campo tem o seu controle.
- Células vazias, não numéricas, zero ou negativas mudavam o resultado em silêncio (C-04, T-08, C-19). Agora a linha é marcada e fica fora do cálculo, com aviso.
- CPs repetidos na mesma idade mudavam o ajuste sem aviso (C-07, C-08, T-07). Agora são combinados pela mediana, com aviso, e o CSV importado é acrescentado ao que já existe.
- O cálculo reordenava a lista do usuário (C-20); sd vazio e valores textuais com vírgula (`45,5`) eram tratados de forma inconsistente (C-18, C-21).
- Pequenas limpezas no núcleo: ramo morto removido (T-21), tolerância ao comparar s ajustado e s da norma (T-22), teto da janela do s limitado a 0,60 (T-23), cálculo não usado removido (C-25), texto correto quando a curva da norma é adotada (T-14).

### Decisões técnicas (Leandro, 20/10/2026)
- **D1:** "Resistência Característica Estimada / fck,est" passa a "Resistência estimada conservadora" e "Curva de projeção conservadora", com nota do critério. O número não muda; deixa de sugerir que seja o fck de 5% da NBR 12655.
- **D2:** novo selo Atende / Não atende / Indicativo e nível de confiança (baixa, média, boa) pelo número de idades e pela maior idade ensaiada. Um ponto, ou só idades até 3 dias, vira "apenas sinal".
- **D3:** idades acima de 28 dias são permitidas com aviso: trecho esmaecido e tracejado e etiqueta "extrapolação: fora do escopo da NBR 6118".
- **D4:** validação honesta: a previsão de 28 dias é recalculada sem o ensaio de 28 d (nem posteriores) e comparada ao valor real. Antes, o ensaio de 28 d entrava no ajuste que o validava.

- **A3-04 (20/10/2026):** com ensaio real de 28 d, o selo diz "Ensaio de 28 d acima do fck" / "abaixo do fck" (mediana dos CPs) e avisa que não é a aceitação do lote, que segue a NBR 12655.

- **A3-16 (20/10/2026):** inconsistência nos ensaios usados no ajuste rebaixa a confiança um nível (boa para média, média para baixa); o selo pode passar a "Indicativo". Os números do ajuste não mudam.

### Interface
- Telas reorganizadas em 3 passos (Concreto, Ensaios, Resultado), pensadas primeiro para o celular, com resumo fixo no topo em telas estreitas.
- Cartão de resultado com valor, selo e confiança; opções avançadas recolhidas; ajuda tocável (sem depender de hover); botão "Carregar exemplo"; "Novo lote" com desfazer.
- Lista de ensaios editável, com remoção e desfazer, linhas inválidas marcadas e resumo da importação de CSV (lidas e ignoradas), mais modelo .csv.
- Caixa única "Atenção aos dados"; detalhes técnicos e equações recolhidos; relatório em janela acessível (Esc, clique fora, foco).
- Gráfico mais legível: norma tracejada, projeção conservadora, tendências só quando existem, linha de 28 d apenas com ensaio real (C-06).
- Sessão guardada no navegador (localStorage), tema claro e escuro, sem Tailwind e sem fontes externas.
- Novo `js/calc.js` (núcleo puro, testável no Node) e testes automatizados (`node --test`).

### Números
- Idênticos à v1 nos casos sem defeito (testes "ouro", incluindo o caso C45 com 32,04 MPa aos 14 d e 34,18 MPa aos 28 d).
- Única diferença numérica conhecida: s personalizado 0,60, em que o teto da janela do s foi limitado a 0,60 (T-23); a diferença é de no máximo 0,0006 MPa.
- Mudam também, por correção de defeito ou decisão, os casos com linhas inválidas, CPs repetidos ou CSV mal interpretado, e a validação aos 28 d (D4).

## v1 (2025-08-15)
Versão original: arquivo único `index.html`, com curva característica estimada, importação de CSV, relatório e PDF.

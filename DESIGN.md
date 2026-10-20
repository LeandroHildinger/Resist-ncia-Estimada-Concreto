---
name: Estimativa fck
description: Previsão da resistência do concreto a partir dos rompimentos de CPs, no celular da obra.
colors:
  petroleo-laudo: "#0f4c5c"
  petroleo-laudo-escuro: "#5fb3c4"
  petroleo-nevoa: "#e3eff2"
  ambar-fck: "#b26b00"
  ambar-fck-escuro: "#f2b450"
  magenta-alvo: "#b4235a"
  magenta-alvo-escuro: "#f07aa0"
  verde-atende: "#1d7a45"
  verde-atende-fundo: "#e4f4ea"
  vermelho-nao-atende: "#b42318"
  vermelho-nao-atende-fundo: "#fdecea"
  ocre-atencao: "#8a5a00"
  ocre-atencao-fundo: "#fff4dc"
  cinza-norma: "#8794a1"
  verde-tendencia: "#2f8f6b"
  violeta-livre: "#7a4fb5"
  concreto-claro: "#f3f5f7"
  papel: "#ffffff"
  papel-campo: "#f7f9fa"
  junta: "#d9dfe4"
  borda-campo: "#7f8c98"
  tinta: "#17212b"
  tinta-2: "#4a5866"
  tinta-3: "#5b6875"
  noite-fundo: "#0f1418"
  noite-cartao: "#172026"
  noite-campo: "#1d272e"
  noite-tinta: "#e6ecf0"
  foco: "#2b7bd6"
typography:
  display:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.2rem, 7vw, 3rem)"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 650
    lineHeight: 1.25
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "8px"
  md: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.petroleo-laudo}"
    textColor: "{colors.papel}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.papel-campo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.papel}"
    rounded: "{rounded.md}"
    padding: "16px"
  seal-atende:
    backgroundColor: "{colors.verde-atende-fundo}"
    textColor: "{colors.verde-atende}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  seal-nao-atende:
    backgroundColor: "{colors.vermelho-nao-atende-fundo}"
    textColor: "{colors.vermelho-nao-atende}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  seal-indicativo:
    backgroundColor: "{colors.ocre-atencao-fundo}"
    textColor: "{colors.ocre-atencao}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

# Design System: Estimativa fck

## Overview

**Creative North Star: "Laudo de bolso"**

Precisão de laboratório no celular da obra. O app é uma ferramenta (modo Operate): o engenheiro ou o técnico informa o concreto e os rompimentos de CPs e lê, em segundos, quanto o lote deve chegar a ter e em que dia chega a uma resistência-alvo. O visual é o de um laudo bem feito: sóbrio, números grandes e alinhados, cor só quando diz alguma coisa (atende, não atende, atenção, alvo), nada de ornamento. A confiança vem da clareza e da honestidade dos avisos (extrapolação, confiança baixa, "não substitui o ensaio"), não de efeitos.

A densidade é média: três passos em cartões (Concreto, Ensaios, Resultado), opções avançadas e detalhes técnicos recolhidos. O celular vem primeiro (uso em canteiro, sob sol, com uma mão); no desktop as duas colunas mostram entrada e resultado lado a lado. Tema claro e escuro pelo sistema, os dois com contraste AA.

O vídeo de apresentação herda este sistema: mesma paleta e mesma tipografia. A energia do vídeo vem do movimento (a curva se desenhando, a linha do alvo descendo, a marca do dia aparecendo), não de cores ou fontes novas.

**Key Characteristics:**
- Um só tom de marca, o petróleo; o resto da cor é semântica ou dado.
- Números em destaque e com algarismos tabulares; vírgula decimal (pt-BR).
- Fonte do sistema, sem webfont (funciona offline).
- Cartões planos com sombra mínima; nada de cartão dentro de cartão.
- Alvos de toque de 44 px; foco visível de 3 px.

## Colors

Petróleo sobre cinza-concreto, com âmbar e magenta reservados ao gráfico e semáforo verde/ocre/vermelho só para veredito.

### Primary
- **Petróleo de laudo** (#0f4c5c; escuro #5fb3c4): botão principal, números dos passos, curva de projeção conservadora, links. É a voz da marca e da curva que se lê.
- **Névoa de petróleo** (#e3eff2): fundo suave de destaque ligado ao petróleo.

### Secondary
- **Âmbar do fck** (#b26b00; escuro #f2b450): só a linha do fck de projeto no gráfico e sua etiqueta.
- **Magenta do alvo** (#b4235a; escuro #f07aa0): só a resistência-alvo (linha tracejada, ponto de cruzamento, marca do dia e a resposta "Dia E").

### Tertiary
- **Verde atende** (#1d7a45 sobre #e4f4ea), **vermelho não atende** (#b42318 sobre #fdecea), **ocre de atenção** (#8a5a00 sobre #fff4dc): selos, avisos e a manchete do alvo pelo caso (verde = já alcançado; ocre = extrapolação ou não atinge).
- Curvas de apoio do gráfico: **cinza da norma** (#8794a1, tracejada), **verde de tendência** (#2f8f6b) e **violeta livre** (#7a4fb5), só quando existem.

### Neutral
- **Concreto claro** (#f3f5f7): fundo da página.
- **Papel** (#ffffff) e **papel de campo** (#f7f9fa): cartões e campos.
- **Junta** (#d9dfe4): bordas de cartão e divisórias. **Borda de campo** (#7f8c98): contorno de campos e seletores (≥ 3:1).
- **Tinta** (#17212b), **tinta 2** (#4a5866), **tinta 3** (#5b6875): texto principal, secundário e terciário (≥ 4,5:1).
- Escuro: fundo #0f1418, cartão #172026, campo #1d272e, tinta #e6ecf0.

### Named Rules
**A Regra da Cor que Fala.** Cor só aparece para dizer algo: veredito, atenção, fck ou alvo. Nada colorido por enfeite.
**A Regra do Magenta Único.** O magenta pertence à resistência-alvo e a mais nada, no app e no vídeo.

## Typography

**Display Font:** fonte do sistema (system-ui, com -apple-system, Segoe UI, Roboto e Arial de reserva)
**Body Font:** a mesma
**Label/Mono Font:** monoespaçada do sistema só em trechos de código/CSV (ui-monospace, Cascadia Mono, Consolas)

**Character:** uma família só, bem ajustada: o peso e o tamanho fazem a hierarquia. Parece instrumento, não peça de marketing.

### Hierarchy
- **Display** (750, clamp(2,2rem, 7vw, 3rem), 1,1, -0,02em, algarismos tabulares): o número do resultado ("47,9 MPa").
- **Headline** (700, 1,5rem, 1,25): nome do app no cabeçalho.
- **Title** (650, 1,25rem, 1,25): títulos dos passos ① ② ③. A resposta do alvo ("Dia 18") usa 1,35rem/750 na cor do caso.
- **Body** (400, 16px, 1,45): textos e avisos.
- **Label** (600, 0,9rem): rótulos de campo; textos de apoio em 0,85rem na tinta 3.

### Named Rules
**A Regra do Número Primeiro.** Em cada bloco, o número que responde à pergunta é o maior elemento; o resto o explica.

## Layout

Coluna única no celular (até 960 px), com resumo fixo no topo mostrando valor, selo, confiança e a resposta do alvo. A partir de 960 px, duas colunas: entrada (340–400 px) e resultado (o resto, fixo ao rolar). Largura máxima 1280 px, margem lateral de 16 px. Ritmo de espaço em 4/8/12/16/24 px: 16 px entre cartões e dentro deles, 12 px entre campos, 8 px entre botões. Sem rolagem lateral a 375 px.

## Elevation & Depth

Plano, com profundidade tonal: fundo concreto, cartões em papel com borda de 1 px e uma sombra ambiente mínima. Sombras mais fortes só em camadas que flutuam (ajuda, aviso de Desfazer, janela do relatório).

### Shadow Vocabulary
- **Cartão** (`box-shadow: 0 1px 2px rgba(16, 24, 32, 0.06), 0 2px 8px rgba(16, 24, 32, 0.05)`; escuro `0 1px 2px rgba(0, 0, 0, 0.4)`): todos os cartões.
- **Flutuante** (`box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25)`): ajuda e aviso de Desfazer.

### Named Rules
**A Regra do Plano por Padrão.** Nada sobe sem motivo: só o que flutua sobre o conteúdo ganha sombra.

## Shapes

Cantos suaves e uniformes: 12px nos cartões, 8px em campos, botões e caixas internas, pílula (999px) nos selos. Bordas finas de 1 px. Recolhíveis dentro de um cartão viram seção com divisória, não uma segunda caixa.

## Components

### Buttons
- **Shape:** cantos suaves (8px), altura mínima de 44 px.
- **Primary:** petróleo com texto branco ("+ Adicionar ensaio", "Relatório"); um principal por grupo.
- **Hover / Focus:** brilho leve no principal, papel de campo no secundário; foco com contorno de 3 px na cor de foco.
- **Secondary / Ghost:** papel com borda de junta ("Exportar PDF", "Importar CSV"); texto petróleo sem borda para links de ação ("Baixar modelo .csv").

### Chips (selos)
- **Style:** pílula com fundo suave e texto forte da mesma família semântica, com um ponto da cor antes do texto.
- **State:** Atende (verde), Não atende (vermelho), Indicativo (ocre), Exemplo (neutro).

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** papel (claro) ou #172026 (escuro).
- **Shadow Strategy:** cartão (ver Elevation & Depth).
- **Border:** 1 px de junta; o cartão de resultado leva a borda puxada para o petróleo.
- **Internal Padding:** 16 px.

### Inputs / Fields
- **Style:** fundo papel de campo, borda de campo de 1 px, 8px de canto, unidade (MPa, dias) dentro do campo à direita; teclado numérico e vírgula aceita.
- **Focus:** contorno de 3 px na cor de foco.
- **Error / Disabled:** borda e fundo vermelhos suaves com a mensagem logo abaixo; botões desabilitados a 45% de opacidade.

### Navigation
- Cabeçalho com marca, versão e duas ações ("Carregar exemplo", "Novo lote"); no celular, o resumo fixo leva ao resultado com um toque.

### Gráfico de resistência (signature)
- Curva da norma cinza tracejada; projeção conservadora petróleo grossa; ensaios como pontos tinta com contorno papel.
- Linha do fck em âmbar tracejada com etiqueta; resistência-alvo em magenta tracejada, ponto de cruzamento vazado e marca "dia E" no eixo.
- Depois de 28 d tudo esmaece e tracejado, com a faixa "extrapolação: fora do escopo da NBR 6118"; a projeção continua mais forte que a norma.

## Do's and Don'ts

### Do:
- **Do** manter o petróleo (#0f4c5c) como a única cor de marca e o magenta (#b4235a) só para o alvo.
- **Do** escrever números com vírgula decimal e algarismos tabulares, e mostrar a unidade junto.
- **Do** manter texto ≥ 4,5:1 e bordas de campo ≥ 3:1 nos dois temas, e alvos de toque de 44 px.
- **Do** mostrar os avisos honestos (extrapolação, confiança baixa, "não substitui o ensaio") perto do número a que se referem.
- **Do** dar ao vídeo energia pelo movimento da curva, da linha do alvo e da marca do dia, com a mesma paleta.

### Don't:
- **Don't** pôr cartão dentro de cartão nem faixa grossa colorida em canto arredondado.
- **Don't** usar cor por enfeite, gradiente em texto ou fonte de exibição nos rótulos e dados.
- **Don't** usar o verde de "atende" para algo que é só projeção em extrapolação: extrapolação é sempre ocre.
- **Don't** criar fontes ou cores novas no vídeo que o app não tenha.

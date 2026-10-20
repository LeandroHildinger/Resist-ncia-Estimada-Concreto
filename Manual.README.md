# Estimativa fck (v2.0)

Análise preditiva da resistência à compressão do concreto

Desenvolvido por: Leandro Hildinger Cavalcanti

## 1. Visão geral

Aplicativo web para engenheiros e técnicos de obra. A partir dos resultados de corpos de prova (CPs) em idades iniciais, ele projeta a evolução da resistência ao longo do tempo e indica, de forma conservadora, se o lote tende a atingir o fck de projeto aos 28 dias.

É uma ferramenta de apoio à decisão e ao planejamento (por exemplo, para programar o próximo rompimento). Não substitui o ensaio físico, que continua sendo a confirmação final.

O app é estático (HTML, CSS e JavaScript, sem servidor), não envia dados para lugar nenhum e guarda a última sessão apenas no próprio navegador (localStorage). Funciona no computador e no celular.

## 2. Como usar em 3 passos

A tela segue a ordem dos passos. O botão "Carregar exemplo" preenche um caso completo (C45, CP V-ARI, sd 4,0 MPa, ensaios de 3, 7 e 14 dias) para conhecer o app.

1. **Concreto.** Informe o fck de projeto (MPa) e o tipo de cimento: CP I / CP II, CP III / CP IV, CP V-ARI ou "Outro" (nesse caso informe o s, de 0,05 a 0,60). Em "Opções avançadas" (recolhidas) ficam o desvio padrão sd, o modo de ajuste e o recurso de ignorar ensaio que destoa (seção 5).
2. **Ensaios.** Digite idade (dias) e resistência (MPa) de cada ensaio e adicione. Também é possível importar um CSV (seção 4). A lista é editável: cada linha pode ser corrigida ou removida (há "Desfazer" por 10 segundos, que esperam enquanto o dedo, o mouse ou o foco estão no aviso). Linhas inválidas ficam marcadas e fora do cálculo. Mais de um CP na mesma idade é permitido: eles são combinados pela mediana, com aviso.
3. **Resultado.** O cartão mostra a resistência estimada na idade escolhida (padrão 28 dias), o selo, a confiança, o gráfico e os avisos. Os detalhes técnicos (s, fcm alvo, fcm ajustado, desconto, equações) ficam recolhidos. Há relatório na tela e exportação em PDF.

"Novo lote" limpa a sessão (com opção de desfazer).

## 3. Como ler o cartão de resultado

**Resistência estimada conservadora.** É o valor da curva de projeção conservadora na idade escolhida. Não é o fck característico (quantil de 5%) da NBR 12655: é uma projeção a favor da segurança, construída para não passar acima de nenhum ensaio já medido (seção 6).

**Selo.**
- **Ensaio de 28 d acima do fck / Ensaio de 28 d abaixo do fck:** existe ensaio real aos 28 dias; a mediana dos CPs dessa idade é comparada ao fck. O ensaio real vale mais que a estimativa, mas isso não é a aceitação do lote: a aceitação segue a NBR 12655.
- **Atende / Não atende:** sem ensaio de 28 dias, usa-se a resistência estimada conservadora aos 28 dias contra o fck, quando a confiança é média ou boa.
- **Indicativo:** a confiança é baixa (veja abaixo). O valor é só um sinal, sem veredito.
- **Sem ensaios:** nada foi lançado; a curva exibida é apenas a referência da norma.

**Confiança** (calculada com as idades distintas dos ensaios que entraram no ajuste):
- **Baixa:** só uma idade ensaiada, ou todas as idades ≤ 3 dias (apenas sinal; nessas idades a projeção tende a superestimar), ou nenhum ensaio.
- **Média:** duas ou mais idades distintas e maior idade ensaiada menor que 14 dias.
- **Boa:** duas ou mais idades distintas e maior idade ensaiada ≥ 14 dias.
- **Rebaixamento:** se os ensaios usados no ajuste tiverem inconsistência (resistência que cai com a idade ou razão entre idades fora da faixa esperada), a confiança desce um nível (boa para média, média para baixa) e o motivo diz "rebaixada por inconsistência nos dados". Com isso o selo pode virar "Indicativo".

**Validação honesta aos 28 dias.** Quando há ensaio real de 28 dias, o app recalcula a previsão de 28 dias sem usar os ensaios de 28 d ou posteriores e compara com o valor medido, informando o erro percentual e se a projeção foi conservadora ou superestimou. Assim a validação não é circular. Sem ensaio de 28 d, ou sem ensaios anteriores a 28 d, o app informa que não há como validar.

**Aviso de extrapolação.** O trecho acima de 28 dias é desenhado esmaecido e tracejado, com a etiqueta "extrapolação: fora do escopo da NBR 6118". Resultados nessas idades são projeções, não previsões respaldadas pela norma.

**Resistência-alvo: em que dia chego a R MPa? (opcional).** Abaixo do resultado há o campo "Resistência-alvo". Informe uma resistência (aceita vírgula, ex.: 32,5) e o app responde com o **dia E**: o primeiro dia inteiro em que a curva de projeção conservadora alcança o alvo (o dia é arredondado para cima, a favor da segurança; o texto mostra também o valor com uma casa, ex.: 8,9 d). Serve para a pergunta de obra: mínima para protender, desformar, içar ou liberar carga. É a mesma curva do resultado, só lida ao contrário; nenhum outro número muda. No gráfico aparecem a linha horizontal tracejada do alvo, o ponto de cruzamento com a projeção e a marca "dia E".
- A manchete diz o caso (decisão de 20/10/2026): **"Dia E"** dentro do escopo; **"Dia E · extrapolação"** acima de 28 d; **"Já alcançado · dia E"** quando a projeção na maior idade usada no ajuste já passa do alvo (com "· extrapolação" se E passar de 28 d); **"Não atinge até 90 d"**. Abaixo vem um lembrete: "Confirme rompendo o CP nessa data antes de liberar." ou, se já alcançado, "Confira o ensaio de N d: o resultado medido vale mais que a projeção." (em "Não atinge" não há lembrete). No celular, o resumo fixo do topo também mostra a resposta do alvo.
- Se o dia passar de 28, aparece o aviso de extrapolação (fora do escopo da NBR 6118).
- Se a projeção só chegar ao alvo depois de 90 dias (fim do gráfico), ou nunca chegar (alvo acima do limite da curva, fcm · e^s − desconto), a resposta é "Não atinge até 90 d", com a projeção aos 90 d (e o limite da curva, quando for o caso). Decisão de 20/10/2026: evita respostas como "dia 47.158".
- Se a projeção na maior idade usada no ajuste já passa do alvo, o texto avisa que o alvo já foi alcançado até esse ensaio (a projeção fica sobre ou abaixo dos ensaios usados, então o CP dessa idade também chegou lá). O dia é só para planejar: a liberação continua dependendo do rompimento do CP na data.
- Com confiança baixa (ex.: só o CP de 3 dias), o texto lembra que é só indicação e pede novo ensaio.
- O alvo é guardado no navegador e sai no relatório e no PDF.

**Atenção aos dados.** Uma caixa reúne todos os avisos: linhas inválidas, CPs agregados pela mediana, sd padrão assumido, resistência que cai com a idade, razões entre idades fora da faixa esperada, ensaios ignorados e uso da curva de referência da norma.

## 4. Importar CSV

- Duas colunas: idade (dias) e resistência (MPa), uma linha por CP.
- Separador `;` com vírgula decimal (padrão do Excel em português) ou separador `,` com ponto decimal. Tabulação também é aceita. Aspas e BOM são tratados.
- O cabeçalho é opcional: a primeira linha só é descartada se não tiver nenhum número.
- CPs da mesma idade são combinados pela mediana (com aviso).
- O CSV é acrescentado ao que já está na lista (não substitui).
- Ao final, o app informa quantas linhas foram lidas e quais foram ignoradas, com o motivo. Há também um modelo .csv para baixar.

## 5. Opções avançadas

- **Desvio padrão sd.** Padrão 4,0 MPa quando não informado (com aviso). Valor 0 não é aceito.
- **Como ajustar a curva.** "Ajustar aos ensaios" (recomendado): o s varia em até ±0,03 em torno do valor do cimento e o nível acompanha os ensaios. "Manter a forma da norma, só ajustar o nível": s fixo do cimento, ajusta-se só o nível.
- **Ignorar no ajuste o ensaio que destoa do vizinho.** Quando a razão entre duas idades fica fora da faixa esperada, o app retira do ajuste o ponto menos conservador. O ponto continua visível no gráfico.

## 6. Base técnica

- **Evolução da resistência** (NBR 6118): fcm(t) = fcm(28) · β1(t), com β1(t) = exp{s · [1 − (28/t)^½]}. O parâmetro s depende do cimento: 0,20 para CP V-ARI, 0,25 para CP I / CP II e 0,38 para CP III / CP IV. Aos 28 dias, β1 = 1.
- **Resistência média alvo** (NBR 12655): fcj = fck + 1,65 · sd, com sd padrão de 4,0 MPa. É o teto do nível ajustado: o fcm ajustado nunca supera esse valor.
- **Ajuste aos ensaios:** mínimos quadrados. Para cada s, o nível fcm tem solução fechada; o s é buscado (seção áurea) numa janela de ±0,03 em torno do valor do cimento (limitada a 0,05–0,60). O ajuste livre (s entre 0,05 e 0,60) aparece só como tendência de referência.
- **Curva de projeção conservadora** = curva média ajustada menos o maior desvio de um ponto de ensaio abaixo dessa curva. Resulta numa curva que passa em ou abaixo de todos os ensaios. Isso NÃO é o fck estatístico de 5% da NBR 12655: não há análise estatística de população, e com poucos CPs isso seria impossível de sustentar.
- **Curva da norma** (cinza tracejada): fcm alvo · β1(t, s do cimento), sem usar ensaios. Se a curva da norma já fica abaixo de todos os ensaios e ajusta melhor que a regressão limitada ao teto, ela é adotada, com aviso.
- **Acima de 28 dias** a projeção é extrapolação, fora do escopo da NBR 6118.
- **Dia para a resistência-alvo** (pergunta inversa): inverte a curva de projeção conservadora f_proj(t) = fcm · exp{s · [1 − (28/t)^½]} − desconto. Solução fechada: t = 28 / [1 − ln((alvo + desconto)/fcm) / s]². Só existe se alvo < fcm · e^s − desconto (o limite da curva quando t cresce); acima disso, ou se t > 90 d, o app diz "Não atinge até 90 d". O dia exibido é o primeiro inteiro com f_proj ≥ alvo.

## 7. Limites de uso

- Ferramenta de apoio à decisão. Não substitui o ensaio físico nem libera estrutura automaticamente.
- Idades até 3 dias dão apenas um sinal (confiança baixa e selo "Indicativo"). A partir de 7 dias a leitura é útil para planejamento; com 14 dias ou mais, a confiança melhora.
- Cura térmica (a vapor, por exemplo) não é considerada: o modelo da NBR 6118 pressupõe cura normal.
- A qualidade do resultado depende da qualidade dos CPs e da correta identificação do cimento.

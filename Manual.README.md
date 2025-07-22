Análise Preditiva de Resistência do Concreto
1. Visão Geral
Esta aplicação web foi desenvolvida para engenheiros civis e profissionais da construção para analisar e prever o ganho de resistência à compressão do concreto ao longo do tempo. A partir de resultados de ensaios de corpos de prova (CPs) em idades iniciais, a ferramenta projeta o comportamento futuro do concreto, permitindo tomadas de decisão mais seguras e eficientes no canteiro de obras.

O principal diferencial da ferramenta é o cálculo de uma Curva Característica Estimada, que fornece uma projeção de resistência a favor da segurança, respeitando os resultados já obtidos em laboratório.

Desenvolvido por: Leandro Hildinger Cavalcanti

2. Funcionalidades Principais
Visualização de Dados: Plota os resultados reais dos ensaios em um gráfico interativo de Resistência (MPa) vs. Idade (dias).

Curvas Teóricas de Referência: Exibe as curvas de ganho de resistência teóricas baseadas na NBR 6118 para cimentos de classes CP II (s=0,25) e CP V-ARI (s=0,20).

Cálculo da Curva Característica Estimada: Utiliza os dados de ensaio para calcular o coeficiente de cura (s) real do concreto e, a partir dele, traça uma curva de segurança que serve como limite inferior para o ganho de resistência esperado.

Análise Preditiva: Permite ao usuário inserir qualquer idade futura (em dias) e obter a resistência característica estimada para aquela data.

Edição Interativa: Os dados de ensaio podem ser adicionados, editados ou removidos diretamente na interface, com atualização automática do gráfico e dos cálculos.

3. Guia de Utilização
A interface é dividida em duas seções principais: o Gráfico de Resistência à esquerda e o painel de Controles e Dados à direita.

3.1. Parâmetros do Projeto
Resistência Característica (fck): Insira o fck de projeto em MPa. Este valor é usado para calcular a resistência média de dosagem (fcm = fck + 8 MPa), que serve como base para todas as curvas de evolução, e também para traçar a linha de referência no gráfico.

3.2. Resultados dos Ensaios (CPs)
Esta tabela é o coração da análise.

Para Adicionar um Ponto: Clique no botão "Adicionar Ponto de Ensaio". Uma nova linha aparecerá na tabela.

Para Editar um Ponto: Simplesmente altere os valores nos campos "Idade (dias)" ou "Resistência (MPa)". O gráfico e as curvas serão recalculados automaticamente.

Para Remover um Ponto: Clique no botão "Remover" na linha correspondente.

3.3. Análise Preditiva
Este painel fornece os resultados da modelagem matemática.

Coeficiente 's' Médio (Estimado): Este é o coeficiente de cura (s) calculado via regressão para melhor se ajustar aos seus dados de ensaio. Ele reflete a velocidade real de ganho de resistência do seu traço de concreto.

Calcular resistência para: Insira a idade (em dias) para a qual você deseja estimar a resistência.

Resistência Característica Estimada: Este é o resultado final. Ele mostra a resistência mínima esperada para a idade informada, calculada a partir da curva de segurança.

4. Base Técnica
A ferramenta emprega a metodologia de ganho de resistência descrita na ABNT NBR 6118:2014.

Fórmula de Evolução da Resistência: A base do cálculo é a fórmula:

f_cm(t) = f_cm(28) * exp(s * (1 - (28/t)^0.5))

Onde:

f_cm(t): Resistência média à compressão na idade t.

f_cm(28): Resistência média à compressão aos 28 dias (adotada como fck + 8 MPa).

s: Coeficiente de cura, que depende do tipo de cimento.

t: Idade do concreto em dias.

Cálculo do Coeficiente 's' Real: A aplicação utiliza um método de regressão por mínimos quadrados para encontrar o valor de s que melhor se ajusta aos pontos de ensaio inseridos pelo usuário. Este s representa o comportamento real do concreto em análise.

Cálculo da Curva Característica (Segurança): Para garantir uma projeção a favor da segurança, a ferramenta adota a seguinte lógica:
a. Calcula a curva de tendência média usando o s real.
b. Identifica qual ponto de ensaio possui a maior distância vertical (diferença) abaixo da curva média.
c. Usa essa distância máxima como um "deslocamento de segurança" (safetyOffset).
d. A Curva Característica Estimada é então traçada deslocando a curva média inteira para baixo pelo valor do safetyOffset.

Isso garante que a curva de projeção sempre passe em ou abaixo de todos os resultados de ensaio já conhecidos, fornecendo um limite inferior confiável para a resistência futura.

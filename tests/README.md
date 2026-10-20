# Testes do núcleo de cálculo

Sem dependências (Node 24). Na pasta `02_app`:

    node --test

- `ouro.test.js`: compara `js/calc.js` com a cópia congelada do núcleo original (`ref/nucleo_original_6e0bdc9.js`, index.html linhas 269-513) e com `fixtures_ouro.json`, tolerância 1e-9.
- `cenarios.js`: cenários e a cola que reproduz `App.update` e as fórmulas de exibição do app atual.
- `gerar_fixtures.js`: regrava `fixtures_ouro.json` a partir do núcleo original. Em M2, toda mudança de número em relação às fixtures precisa citar o ID do achado (C-xx, T-xx) ou a decisão (D1-D4).
- `m2.test.js`: testes do M2 (um bloco por ID de achado corrigido e pelas decisões D2, D3, D4) sobre `analyze` e `parseCsv`.
- Mudança de número já aceita: cenário `g2_s_personalizado_060` (T-23), documentada em `MUDANCAS_M2` dentro de `ouro.test.js`.

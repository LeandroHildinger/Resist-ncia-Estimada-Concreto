# vendor/ (M4.4, autorizado por Leandro em 20/10/2026)

Bibliotecas servidas localmente: o app abre offline, inclusive por `file://`, e não depende de CDN.
Baixadas em 20/10/2026 do pacote npm oficial via jsDelivr (`cdn.jsdelivr.net/npm/<pacote>@<versão exata>/...`).
O SHA-256 de cada arquivo foi conferido com o índice oficial do jsDelivr (`data.jsdelivr.com/v1/package/npm/<pacote>@<versão>/flat`): idêntico.

| Biblioteca | Versão | Arquivo local | Origem | SHA-384 | Licença |
|---|---|---|---|---|---|
| Chart.js | 3.9.1 | `chart.js-3.9.1/chart.min.js` | https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js | `sha384-9MhbyIRcBVQiiC7FSd7T38oJNj2Zh+EfxS7/vjhBi4OOT78NlHSnzM31EZRWR1LZ` | MIT (`chart.js-3.9.1/LICENSE.md`) |
| chartjs-plugin-annotation | 1.4.0 | `chartjs-plugin-annotation-1.4.0/chartjs-plugin-annotation.min.js` | https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@1.4.0/dist/chartjs-plugin-annotation.min.js | `sha384-WVRZ5bDoBpBp9eKFxji3f7JiiY/SCi2kWJpzG+AgHnafhqQOzp4mmqsPBZgiCxlu` | MIT (`chartjs-plugin-annotation-1.4.0/LICENSE.md`) |
| jsPDF | 2.5.1 | `jspdf-2.5.1/jspdf.umd.min.js` | https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js | `sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk` | MIT (`jspdf-2.5.1/LICENSE`) |

Nenhuma outra dependência. KaTeX e html2canvas saíram no M4 (equações em HTML/texto; PDF em texto nativo do jsPDF).

## Por que as tags não têm `integrity`

O SRI bloqueia scripts abertos por `file://` (cada arquivo local é tratado como outra origem): testado, com `integrity` o Chart.js e o jsPDF não carregavam pelo duplo clique. Como os arquivos são locais, o controle de integridade fica em `tests/vendor.test.js`, que confere o SHA-384 de cada arquivo com a tabela acima (`node --test`).

## Como atualizar uma biblioteca

1. Baixar a versão exata da URL oficial acima (trocando a versão) para uma pasta nova `vendor/<pacote>-<versão>/`, com a licença.
2. Conferir o SHA-256 com `data.jsdelivr.com` e calcular o SHA-384: `openssl dgst -sha384 -binary ARQUIVO | openssl base64 -A`.
3. Atualizar `index.html`, a lista `LOCAIS` do `sw.js`, esta tabela e `tests/vendor.test.js`.
4. Subir `ESTIMATIVA_PUBLICACAO` em `js/versao.js` e o mesmo valor nos `?v=` do `index.html` (troca o cache do service worker e as URLs; `tests/publicacao.test.js` confere). Vale para qualquer publicação, não só troca de biblioteca.

## Chart.js 4.x?

Não é troca trivial: o pacote 4 muda o arquivo UMD (`chart.umd.js`) e exige o annotation 2.x/3.x, que muda opções de rótulo (`label.display` no lugar de `label.enabled`, posições e eventos). Mantidos 3.9.1 + annotation 1.4.0 (o liga/desliga de anotação usa `display`, C-06).

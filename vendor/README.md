# vendor/ (M4c, aguardando o aval do Leandro para baixar)

Nada foi baixado ainda. Quando houver aval, baixar só da fonte oficial (pacote npm via jsDelivr), conferir o hash e trocar as tags do `index.html`.

| Biblioteca | Versão | URL oficial (npm via jsDelivr) | Destino local |
|---|---|---|---|
| Chart.js | 3.9.1 | https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js | `vendor/chart.js-3.9.1/chart.min.js` |
| chartjs-plugin-annotation | 1.4.0 | https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@1.4.0/dist/chartjs-plugin-annotation.min.js | `vendor/chartjs-plugin-annotation-1.4.0/chartjs-plugin-annotation.min.js` |
| jsPDF | 2.5.1 | https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js | `vendor/jspdf-2.5.1/jspdf.umd.min.js` |

Já não são usados (removidos no M4): KaTeX (equações viraram HTML simples na tela e texto no PDF) e html2canvas (o PDF agora é texto nativo do jsPDF e o gráfico vem do próprio canvas). Também a licença de cada biblioteca (MIT) será copiada junto (`LICENSE` de cada pacote).

## Tags que entram no index.html (o hash é calculado depois do download)

```html
<script src="vendor/chart.js-3.9.1/chart.min.js" integrity="sha384-PENDENTE" crossorigin="anonymous"></script>
<script src="vendor/chartjs-plugin-annotation-1.4.0/chartjs-plugin-annotation.min.js" integrity="sha384-PENDENTE" crossorigin="anonymous"></script>
<script src="vendor/jspdf-2.5.1/jspdf.umd.min.js" integrity="sha384-PENDENTE" crossorigin="anonymous"></script>
```

Hash: `openssl dgst -sha384 -binary ARQUIVO | openssl base64 -A` (prefixar `sha384-`). Conferir o mesmo arquivo contra a URL oficial antes de gravar o hash. Depois incluir os 3 arquivos na lista `LOCAIS` do `sw.js` e subir `VERSAO_CACHE`.

## Chart.js 4.x?

Não é troca trivial: o pacote 4 muda o arquivo UMD (`chart.umd.js`) e exige o annotation 2.x/3.x, que muda opções de rótulo (`label.display` no lugar de `label.enabled`, posições e eventos). Recomendação: manter 3.9.1 + annotation 1.4.0 (o liga/desliga de anotação já usa `display`, C-06).

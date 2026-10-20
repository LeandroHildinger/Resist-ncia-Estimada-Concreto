/* Versão única do Estimativa fck: usada na tela, no PDF e no nome do cache do service worker.
 * A CADA PUBLICAÇÃO no GitHub Pages: subir PUBLICACAO aqui E o mesmo valor nos "?v=" do index.html
 * (o teste tests/publicacao.test.js falha se estiverem diferentes). Isso troca o cache do sw.js e as
 * URLs dos arquivos, e evita misturar index.html nova com app.js velho (A3-03, A3-18). */
self.ESTIMATIVA_VERSAO = '2.0';
self.ESTIMATIVA_PUBLICACAO = '2026-10-20.3';

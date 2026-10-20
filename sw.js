/* Estimativa fck - service worker (M4).
 * Arquivos locais: cache primeiro com atualização em segundo plano (offline depois da 1ª visita;
 * uma versão nova publicada aparece na abertura seguinte).
 * Outras origens (desde o M4.4 o app não usa nenhuma): rede primeiro, cópia em cache como reserva. */
importScripts('js/versao.js');   // versão única (A3-03): o cache muda a cada publicação
const VERSAO_CACHE = `estimativa-fck-v${self.ESTIMATIVA_VERSAO}-${self.ESTIMATIVA_PUBLICACAO}`;
const LOCAIS = [
    './', './index.html', './css/app.css', './js/versao.js', './js/calc.js', './js/app.js',
    './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
    './vendor/chart.js-3.9.1/chart.min.js',
    './vendor/chartjs-plugin-annotation-1.4.0/chartjs-plugin-annotation.min.js',
    './vendor/jspdf-2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', ev => {
    // cache: 'reload' ignora o cache HTTP do navegador na instalação (A3-03)
    ev.waitUntil(caches.open(VERSAO_CACHE).then(c => c.addAll(LOCAIS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
    ev.waitUntil(
        caches.keys()
            .then(chaves => Promise.all(chaves.filter(k => k.startsWith('estimativa-fck-') && k !== VERSAO_CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', ev => {
    const req = ev.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin === self.location.origin) {
        // Cache primeiro; em paralelo busca a versão nova e atualiza o cache (vale na próxima abertura).
        // A3-13: procura só no cache deste app (a origem github.io é compartilhada com outros repositórios).
        // A3-03: revalidação com cache 'no-cache' (o navegador confere com o servidor, sem usar cópia HTTP velha).
        ev.respondWith(
            caches.open(VERSAO_CACHE).then(c => c.match(req, { ignoreSearch: true })).then(hit => {
                const daRede = fetch(req, { cache: 'no-cache' }).then(resp => {
                    if (resp.ok) { const copia = resp.clone(); caches.open(VERSAO_CACHE).then(c => c.put(req, copia)); }
                    return resp;
                }).catch(() => hit);
                return hit || daRede;
            })
        );
    } else {
        // CDN: rede primeiro, com limite de 3 s antes de usar a cópia guardada (A3-13: sinal fraco não segura a abertura).
        const doCache = () => caches.open(VERSAO_CACHE).then(c => c.match(req));
        const rede = fetch(req).then(resp => {
            if (resp.ok || resp.type === 'opaque') { const copia = resp.clone(); caches.open(VERSAO_CACHE).then(c => c.put(req, copia)); }
            return resp;
        });
        ev.respondWith(new Promise(resolve => {
            let feito = false;
            const usar = resp => { if (!feito && resp) { feito = true; resolve(resp); } };
            const t = setTimeout(() => doCache().then(usar), 3000);
            rede.then(resp => { clearTimeout(t); usar(resp); })
                .catch(() => { clearTimeout(t); doCache().then(hit => { if (hit) usar(hit); else if (!feito) { feito = true; resolve(Response.error()); } }); });
        }));
    }
});

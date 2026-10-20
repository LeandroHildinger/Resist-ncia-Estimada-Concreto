/* Estimativa fck - service worker (M4).
 * Arquivos locais: cache primeiro com atualização em segundo plano (offline depois da 1ª visita;
 * uma versão nova publicada aparece na abertura seguinte).
 * Bibliotecas externas (CDN, até a vendorização): rede primeiro, cópia em cache como reserva. */
const VERSAO_CACHE = 'estimativa-fck-v2.0';
const LOCAIS = [
    './', './index.html', './css/app.css', './js/calc.js', './js/app.js',
    './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', ev => {
    ev.waitUntil(caches.open(VERSAO_CACHE).then(c => c.addAll(LOCAIS)).then(() => self.skipWaiting()));
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
        ev.respondWith(
            caches.match(req, { ignoreSearch: true }).then(hit => {
                const daRede = fetch(req).then(resp => {
                    if (resp.ok) { const copia = resp.clone(); caches.open(VERSAO_CACHE).then(c => c.put(req, copia)); }
                    return resp;
                }).catch(() => hit);
                return hit || daRede;
            })
        );
    } else {
        ev.respondWith(
            fetch(req).then(resp => {
                if (resp.ok || resp.type === 'opaque') { const copia = resp.clone(); caches.open(VERSAO_CACHE).then(c => c.put(req, copia)); }
                return resp;
            }).catch(() => caches.match(req))
        );
    }
});

// P7b-2 (TER-06): service worker aplikacji „w terenie” – praca bez internetu. Zakres: /keystatic/teren (nagłówek
// Service-Worker-Allowed w next.config.mjs). Plik publiczny, bez żadnych danych. Dane planu i kolejka są w IndexedDB
// (app/keystatic/teren/pamiec.ts) – tu tylko kod strony i pliki planu (podkłady, ikony) w pamięci podręcznej telefonu.
//   strony terenu          – najpierw sieć, bez sieci kopia z telefonu
//   /_next/static/*        – najpierw kopia z telefonu (nazwy plików zmieniają się z każdym wydaniem)
//   pliki planu i ikony    – najpierw kopia z telefonu („pobierz do pracy bez internetu”)
//   wszystko inne          – bez zmian (API, logowanie, reszta panelu)
const KOD = 'teren-kod-'
const PLIKI = 'teren-pliki'
const ZAKRES = '/keystatic/teren'
const STRONY = ['/keystatic/teren', '/keystatic/teren/nowe', '/keystatic/teren/wyslij', '/keystatic/teren/konto']

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

const wTerenie = (u) => u.pathname === ZAKRES || u.pathname.startsWith(ZAKRES + '/')
const plikPlanu = (u) => /^\/api\/keystatic\/plany\/[^/]+\/plik\/[^/]+$/.test(u.pathname) || u.pathname.startsWith('/plany/ikona/')
const daneRoutera = (req, u) => req.headers.get('RSC') === '1' || u.searchParams.has('_rsc')

async function kopia(req) {
    return (await caches.match(req, { ignoreSearch: false })) || null
}

async function zapiszKod(req, odp) {
    if (!odp || !odp.ok || odp.redirected || odp.type !== 'basic') return
    const nazwy = (await caches.keys()).filter((k) => k.startsWith(KOD)).sort()
    const c = await caches.open(nazwy[nazwy.length - 1] || KOD + '0')
    await c.put(req, odp)
}

self.addEventListener('fetch', (e) => {
    const req = e.request
    if (req.method !== 'GET') return
    const u = new URL(req.url)
    if (u.origin !== self.location.origin) return

    if (u.pathname.startsWith('/_next/static/')) {
        e.respondWith((async () => (await kopia(req)) || fetch(req).then((odp) => { zapiszKod(req, odp.clone()); return odp }))())
        return
    }
    if (plikPlanu(u)) {
        e.respondWith((async () => (await caches.match(req, { cacheName: PLIKI })) || fetch(req))())
        return
    }
    if (!wTerenie(u)) return
    if (req.mode === 'navigate') {
        // strona terenu: najpierw sieć; bez sieci (albo przekierowanie na „zaloguj” bez sieci) – kopia z telefonu
        e.respondWith((async () => {
            try {
                const odp = await fetch(req)
                if (odp.ok && !odp.redirected) zapiszKod(new Request(u.origin + u.pathname), odp.clone())
                return odp
            } catch {
                const k = await caches.match(u.origin + u.pathname)
                return k || new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>w terenie</title>'
                    + '<p style="font:16px system-ui;padding:24px">Brak internetu, a tej strony nie ma w telefonie. Wróć do <a href="/keystatic/teren">planów</a>.</p>',
                    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
            }
        })())
        return
    }
    if (daneRoutera(req, u)) {
        // przejście między ekranami bez sieci: błąd sieci → router przechodzi na zwykłe przeładowanie (kopia strony wyżej)
        e.respondWith(fetch(req).catch(() => Response.error()))
    }
})

// „przygotuj”: strony terenu (i pobrane plany) z ich plikami kodu do nowej kopii; stare kopie kodu usuwane po udanym zapisie.
let ostatnio = 0
async function przygotuj(plany) {
    const nowa = KOD + Date.now(), c = await caches.open(nowa)
    const adresy = [...STRONY, ...plany.map((s) => `${ZAKRES}/plan/${encodeURIComponent(s)}`)]
    const kod = new Set()
    for (const a of adresy) {
        const odp = await fetch(a, { credentials: 'same-origin', cache: 'no-store' })
        if (!odp.ok || odp.redirected) throw new Error('strona ' + a + ' – ' + odp.status)
        const html = await odp.clone().text()
        for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) kod.add(m[0])
        await c.put(self.location.origin + a, odp)
    }
    for (const a of kod) {
        const odp = (await caches.match(a)) || (await fetch(a))
        if (odp.ok) await c.put(a, odp.clone())
    }
    for (const k of await caches.keys()) if (k.startsWith(KOD) && k !== nowa) await caches.delete(k)
    return kod.size
}

self.addEventListener('message', (e) => {
    const d = e.data || {}
    if (d.typ !== 'przygotuj') return
    const teraz = Date.now()
    if (!d.zawsze && teraz - ostatnio < 3600_000) { e.source && e.source.postMessage({ typ: 'przygotowane', pominieto: true }); return }
    e.waitUntil(przygotuj(Array.isArray(d.plany) ? d.plany : [])
        .then((n) => { ostatnio = teraz; e.source && e.source.postMessage({ typ: 'przygotowane', pliki: n }) })
        .catch((b) => { e.source && e.source.postMessage({ typ: 'przygotowane', blad: String(b && b.message || b) }) }))
})

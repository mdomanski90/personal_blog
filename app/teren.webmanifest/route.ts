// P7b (TER-01): manifest aplikacji „w terenie” (ikona na ekranie telefonu). Publiczny – nie zawiera żadnych danych;
// sama aplikacja (/keystatic/teren) wymaga zalogowania kluczem dostępu.
export const dynamic = 'force-static'

export function GET() {
    return new Response(JSON.stringify({
        name: 'odniepamieci.pl – w terenie', short_name: 'w terenie', lang: 'pl', dir: 'ltr',
        description: 'Zdjęcia grobów, napisy i nowe miejsca – praca z telefonem.',
        id: '/keystatic/teren', start_url: '/keystatic/teren', scope: '/keystatic/teren',
        display: 'standalone', orientation: 'portrait',
        background_color: '#e6e6ea', theme_color: '#f5f5f7', // styl-dynamiczny: manifest aplikacji nie zna tokenów CSS – wartości --pn-tlo i --pn-karta z panel.css
        icons: [
            { src: '/teren/ikona-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/teren/ikona-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/teren/ikona-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    }), { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
}

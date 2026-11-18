import path from 'node:path'
import sharp from 'sharp'
import { material, rozwiazOdnosniki, widoczne } from '@/lib/archiwum'
import { ADRES_STRONY } from '@/lib/strona'
import { ADRES_PLIKOW, KATALOG_PLIKOW } from '@/lib/pliki'
import { objasnieniaMaterialu, stronaW3C } from '@/lib/objasnienia'
import { FORMAT_OBRAZU, manifestMaterialu, type StronaIIIF } from '@/lib/iiif'

// P5 (PD-05): manifest IIIF Presentation 3.0 materiału PUBLICZNEGO ze skanami (strony z panelu albo sam plik-obraz),
// z publicznymi objaśnieniami jako adnotacjami płócien. Zawsze poziom „publiczne” – niezależnie od zalogowania.
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const m = await material(slug, 'publiczne')
    if (!m || !m.strony.length) return new Response('Nie znaleziono', { status: 404 })
    const rozwiaz = await rozwiazOdnosniki('publiczne')
    const objasnienia = objasnieniaMaterialu(m.id).filter((o) => widoczne(o.widocznosc, 'publiczne'))
    const strony: StronaIIIF[] = []
    for (const [i, s] of m.strony.entries()) {
        if (!s.adres.startsWith(ADRES_PLIKOW)) continue
        const rel = decodeURIComponent(s.adres.slice(ADRES_PLIKOW.length))
        if (rel.split('/').includes('..')) continue
        const plik = path.join(/*turbopackIgnore: true*/ process.cwd(), KATALOG_PLIKOW, rel)
        const format = FORMAT_OBRAZU[path.extname(plik).slice(1).toLowerCase()]
        if (!format) continue
        let szer = 0, wys = 0
        try { const md = await sharp(plik).metadata(); szer = md.width ?? 0; wys = md.height ?? 0 } catch { continue }
        if (!szer || !wys) continue
        const nazwa = path.basename(rel)
        const plotno = `${ADRES_STRONY}/archiwum/${m.id}/iiif/plotno/${i + 1}`
        const naStronie = objasnienia.filter((o) => o.strona === nazwa)
        strony.push({
            obraz: `${ADRES_STRONY}${s.adres}`, format, szer, wys, podpis: s.podpis,
            objasnienia: naStronie.length ? stronaW3C(naStronie, {
                wymiary: () => [szer, wys], idAdnotacji: (n) => `${plotno}/objasnienia/${n}`, zrodlo: () => plotno,
                powiazanie: (p) => { const c = rozwiaz(p); return c ? `${ADRES_STRONY}${c.adres}` : null },
            }).items : undefined,
        })
    }
    if (!strony.length) return new Response('Nie znaleziono', { status: 404 })
    const dane = manifestMaterialu(ADRES_STRONY, {
        id: m.id, nazwa: m.nazwa, czas: m.czas, tworca: m.tworca, sygnatura: m.sygnatura, przechowywanie: m.miejscePrzechowywania, prawa: m.prawa, zrodlo: m.podpisZrodla,
    }, strony)
    return new Response(JSON.stringify(dane, null, 1), {
        headers: { 'Content-Type': 'application/ld+json; profile="http://iiif.io/api/presentation/3/context.json"; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' },
    })
}

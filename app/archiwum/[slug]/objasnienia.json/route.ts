import { material, poziomCzytelnika, rozwiazOdnosniki, widoczne } from '@/lib/archiwum'
import { ADRES_STRONY } from '@/lib/strona'
import path from 'node:path'
import sharp from 'sharp'
import { adresStrony, katalogStron, stronyMaterialu } from '@/lib/strony-materialow'
import { objasnieniaMaterialu, stronaW3C, wKolejnosci } from '@/lib/objasnienia'

// Objaśnienia skanu w formacie W3C Web Annotation (AnnotationPage) – dla przeglądarek archiwalnych i narzędzi
// badawczych. Tylko to, co widzi czytelnik.
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const poziom = await poziomCzytelnika()
    const m = await material(slug, poziom)
    if (!m) return new Response('Nie znaleziono', { status: 404 })
    const strony = stronyMaterialu(m.id).map((s) => s.plik)
    const rozwiaz = await rozwiazOdnosniki(poziom)
    const adres = `${ADRES_STRONY}/archiwum/${m.id}/objasnienia.json`
    const lista = wKolejnosci(objasnieniaMaterialu(m.id).filter((o) => widoczne(o.widocznosc, poziom) && strony.includes(o.strona)), strony)
    // PH-01 (K9): wielokąt i punkt eksportowane jako SvgSelector w pikselach oryginału – wymiary z pliku strony
    const wymiary = new Map<string, [number, number] | null>()
    for (const p of new Set(lista.filter((o) => o.ksztalt).map((o) => o.strona))) {
        try { const m0 = await sharp(path.join(/*turbopackIgnore: true*/ katalogStron(m.id), p)).metadata(); wymiary.set(p, m0.width && m0.height ? [m0.width, m0.height] : null) } catch { wymiary.set(p, null) }
    }
    const dane = stronaW3C(lista, {
        wymiary: (p) => wymiary.get(p) ?? null,
        id: adres,
        idAdnotacji: (i) => `${adres}#${i}`,
        zrodlo: (p) => `${ADRES_STRONY}${adresStrony(m.id, p)}`,
        powiazanie: (p) => { const c = rozwiaz(p); return c ? `${ADRES_STRONY}${c.adres}` : null },
    })
    return new Response(JSON.stringify(dane, null, 2), {
        headers: { 'Content-Type': 'application/ld+json; profile="http://www.w3.org/ns/anno.jsonld"; charset=utf-8', 'Cache-Control': poziom === 'publiczne' ? 'public, max-age=300' : 'private, no-store' },
    })
}

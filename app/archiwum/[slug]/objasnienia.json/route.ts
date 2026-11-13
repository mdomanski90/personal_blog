import { material, poziomCzytelnika, rozwiazOdnosniki, widoczne } from '@/lib/archiwum'
import { ADRES_STRONY } from '@/lib/strona'
import { adresStrony, stronyMaterialu } from '@/lib/strony-materialow'
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
    const dane = stronaW3C(lista, {
        id: adres,
        idAdnotacji: (i) => `${adres}#${i}`,
        zrodlo: (p) => `${ADRES_STRONY}${adresStrony(m.id, p)}`,
        powiazanie: (p) => { const c = rozwiaz(p); return c ? `${ADRES_STRONY}${c.adres}` : null },
    })
    return new Response(JSON.stringify(dane, null, 2), {
        headers: { 'Content-Type': 'application/ld+json; profile="http://www.w3.org/ns/anno.jsonld"; charset=utf-8', 'Cache-Control': poziom === 'publiczne' ? 'public, max-age=300' : 'private, no-store' },
    })
}

// Łatka 21.11: podgląd linku do wpisu – miniatura z materiału wpisu (gdy publiczny) i tytuł; wpis niepubliczny – wizytówka serwisu
import { material, opowiesc, RODZAJE_OPOWIESCI } from '@/lib/archiwum'
import { formatujEdtf } from '@/lib/edtf'
import { kartaOg, obrazPliku } from '@/lib/og/karta'

export const alt = 'podgląd wpisu – odniepamieci.pl'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/jpeg'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const o = await opowiesc(slug, 'publiczne')
    if (!o) return kartaOg()
    const m = o.miniatura ? await material(o.miniatura, 'publiczne') : null
    return kartaOg({ tytul: o.tytul, linia: ['wpis', RODZAJE_OPOWIESCI[o.rodzaj] ?? o.rodzaj, o.data ? formatujEdtf(o.data) : ''].filter(Boolean), obraz: await obrazPliku(m?.strony[0]?.adres) })
}

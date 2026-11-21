// Łatka 21.11: podgląd linku do obiektu w terenie – pierwsze zdjęcie i nazwa; obiekt niepubliczny – wizytówka serwisu
import { obiekt } from '@/lib/archiwum'
import { NAZWY_OBIEKTOW } from '@/lib/tarcze'
import { kartaOg, obrazPliku } from '@/lib/og/karta'

export const alt = 'podgląd obiektu – odniepamieci.pl'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/jpeg'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const o = await obiekt(slug, 'publiczne')
    if (!o) return kartaOg()
    return kartaOg({ tytul: o.nazwa, linia: ['w terenie', NAZWY_OBIEKTOW[o.rodzaj] ?? o.rodzaj], obraz: await obrazPliku(o.zdjecia[0]?.plik) })
}

// Łatka 21.11: podgląd linku do karty materiału – skan pierwszej strony i tytuł; tylko materiał publiczny (komunikator nie jest zalogowany)
import { material } from '@/lib/archiwum'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { formatujEdtf } from '@/lib/edtf'
import { kartaOg, obrazPliku } from '@/lib/og/karta'

export const alt = 'podgląd karty materiału – odniepamieci.pl'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/jpeg'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const m = await material(slug, 'publiczne')
    if (!m) return kartaOg()
    return kartaOg({ tytul: m.nazwa, linia: ['archiwum', RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj, m.czas ? formatujEdtf(m.czas) : ''].filter(Boolean), obraz: await obrazPliku(m.strony[0]?.adres) })
}

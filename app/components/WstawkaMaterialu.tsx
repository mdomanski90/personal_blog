import { Link } from 'next-view-transitions'
import { kontekstTresci, material, objasnieniaDoWidoku, type Widocznosc } from '@/lib/archiwum'
import { naHtml, rozdzielZrodla } from '@/lib/markdoc'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { formatujEdtf } from '@/lib/edtf'
import SkanZTekstem from './SkanZTekstem'

/**
 * JW-2 (JW-13, decyzja 16.11): materiał ze skanem osadzony we wpisie pokazuje ten sam widok co karta materiału
 * (SkanZTekstem: skan 713 px + transkrypcja / tłumaczenie) na pełnej szerokości, z podpisem i przyciskiem
 * „pełny widok w archiwum →”. Materiał niewidoczny dla czytelnika się nie pokazuje. Strona opakowuje go w <PelnaSzerokosc>.
 */
export default async function WstawkaMaterialu({ id, poziom }: { id: string; poziom: Widocznosc }) {
    const m = await material(id, poziom)
    if (!m || !m.strony.length) return null
    const ktx = await kontekstTresci(poziom)
    const cz = rozdzielZrodla(m.opis)
    const obj = await objasnieniaDoWidoku(m.id, poziom)
    const czas = m.czas ? formatujEdtf(m.czas) : ''
    return (
            <figure className="material-wstawka-widok">
                <SkanZTekstem strony={m.strony} objasnienia={obj} tytul={m.nazwa} transkrypcja={naHtml(cz.transkrypcja, ktx)} tlumaczenie={naHtml(cz.tlumaczenie, ktx)} oryginal={naHtml(cz.oryginal, ktx)} opracowal={m.opracowal || undefined} />
                <figcaption className="material-wstawka-podpis">
                    <span>{[m.nazwa, RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj, czas && !m.nazwa.includes(czas) ? czas : ''].filter(Boolean).join(' · ')}</span>
                    <Link href={`/archiwum/${m.id}`} className="k-btn k-btn--s">pełny widok w archiwum →</Link>
                </figcaption>
            </figure>
    )
}

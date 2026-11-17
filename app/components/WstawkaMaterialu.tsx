import { Link } from 'next-view-transitions'
import { kontekstTresci, material, objasnieniaDoWidoku, podpisZrodlaMaterialu, type Widocznosc } from '@/lib/archiwum'
import { indeksStrony, naHtml, rozdzielZrodla } from '@/lib/markdoc'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { formatujEdtf } from '@/lib/edtf'
import SkanZTekstem from './SkanZTekstem'

/**
 * JW-2 (JW-13, decyzja 16.11): materiał ze skanem osadzony we wpisie pokazuje ten sam widok co karta materiału
 * (SkanZTekstem: skan 713 px + transkrypcja / tłumaczenie) na pełnej szerokości, z podpisem i przyciskiem
 * „pełny widok w archiwum →”. Materiał niewidoczny dla czytelnika się nie pokazuje. Strona opakowuje go w <PelnaSzerokosc>.
 * Etap R: podpis i strona z bloku (PD-07 – wcześniej gubione), linia „źródło:” jak na karcie materiału (SRC-01).
 */
export default async function WstawkaMaterialu({ id, poziom, podpis, strona }: { id: string; poziom: Widocznosc; podpis?: string; strona?: number }) {
    const m = await material(id, poziom)
    if (!m || !m.strony.length) return null
    const ktx = await kontekstTresci(poziom)
    const cz = rozdzielZrodla(m.opis)
    const obj = await objasnieniaDoWidoku(m.id, poziom)
    const czas = m.czas ? formatujEdtf(m.czas) : ''
    const zrodlo = podpisZrodlaMaterialu(m)
    return (
            <figure className="material-wstawka-widok">
                <SkanZTekstem startowa={indeksStrony(strona, m.strony.length)} strony={m.strony} objasnienia={obj} tytul={m.nazwa} transkrypcja={naHtml(cz.transkrypcja, ktx)} tlumaczenie={naHtml(cz.tlumaczenie, ktx)} oryginal={naHtml(cz.oryginal, ktx)} opracowal={m.opracowal || undefined} />
                <figcaption className="material-wstawka-podpis">
                    <span>{[podpis || m.nazwa, RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj, czas && !(podpis || m.nazwa).includes(czas) ? czas : ''].filter(Boolean).join(' · ')}</span>
                    <Link href={`/archiwum/${m.id}`} className="k-btn k-btn--s">pełny widok w archiwum →</Link>
                    {zrodlo && <p className="podpis-zrodla wstawka-zrodlo"><span>źródło:</span> {zrodlo}</p>}
                </figcaption>
            </figure>
    )
}

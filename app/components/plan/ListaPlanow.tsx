import { Link } from 'next-view-transitions'
import type { Plan } from '@/lib/plany/model'
import { katalog } from '@/lib/plany/typy'
import { planyWKolejnosci } from '@/lib/plany/metadane'
import { adresPlanu, opisPlanu } from '@/lib/plany/katalog'
import { wczytajUstawienia } from '@/lib/plany/dane'
import { materialy, poziomCzytelnika } from '@/lib/archiwum'
import { PozycjaWKarcie } from '../KartaPozycji'
import MiniaturaPlanu from './MiniaturaPlanu'

/** W karcie tyle planów; więcej – odnośnik do spisu „wszystkie plany” z filtrem miejscowości. */
const W_KARCIE = 6

/**
 * PH-23: plany przy miejscowości albo obiekcie – wzorzec „pozycja w karcie” z miniaturą 160×120 przy prawej krawędzi.
 * `plany` muszą być w wersji dla czytelnika (planyDlaCzytelnika) – liczby i miniatury bez elementów ukrytych.
 */
export default async function ListaPlanow({ plany, wszystkie }: { plany: Plan[]; wszystkie?: string }) {
    const [u, mat] = await Promise.all([wczytajUstawienia(), materialy(await poziomCzytelnika())])
    const typy = katalog(u)
    const skany = new Map(mat.map((m) => [m.id, m.strony[0]?.adres]))
    const L = planyWKolejnosci(plany)
    return (
        <div className="ksiegi-w-karcie">
            {L.slice(0, W_KARCIE).map((p) => {
                const o = opisPlanu(p, typy), href = adresPlanu(p, new Set(skany.keys()))
                const skan = p.zrodlo?.material ? skany.get(p.zrodlo.material) : undefined
                return (
                    <PozycjaWKarcie key={p.slug} etykieta={p.tytul} tytul={<Link href={href} className="odn">{p.tytul}</Link>} prawa={o.prawa}
                        pola={o.pola.filter(([e, v]) => !(e === 'na planie' && v === o.prawa))}
                        miniatura={<Link href={href} tabIndex={-1} aria-hidden="true"><MiniaturaPlanu slug={p.slug} skan={skan} /></Link>} />
                )
            })}
            {wszystkie && L.length > W_KARCIE && <p className="ot-drobne"><Link href={wszystkie} className="odn">wszystkie plany ({L.length}) →</Link></p>}
        </div>
    )
}

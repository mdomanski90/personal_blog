import { Link } from 'next-view-transitions'
import { W } from './Karta'

// KAT-03: numer katalogowy na stronie pozycji – wiersz metryczki (tabela karty) albo krótka linia (wpis, plan),
// zawsze z odnośnikiem do stałego adresu /k/NR.

export function WierszNrKat({ nr }: { nr: string | null }) {
    if (!nr) return null
    return <W e="nr kat."><span className="nr-kat">{nr}</span> · <Link href={`/k/${nr}`} className="odn">stały adres</Link></W>
}

export function LiniaNrKat({ nr }: { nr: string | null }) {
    if (!nr) return null
    return <p className="karta-linia">nr kat. <span className="nr-kat">{nr}</span> · <Link href={`/k/${nr}`} className="odn">stały adres</Link></p>
}

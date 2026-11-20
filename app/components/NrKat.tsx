import { Link } from 'next-view-transitions'
import { W } from './Karta'

// KAT-03: numer katalogowy na stronie pozycji – wiersz metryczki (tabela karty) albo krótka linia (wpis, plan).
// Uwaga właściciela 20.11 (P7c): sam numer jest odnośnikiem do stałego adresu /k/NR – bez dopisku „stały adres” obok.

const Numer = ({ nr }: { nr: string }) => <Link href={`/k/${nr}`} className="odn nr-kat" title="stały adres tej strony">{nr}</Link>

export function WierszNrKat({ nr }: { nr: string | null }) {
    if (!nr) return null
    return <W e="nr kat."><Numer nr={nr} /></W>
}

export function LiniaNrKat({ nr }: { nr: string | null }) {
    if (!nr) return null
    return <p className="karta-linia">nr kat. <Numer nr={nr} /></p>
}

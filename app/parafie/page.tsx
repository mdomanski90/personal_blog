import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { Link } from 'next-view-transitions'
import { miejsca, parafie, poziomCzytelnika } from '@/lib/archiwum'
import { WYZNANIA_PARAFII } from '@/lib/ksiegi'
import { formatujEdtf } from '@/lib/edtf'
import { Strona, TytulStrony } from '../components/Uklad'
import { obokMiejsc } from '../components/TytulyDzialow'
import Komunikat from '../components/Komunikat'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'instytucje · odniepamieci.pl' }

/** Spis instytucji: nie są obiektami w terenie ani osobnymi miejscowościami. */
export default async function ParafieStrona() {
    const [instytucje, listaMiejsc] = await Promise.all([parafie(), miejsca(await poziomCzytelnika())])
    const nazwyMiejsc = new Map(listaMiejsc.map((m) => [m.id, m.nazwa]))
    return (
        <Strona uklad="pelna">
            <TytulStrony obok={obokMiejsc('/parafie')} sciezka={[{ tekst: 'miejsca', href: '/miejsca' }]}><TytulDzialu dzial="instytucje" domyslny="instytucje" /></TytulStrony>
            <p className="leading-relaxed" style={{ fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                <WstepTekst dzial="instytucje" domyslny={"Instytucje prowadzące księgi metrykalne i akta stanu cywilnego. Ich okres działania jest czymś innym niż okres przynależności konkretnej miejscowości czy zachowane roczniki akt."} />
            </p>
            <ul className="lista-pozycji">
                {instytucje.map((p) => (
                    <li key={p.id} className="lista-pozycja">
                        <Link href={`/parafie/${p.id}`} className="lista-tytul">{p.nazwa}</Link>
                        <span className="lista-linia">
                            {[WYZNANIA_PARAFII[p.wyznanie] ?? p.wyznanie, p.czas && formatujEdtf(p.czas), p.siedziba && nazwyMiejsc.get(p.siedziba)].filter(Boolean).join(' · ')}
                        </span>
                    </li>
                ))}
            </ul>
            {instytucje.length === 0 && <Komunikat rodzaj="pusto">Spis instytucji jest w przygotowaniu.</Komunikat>}
        </Strona>
    )
}

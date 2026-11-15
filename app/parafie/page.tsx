import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { Link } from 'next-view-transitions'
import { miejsca, parafie, poziomCzytelnika } from '@/lib/archiwum'
import { WYZNANIA_PARAFII } from '@/lib/ksiegi'
import { formatujEdtf } from '@/lib/edtf'
import { Strona, TytulStrony } from '../components/Uklad'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'parafie i urzędy · odniepamieci.pl' }

/** Spis instytucji: nie są obiektami w terenie ani osobnymi miejscowościami. */
export default async function ParafieStrona() {
    const [instytucje, listaMiejsc] = await Promise.all([parafie(), miejsca(await poziomCzytelnika())])
    const nazwyMiejsc = new Map(listaMiejsc.map((m) => [m.id, m.nazwa]))
    return (
        <Strona>
            <TytulStrony sciezka={[{ tekst: 'biblioteka', href: '/biblioteka' }]}><TytulDzialu dzial="instytucje" domyslny="parafie i urzędy" /></TytulStrony>
            <p className="leading-relaxed" style={{ fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                <WstepTekst dzial="instytucje" domyslny={"Instytucje prowadzące księgi metrykalne i akta stanu cywilnego. Ich okres działania jest czymś innym niż okres przynależności konkretnej miejscowości czy zachowane roczniki akt."} />
            </p>
            <ul className="flex flex-col border-t border-[#e7e2d8] dark:border-[#374151]" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {instytucje.map((p) => (
                    <li key={p.id} className="py-3 border-b border-[#e7e2d8] dark:border-[#374151] flex flex-col" style={{ gap: 3 }}>
                        <Link href={`/parafie/${p.id}`} className="odn font-bold" style={{ fontSize: 'calc(16px * var(--font-scale, 1))' }}>{p.nazwa}</Link>
                        <span className="ot-drobne">
                            {[WYZNANIA_PARAFII[p.wyznanie] ?? p.wyznanie, p.czas && formatujEdtf(p.czas), p.siedziba && nazwyMiejsc.get(p.siedziba)].filter(Boolean).join(' · ')}
                        </span>
                    </li>
                ))}
            </ul>
            {instytucje.length === 0 && <p className="ot-drobne">Spis instytucji jest w przygotowaniu.</p>}
        </Strona>
    )
}

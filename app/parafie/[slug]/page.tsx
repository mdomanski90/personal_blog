import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from 'next-view-transitions'
import { ksiegi, miejsca, obiekty, parafie, poziomCzytelnika, RODZAJE_OBIEKTOW, materialy } from '@/lib/archiwum' // PACZKA5_2026
import { WYZNANIA_PARAFII } from '@/lib/ksiegi'
import { miejscowosciInstytucji, obiektyInstytucji, ksiegiInstytucji, zapiszOkres } from '@/lib/parafie-powiazania'
import { formatujEdtf } from '@/lib/edtf'
import { Strona } from '../../components/Uklad'
import { Czesc, NaglowekKarty, Tabela, W, WCaly, ZAdresami, Zrodla, ZglosPoprawke } from '../../components/Karta'
import { PasekLat, TabelaKsiag } from '../../components/Ksiegi'
import CopyLinkButton from '../../components/CopyLinkButton'

export const dynamic = 'force-dynamic'
type Parametry = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Parametry): Promise<Metadata> {
    const { slug } = await params
    const p = (await parafie()).find((x) => x.id === slug)
    return { title: p ? `${p.nazwa} · parafie i urzędy · odniepamieci.pl` : 'odniepamieci.pl' }
}

export default async function ParafiaStrona({ params }: Parametry) {
    const { slug } = await params
    const poziom = await poziomCzytelnika()
    const [instytucje, wszystkieMiejsca, wszystkieObiekty, wszystkieKsiegi] = await Promise.all([
        parafie(), miejsca(poziom), obiekty(poziom), ksiegi(poziom),
    ])
    const p = instytucje.find((x) => x.id === slug)
    if (!p) notFound()
    const matInstytucji = (await materialy(poziom)).filter(m => m.instytucje.includes(p.id))
    const siedziba = p.siedziba ? wszystkieMiejsca.find((m) => m.id === p.siedziba) : null
    const miejscowosci = miejscowosciInstytucji(p.id, wszystkieMiejsca)
    const budynki = obiektyInstytucji(p.id, wszystkieObiekty)
    const spisKsieg = ksiegiInstytucji(p.id, wszystkieKsiegi)
    const nazwyMiejsc = Object.fromEntries(wszystkieMiejsca.map((m) => [m.id, m.nazwa]))
    const wyznanie = WYZNANIA_PARAFII[p.wyznanie] ?? p.wyznanie
    const osobyInstytucji = p.osoby ?? []
    const zrodlaInstytucji = p.zrodla ?? []
    return (
        <Strona akcje={<CopyLinkButton sciezka={`/parafie/${p.id}`} />}>
            <NaglowekKarty
                sciezka={[{ tekst: 'miejsca', href: '/miejsca' }, { tekst: 'instytucje', href: '/parafie' }]}
                tytul={p.nazwa}
                linia={[wyznanie, p.czas ? formatujEdtf(p.czas) : null, siedziba ? { tekst: siedziba.nazwa, href: `/miejsca/${siedziba.id}` } : null]}
                lead={p.opis ? <p style={{ margin: 0 }}>{p.opis.replace(/\s+/g, ' ').slice(0, 240)}{p.opis.length > 240 ? '…' : ''}</p> : undefined}
            />

            <Tabela etykieta={`${p.nazwa} – dane instytucji`}>
                <Czesc tytul="podstawowe" />
                <W e="wyznanie / rodzaj">{wyznanie}</W>
                <W e="okres działania">{p.czas ? formatujEdtf(p.czas) : <span className="ot-drobne">nieustalony</span>}</W>
                <W e="siedziba">{siedziba ? <Link href={`/miejsca/${siedziba.id}`} className="odn">{siedziba.nazwa}</Link> : null}</W>
                <W e="diecezja / dekanat">{p.diecezja || null}</W>
                <W e="strona w sieci">{p.sameAs ? <a href={p.sameAs} target="_blank" rel="noopener noreferrer" className="odn">{p.sameAs.replace(/^https?:\/\//, '')}</a> : null}</W>

                {miejscowosci.length > 0 && <Czesc tytul="miejscowości" id="miejscowosci">{miejscowosci.length}</Czesc>}
                {miejscowosci.length > 0 && <WCaly>
                    <ul className="karta-lista">
                        {miejscowosci.map(({ miejsce, okresy }) => <li key={miejsce.id}>
                            <Link href={`/miejsca/${miejsce.id}`} className="odn">{miejsce.nazwa}</Link>
                            <span>przynależność: {okresy.map((o) => zapiszOkres(o.od, o.do)).join(', ')}</span>
                        </li>)}
                    </ul>
                </WCaly>}

                {budynki.length > 0 && <Czesc tytul="powiązane obiekty" id="obiekty">{budynki.length}</Czesc>}
                {budynki.length > 0 && <WCaly>
                    <ul className="karta-lista">
                        {budynki.map(({ obiekt: o, relacje }) => <li key={o.id}>
                            <Link href={`/obiekty/${o.id}`} className="odn">{o.nazwa}</Link>
                            <span>{[RODZAJE_OBIEKTOW[o.rodzaj] ?? o.rodzaj, relacje.map((r) => zapiszOkres(r.od, r.do)).join(', ')].filter(Boolean).join(' · ')}</span>
                            {relacje.some((r) => r.zrodlo) && <span>{relacje.filter((r) => r.zrodlo).map((r, i) => <span key={i}><ZAdresami tekst={r.zrodlo} />{i < relacje.filter((r) => r.zrodlo).length - 1 ? ' · ' : ''}</span>)}</span>}
                        </li>)}
                    </ul>
                </WCaly>}

                {osobyInstytucji.length > 0 && <Czesc tytul="osoby związane z instytucją" id="osoby">{osobyInstytucji.length}</Czesc>}
                {osobyInstytucji.length > 0 && <WCaly>
                    <ul className="karta-lista">
                        {osobyInstytucji.map((o, i) => <li key={`${o.nazwa}-${i}`}>
                            {o.idOsoby ? <Link href={`/osoby/${encodeURIComponent(o.idOsoby)}`} className="odn">{o.nazwa}</Link> : <span>{o.nazwa}</span>}
                            {(o.rola || o.okres) && <span>{[o.rola, o.okres].filter(Boolean).join(' · ')}</span>}
                        </li>)}
                    </ul>
                </WCaly>}

                {matInstytucji.length > 0 && <Czesc tytul="materiały archiwalne" id="materialy">{matInstytucji.length}</Czesc>}
                {matInstytucji.length > 0 && <WCaly><ul className="karta-lista">{matInstytucji.map(m => <li key={m.id}><Link href={`/archiwum/${m.id}`} className="odn">{m.nazwa}</Link></li>)}</ul></WCaly>}
                {spisKsieg.length > 0 && <Czesc tytul="księgi metrykalne" id="ksiegi">{spisKsieg.length}</Czesc>}
                {spisKsieg.length > 0 && <WCaly>
                    <div className="flex flex-col" style={{ gap: 12 }}>
                        <PasekLat ksiegi={spisKsieg} />
                        <TabelaKsiag ksiegi={spisKsieg} nazwyMiejsc={nazwyMiejsc} />
                        <Link href={`/biblioteka/ksiegi?widok=parafie#${encodeURIComponent(p.id)}`} className="odn" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>pełny katalog ksiąg →</Link>
                    </div>
                </WCaly>}
            </Tabela>

            <section id="historia" className="flex flex-col scroll-mt-6" style={{ gap: 10 }}>
                <h2 className="font-bold lowercase" style={{ fontSize: 'calc(20px * var(--font-scale, 1))' }}>historia</h2>
                {p.opis ? <div className="post-content whitespace-pre-line" style={{ fontSize: 'var(--blog-font-size, 18px)' }}>{p.opis}</div> :
                    <p className="ot-drobne">Opis historii tej instytucji jest w przygotowaniu.</p>}
            </section>
            {zrodlaInstytucji.length > 0 && (
                <Tabela etykieta={`${p.nazwa} – źródła`}>
                    <Zrodla pozycje={zrodlaInstytucji.map((z, i) => <ZAdresami key={i} tekst={z} />)} />
                </Tabela>
            )}
            <ZglosPoprawke adres={`/parafie/${p.id}`} tytul={p.nazwa} pytanie="Coś się nie zgadza albo wiesz więcej o tej instytucji?" />
        </Strona>
    )
}

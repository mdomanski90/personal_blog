import * as React from 'react'
import { brakLubPrzekierowanie } from '@/lib/przekierowania'
import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { ksiegi, miejsca, obiekty, parafie, poziomCzytelnika, RODZAJE_OBIEKTOW, materialy } from '@/lib/archiwum' // PACZKA5_2026
import { WYZNANIA_PARAFII } from '@/lib/ksiegi'
import { miejscowosciInstytucji, obiektyInstytucji, ksiegiInstytucji, zapiszOkres, osobyInstytucjiDlaCzytelnika } from '@/lib/parafie-powiazania'
import { stanOsob } from '@/lib/osoby/dane'
import { widoczne } from '@/lib/archiwum'
import { PastylkaOsoby } from '@/app/components/Wzorce'
import { formatujEdtf } from '@/lib/edtf'
import { Sekcja, Strona } from '../../components/Uklad'
import { Czesc, CzescJakCytowac, KrotkieMaterialy, NaglowekKarty, Tabela, W, WCaly, ZAdresami, Zrodla, ZglosPoprawke, idCzesci, spisCzesci } from '../../components/Karta'
import { daneCytatu } from '@/lib/cytowanie'
import SpisTresci from '../../components/SpisTresci'
import { PrzyciskDrukuj } from '../../components/Druk'
import { PasekLat, TabelaKsiag } from '../../components/Ksiegi'
import CopyLinkButton from '../../components/CopyLinkButton'
import ListaObiektow from '../../components/ListaObiektow'
import { numerKat } from '@/lib/katalog/dane'
import { WierszNrKat } from '../../components/NrKat'

export const dynamic = 'force-dynamic'
type Parametry = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Parametry): Promise<Metadata> {
    const { slug } = await params
    const p = (await parafie()).find((x) => x.id === slug)
    return { title: p ? `${p.nazwa} · instytucje · odniepamieci.pl` : 'odniepamieci.pl' }
}

export default async function ParafiaStrona({ params }: Parametry) {
    const { slug } = await params
    const poziom = await poziomCzytelnika()
    const [instytucje, wszystkieMiejsca, wszystkieObiekty, wszystkieKsiegi] = await Promise.all([
        parafie(), miejsca(poziom), obiekty(poziom), ksiegi(poziom),
    ])
    const p = instytucje.find((x) => x.id === slug)
    if (!p) return brakLubPrzekierowanie('parafie', slug)
    const matInstytucji = (await materialy(poziom)).filter(m => m.instytucje.includes(p.id))
    const siedziba = p.siedziba ? wszystkieMiejsca.find((m) => m.id === p.siedziba) : null
    const miejscowosci = miejscowosciInstytucji(p.id, wszystkieMiejsca)
    const budynki = obiektyInstytucji(p.id, wszystkieObiekty)
    const spisKsieg = ksiegiInstytucji(p.id, wszystkieKsiegi)
    const nazwyMiejsc = Object.fromEntries(wszystkieMiejsca.map((m) => [m.id, m.nazwa]))
    const wyznanie = WYZNANIA_PARAFII[p.wyznanie] ?? p.wyznanie
    // PAR-06 (P3, zasada 1.5): odnośnik tylko do karty widocznej dla czytelnika
    const stan = await stanOsob()
    const osobyInstytucji = osobyInstytucjiDlaCzytelnika(p.osoby ?? [], (id) => stan.drzewo.osoby.has(id) && widoczne(stan.widocznosc(id), poziom))
    const plecOsoby = (id: string) => stan.drzewo.osoby.get(id)?.plec
    const zrodlaInstytucji = p.zrodla ?? []
    const nrKat = numerKat('instytucja', p.id)
    const lead = p.opis ? `${p.opis.replace(/\s+/g, ' ').slice(0, 240)}${p.opis.length > 240 ? '…' : ''}` : ''
    const spis = spisCzesci(['podstawowe', miejscowosci.length > 0 && 'miejscowości', budynki.length > 0 && 'powiązane obiekty', osobyInstytucji.length > 0 && 'osoby związane z instytucją', matInstytucji.length > 0 && 'materiały archiwalne', spisKsieg.length > 0 && 'księgi metrykalne', 'historia', 'jak cytować', zrodlaInstytucji.length > 0 && 'źródła'], { wstep: !!lead })
    const naglowek = (
        <NaglowekKarty
            sciezka={[]}
            tytul={p.nazwa}
            linia={[wyznanie, p.czas ? formatujEdtf(p.czas) : null, siedziba ? { tekst: siedziba.nazwa, href: `/miejsca/${siedziba.id}` } : null]}
            lead={lead || undefined}
        />
    )
    return (
        <Strona uklad="karta" nrKat={nrKat} sciezka={[{ tekst: 'miejsca', href: '/miejsca' }, { tekst: 'instytucje', href: '/parafie' }]} akcje={<><CopyLinkButton sciezka={`/parafie/${p.id}`} /><PrzyciskDrukuj /></>} naglowek={naglowek} spis={<SpisTresci pozycje={spis} />}>

            <Tabela etykieta={`${p.nazwa} – dane instytucji`}>
                <Czesc tytul="podstawowe" />
                <WierszNrKat nr={nrKat} />
                <W e="wyznanie / rodzaj">{wyznanie}</W>
                <W e="okres działania">{p.czas ? formatujEdtf(p.czas) : <span className="ot-drobne">nieustalony</span>}</W>
                <W e="siedziba">{siedziba ? <Link href={`/miejsca/${siedziba.id}`} className="odn">{siedziba.nazwa}</Link> : null}</W>
                <W e="diecezja / dekanat">{p.diecezja || null}</W>
                <W e="strona w sieci">{p.sameAs ? <a href={p.sameAs} target="_blank" rel="noopener noreferrer" className="odn">{p.sameAs.replace(/^https?:\/\//, '')}</a> : null}</W>

                {miejscowosci.length > 0 && <Czesc tytul="miejscowości">{miejscowosci.length}</Czesc>}
                {miejscowosci.length > 0 && <WCaly>
                    <ul className="karta-lista">
                        {miejscowosci.map(({ miejsce, okresy }) => <li key={miejsce.id}>
                            <Link href={`/miejsca/${miejsce.id}`} className="odn">{miejsce.nazwa}</Link>
                            <span>przynależność: {okresy.map((o) => zapiszOkres(o.od, o.do)).join(', ')}</span>
                        </li>)}
                    </ul>
                </WCaly>}

                {budynki.length > 0 && <Czesc tytul="powiązane obiekty">{budynki.length}</Czesc>}
                {budynki.length > 0 && <WCaly>
                    {/* P7F-2: ta sama lista obiektów co na karcie miejscowości – tarcza rodzaju, nazwa, okres przynależności, źródło */}
                    <ListaObiektow pozycje={budynki.map(({ obiekt: o, relacje }) => ({
                        id: o.id, nazwa: o.nazwa, rodzaj: o.rodzaj, nazwaRodzaju: RODZAJE_OBIEKTOW[o.rodzaj] ?? o.rodzaj, istnieje: o.istnieje,
                        dopisek: (relacje.some((r) => r.od || r.do) || relacje.some((r) => r.zrodlo)) ? <>
                            {relacje.map((r) => zapiszOkres(r.od, r.do)).filter(Boolean).join(', ')}
                            {relacje.filter((r) => r.zrodlo).map((r, i) => <React.Fragment key={i}> · <ZAdresami tekst={r.zrodlo} /></React.Fragment>)}
                        </> : undefined,
                    }))} />
                </WCaly>}

                {osobyInstytucji.length > 0 && <Czesc tytul="osoby związane z instytucją">{osobyInstytucji.length}</Czesc>}
                {osobyInstytucji.length > 0 && <WCaly>
                    <ul className="karta-lista">
                        {osobyInstytucji.map((o, i) => <li key={`${o.nazwa}-${i}`}>
                            {o.href ? <PastylkaOsoby href={o.href} plec={plecOsoby(o.idOsoby)}>{o.nazwa}</PastylkaOsoby> : <span>{o.nazwa}</span>}
                            {(o.rola || o.okres) && <span>{[o.rola, o.okres].filter(Boolean).join(' · ')}</span>}
                            {o.zrodlo && <span className="ot-drobne">źródło: <ZAdresami tekst={o.zrodlo} /></span>}
                        </li>)}
                    </ul>
                </WCaly>}

                {matInstytucji.length > 0 && <Czesc tytul="materiały archiwalne">{matInstytucji.length}</Czesc>}
                {/* KRT-03 (P3): jak na karcie osoby – 5 pozycji (tytuł, rodzaj · data) i „wszystkie (N) w archiwum →” */}
                {matInstytucji.length > 0 && <WCaly>
                    <div className="flex flex-col gap-3">
                        <KrotkieMaterialy materialy={matInstytucji.slice(0, 5)} />
                        {matInstytucji.length > 5 && <Link href={`/archiwum?instytucja=${encodeURIComponent(p.id)}`} className="odn tekst-opis-maly">wszystkie ({matInstytucji.length}) w archiwum →</Link>}
                    </div>
                </WCaly>}
                {spisKsieg.length > 0 && <Czesc tytul="księgi metrykalne">{spisKsieg.length}</Czesc>}
                {spisKsieg.length > 0 && <WCaly>
                    <div className="flex flex-col gap-3">
                        <PasekLat ksiegi={spisKsieg} />
                        <TabelaKsiag ksiegi={spisKsieg} nazwyMiejsc={nazwyMiejsc} kontekst={{ instytucja: p.id }} wariant="wiersze" />
                        <Link href={`/biblioteka/ksiegi?widok=parafie#${encodeURIComponent(p.id)}`} className="odn tekst-opis-maly">pełny katalog ksiąg →</Link>
                    </div>
                </WCaly>}
            </Tabela>

            <Sekcja tytul="historia" id={idCzesci('historia')}>
                {p.opis ? <div className="post-content tresc-czytana whitespace-pre-line">{p.opis}</div> :
                    <p className="ot-drobne">Opis historii tej instytucji jest w przygotowaniu.</p>}
            </Sekcja>
            {/* uwaga 16.11: „jak cytować” na każdej karcie – tabela zawsze, źródła gdy są */}
            {(
                <Tabela etykieta={`${p.nazwa} – jak cytować i źródła`}>
                    <CzescJakCytowac plik={p.id} zglosil={p.zglosil} dane={daneCytatu({ tytul: p.nazwa, sciezka: `/parafie/${p.id}`, nrKat, rodzaj: 'instytucja' })} />
                    <Zrodla pozycje={zrodlaInstytucji.map((z, i) => <ZAdresami key={i} tekst={z} />)} />
                </Tabela>
            )}
            <ZglosPoprawke adres={`/parafie/${p.id}`} tytul={p.nazwa} pytanie="Coś się nie zgadza albo wiesz więcej o tej instytucji?" />
        </Strona>
    )
}

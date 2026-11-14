import * as React from 'react'
import { Link } from 'next-view-transitions'
import type { Material, Opowiesc } from '@/lib/archiwum'
import { RODZAJE_OPOWIESCI } from '@/lib/archiwum'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { formatujEdtf } from '@/lib/edtf'
import { dataWpisu } from './Uklad'
import Zgloszenie from './Zgloszenie'

// Wspólny układ kart (miejscowość, obiekt, materiał, temat – jak karta osoby):
// ① nagłówek: obraz (zdjęcie, skan, mapa) | tytuł, spokojna linia, krótki opis; bez obrazu – na całą szerokość;
// ② tabela z wierszami-nagłówkami; ③ tekst do czytania; ④ powiązane; ⑤ źródła (zawsze na końcu); ⑥ zgłoś poprawkę.
// Informacja = spokojny tekst, odnośnik = kolor atramentu, przycisk = w ramce. Puste wiersze się nie pokazują.

type Element = React.ReactNode | { tekst: React.ReactNode; href: string } | { tekst: React.ReactNode; href: string }[]
const jestOdnosnik = (e: unknown): e is { tekst: React.ReactNode; href: string } => !!e && typeof e === 'object' && 'href' in (e as object)

/** Spokojna linia: elementy rozdzielone „ · ”, odnośniki w kolorze atramentu, lista odnośników po przecinku. */
export function LiniaKarty({ elementy, className = 'karta-linia' }: { elementy: Element[]; className?: string }) {
    const widoczne = elementy.filter((e) => e !== null && e !== undefined && e !== false && e !== '' && !(Array.isArray(e) && !e.length))
    if (!widoczne.length) return null
    return (
        <p className={className}>
            {widoczne.map((e, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <span aria-hidden="true"> · </span>}
                    {Array.isArray(e)
                        ? e.map((x, j) => <React.Fragment key={x.href}>{j > 0 && ', '}<Link href={x.href} className="odn">{x.tekst}</Link></React.Fragment>)
                        : jestOdnosnik(e) ? <Link href={e.href} className="odn">{e.tekst}</Link> : <span>{e as React.ReactNode}</span>}
                </React.Fragment>
            ))}
        </p>
    )
}

/** Nagłówek karty: ścieżka, obraz po lewej (200 px; szerszy dla mapy gminy) i obok tytuł, linia, opis. */
export function NaglowekKarty({ sciezka, tytul, obraz, szerokiObraz, linia, lead, children }: {
    sciezka: { tekst: string; href: string }[]
    tytul: React.ReactNode
    obraz?: React.ReactNode
    szerokiObraz?: boolean
    linia?: Element[]
    lead?: React.ReactNode
    children?: React.ReactNode
}) {
    return (
        <>
            <p className="karta-sciezka">
                {sciezka.map((s, i) => (
                    <span key={s.href}>{i > 0 && ' / '}<Link href={s.href}>{s.tekst}</Link></span>
                ))}
                {sciezka.length > 0 && ' /'}
            </p>
            <div className={`osoba-karta${obraz ? ' z-portretem' : ''}${obraz && szerokiObraz ? ' z-szerokim' : ''}`}>
                {obraz && <div className="karta-obraz">{obraz}</div>}
                <div className="osoba-karta-opis">
                    <h1 className="font-bold break-words leading-tight" style={{ fontSize: 'calc(1.75rem * var(--font-scale, 1))', margin: 0 }}>{tytul}</h1>
                    {linia && <LiniaKarty elementy={linia} />}
                    {lead && <div className="osoba-lead">{lead}</div>}
                    {children}
                </div>
            </div>
        </>
    )
}

export function Tabela({ children, etykieta }: { children: React.ReactNode; etykieta?: string }) {
    return <div className="osoba-tabela karta-tabela" aria-label={etykieta}>{children}</div>
}

/** Wiersz-nagłówek części tabeli (z tłem). */
export function Czesc({ tytul, id, children }: { tytul: string; id?: string; children?: React.ReactNode }) {
    return (
        <div className="ot-nagl" id={id}>
            <h2>{tytul}</h2>
            {children && <span className="ot-nagl-prawa">{children}</span>}
        </div>
    )
}

/** Wiersz: etykieta – wartość. Pusta wartość = brak wiersza. */
export function W({ e, children }: { e: string; children: React.ReactNode }) {
    if (children === null || children === undefined || children === false || children === '') return null
    return (
        <dl className="ot-w">
            <dt className="ot-e">{e}</dt>
            <dd className="ot-t">{children}</dd>
        </dl>
    )
}

/** Wiersz na całą szerokość tabeli (lista, galeria, źródła). */
export function WCaly({ children }: { children: React.ReactNode }) {
    return <div className="ot-cala">{children}</div>
}

/** Tekst z adresami zamienionymi w odnośniki. */
export function ZAdresami({ tekst }: { tekst: string }) {
    return <>{tekst.split(/(https?:\/\/\S+)/).map((cz, i) => (/^https?:\/\//.test(cz)
        ? <a key={i} href={cz.replace(/[.,;)]+$/, '')} target="_blank" rel="noopener noreferrer" className="odn">{decodeURI(cz.replace(/^https?:\/\//, '').replace(/[.,;)]+$/, ''))}</a>
        : cz))}</>
}

/** Numerowana lista źródeł (część „źródła” – zawsze ostatnia w tabeli). */
export function Zrodla({ pozycje }: { pozycje: React.ReactNode[] }) {
    const p = pozycje.filter(Boolean)
    if (!p.length) return null
    return (
        <>
            <Czesc tytul="źródła" id="zrodla" />
            <WCaly>
                <ol className="karta-zrodla">{p.map((x, i) => <li key={i}>{x}</li>)}</ol>
            </WCaly>
        </>
    )
}

/** Krótka lista wpisów w tabeli: tytuł i pod nim data · rodzaj. */
export function KrotkieWpisy({ wpisy }: { wpisy: Opowiesc[] }) {
    return (
        <ul className="karta-lista">
            {wpisy.map((w) => (
                <li key={w.id}><Link href={`/wpisy/${w.id}`} className="odn">{w.tytul}</Link><span>{dataWpisu(w.data)} · {RODZAJE_OPOWIESCI[w.rodzaj] ?? w.rodzaj}</span></li>
            ))}
        </ul>
    )
}

/** Krótka lista materiałów w tabeli: tytuł i pod nim rodzaj · czas. */
export function KrotkieMaterialy({ materialy }: { materialy: Material[] }) {
    return (
        <ul className="karta-lista">
            {materialy.map((m) => (
                <li key={m.id}><Link href={`/archiwum/${m.id}`} className="odn">{m.nazwa}</Link><span>{[RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj, m.czas && formatujEdtf(m.czas), m.widocznosc === 'bliscy' && 'dla bliskich'].filter(Boolean).join(' · ')}</span></li>
            ))}
        </ul>
    )
}

/** Dół karty: zgłoszenie poprawki (trafia do redakcji). */
export function ZglosPoprawke({ adres, tytul, pytanie }: { adres: string; tytul: string; pytanie: string }) {
    return (
        <div className="karta-zglos">
            <span>{pytanie}</span>
            <Zgloszenie rodzaj="poprawka" adres={adres} tytul={tytul} />
        </div>
    )
}

import * as React from 'react'
import SiteHeader from './SiteHeader'
import Footer from './Footer'
import ScrollToTop from './ScrollToTop'
import ImageZoom from './ImageZoom'
import DokumentyWTresci from './DokumentyWTresci'
import DrzewaLinie from './DrzewaLinie'
import { Okruszki, TytulSekcji, type Sciezka } from './Wzorce'
import { UstawieniaDruku } from './Druk'

// Wspólne elementy wyglądu (JW-1): Strona (szerokość B), tytuł strony, sekcja z tytułem sekcji, treść.

export const RAMKA = 'border border-[var(--linia-podzialu)]'

/**
 * Układ treści strony (szerokość B, decyzja 16.11):
 * – „kolumna” – kolumna tekstu 66 znaków (wpisy, opisy, karty bez paska bocznego);
 * – „pelna” – pełna szerokość 1160 px (plany, skany, mapy, katalogi, siatki);
 * – „karta” – nagłówek karty nad siatką, pod nim kolumna tekstu + pasek boczny (obraz i spis treści, przyklejony) od pierwszej
 *   tabeli (wariant B, 17.11); element <PelnaSzerokosc> przerywa kolumnę, a spis treści wraca po nim;
 * – „przegladarka” – nagłówek i stopka 1200 px, aplet planu (.przegladarka-aplet) do 1600 px (decyzja 3, 17.11; tylko /plany/[slug]).
 */
export type UkladStrony = 'kolumna' | 'pelna' | 'karta' | 'przegladarka'

/** Element na pełną szerokość wewnątrz strony w układzie „karta” (skan materiału, wstawka we wpisie). */
export function PelnaSzerokosc({ children }: { children: React.ReactNode }) {
    return <div className="pelna-szerokosc">{children}</div>
}

function UkladKarty({ children, naglowek, bok, spis, sciezka }: { children: React.ReactNode; naglowek?: React.ReactNode; bok?: React.ReactNode; spis?: React.ReactNode; sciezka?: Sciezka }) {
    // podział na odcinki: kolumna z paskiem bocznym | element pełnej szerokości | kolumna z paskiem (spis wraca) …
    const odcinki: { pelny: boolean; el: React.ReactNode[] }[] = []
    for (const el of React.Children.toArray(children)) {
        const pelny = React.isValidElement(el) && el.type === PelnaSzerokosc
        const ost = odcinki[odcinki.length - 1]
        if (!pelny && ost && !ost.pelny) ost.el.push(el)
        else odcinki.push({ pelny, el: [el] })
    }
    // wariant B: pasek boczny (obraz, spis) zaczyna się przy pierwszej tabeli – w pierwszym odcinku kolumny z treścią;
    // gdy karta zaczyna się od elementu pełnej szerokości (skan materiału), pasek stoi obok pierwszej kolumny po nim
    const pierwszy = odcinki.findIndex((o) => !o.pelny && o.el.length > 0)
    const glowa = (
        <React.Fragment key="glowa">
            {/* wariant B (decyzja 17.11, zmienia 16.11): okruszki i nagłówek karty nad siatką; na wąskim ekranie kolejność:
                nagłówek → pasek (obraz, spis) → treść */}
            {sciezka && <Okruszki sciezka={sciezka} />}
            {naglowek && <div className="karta-naglowek">{naglowek}</div>}
        </React.Fragment>
    )
    return (
        <>
            {glowa}
            {pierwszy < 0 && (bok || spis) && <div className="karta-odcinek karta-odcinek-pierwszy"><aside className="karta-bok" aria-label="obok treści">{bok}{spis && <div className="karta-spis">{spis}</div>}</aside></div>}
            {odcinki.map((o, i) => {
                if (o.pelny) return <React.Fragment key={i}>{o.el}</React.Fragment>
                if (i === pierwszy) return (
                    <div key={i} className="karta-odcinek karta-odcinek-pierwszy">
                        {(bok || spis) && <aside className="karta-bok" aria-label="obok treści">{bok}{spis && <div className="karta-spis">{spis}</div>}</aside>}
                        <div className="karta-kolumna">{o.el}</div>
                    </div>
                )
                return (
                    <div key={i} className="karta-odcinek">
                        <div className="karta-kolumna">{o.el}</div>
                        {/* ten sam spis wraca po elemencie pełnej szerokości; kopia bez fokusu i bez czytnika (inert) – pierwszy spis pozostaje jedynym w drzewie dostępności */}
                        {spis && i > pierwszy && <div className="karta-bok karta-bok-dalej" {...({ inert: true } as object)}><div className="karta-spis">{spis}</div></div>}
                    </div>
                )
            })}
        </>
    )
}

/** Strona z nagłówkiem, stopką i powiększaniem obrazków. Jedna szerokość układu (1200 px) – nagłówek, treść i stopka mają tę samą krawędź. */
export function Strona({ children, szeroka = false, uklad, akcje, naglowek, bok, spis, sciezka, nrKat }: {
    children: React.ReactNode
    /** dawny przełącznik „szeroka” = uklad="pelna" */
    szeroka?: boolean
    uklad?: UkladStrony
    akcje?: React.ReactNode
    /** uklad="karta": nagłówek karty (tytuł, linia, wstęp) – nad siatką; pasek boczny zaczyna się przy pierwszej tabeli (wariant B) */
    naglowek?: React.ReactNode
    /** uklad="karta": gniazdo paska bocznego – obraz nagłówka (mapa, zdjęcie, portret / prośba o zdjęcie) */
    bok?: React.ReactNode
    /** uklad="karta": spis treści (SpisTresci) pod obrazem, przyklejony przy przewijaniu */
    spis?: React.ReactNode
    /** uklad="karta": okruszki nad siatką (wtedy NaglowekKarty / TytulStrony dostają pustą ścieżkę) */
    sciezka?: Sciezka
    /** KAT-03: nr kat. pozycji – do stopki wydruku (UstawieniaDruku czyta data-nr-kat) */
    nrKat?: string | null
}) {
    const u: UkladStrony = uklad ?? (szeroka ? 'pelna' : 'kolumna')
    return (
        <>
            <div className="odp">
                <div className="strona-pion space-y-6 w-full">
                    <SiteHeader akcje={akcje} />
                    <main id="tresc" tabIndex={-1} className={`strona-tresc uklad-${u} space-y-6 outline-none`}>
                        {u === 'karta' ? <UkladKarty naglowek={naglowek} bok={bok} spis={spis} sciezka={sciezka}>{children}</UkladKarty> : children}
                    </main>
                    {/* JW-17: koniec treści w druku – pełny adres i data wydruku (każda przeglądarka; wartości z UstawieniaDruku) */}
                    <p className="druk-koniec" aria-hidden="true" />
                    {nrKat && <span hidden data-nr-kat={nrKat} />}
                    <ImageZoom />
                    <DokumentyWTresci />
                    <DrzewaLinie />
                    <Footer />
                </div>
            </div>
            <UstawieniaDruku />
            <ScrollToTop />
        </>
    )
}

export function Kreski({ className = '' }: { className?: string }) {
    return (
        <div aria-hidden="true" className={`whitespace-nowrap overflow-hidden opacity-50 ${className}`}>
            ------------------------------------------------------------------------------------------------------------------------
        </div>
    )
}

/** Sekcja z tytułem sekcji (jeden wzorzec tytułu – jak na stronie głównej). */
export function Sekcja({ tytul, children, id }: { tytul: string; children: React.ReactNode; id?: string }) {
    return (
        <section id={id} className="sekcja">
            <TytulSekcji>{tytul}</TytulSekcji>
            {children}
        </section>
    )
}

/** Tytuł strony: h1 w kolorze akcentu z kreską; „akcje” (np. ← mapa, kopiuj link, drukuj) nad okruszkami, po lewej. */
export function TytulStrony({ children, sciezka, akcje, bezOkruszkow = false }: { children: React.ReactNode; sciezka?: Sciezka; akcje?: React.ReactNode; bezOkruszkow?: boolean }) {
    return (
        <div className="tytul-strony-blok">
            {akcje && <div className="pasek-akcji">{akcje}</div>}
            {/* P7B-2 (JV-15), P7D-1 (AUD-07): okruszki na każdej stronie poza główną; bieżąca strona to tytuł (aria-current) */}
            {!bezOkruszkow && <Okruszki sciezka={sciezka ?? []} />}
            <h1 className="tytul-strony" aria-current="page">{children}</h1>
        </div>
    )
}

/** Czy HTML zawiera jakikolwiek tekst albo obraz (pusty dokument z panelu to np. „<article></article>”). */
export const maTekst = (html: string | null | undefined) => !!html && (/<img|<iframe|<video|<audio/i.test(html) || html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0)

/** Treść Markdoc wyrenderowana do HTML (z klasami typografii jak dotąd). */
export function Tresc({ html, pusta = 'treść nie została jeszcze dodana.' }: { html: string; pusta?: string | null }) {
    if (!maTekst(html)) return pusta ? <p className="text-[var(--tekst-etykieta)] italic lowercase">{pusta}</p> : null
    return (
        <div className="post-content tresc-czytana">
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    )
}

const MIESIACE = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']

/** Data publikacji wpisu słownie: „4 lutego 2026” (bez dnia tygodnia; niezależnie od ustawień serwera). */
export function dataWpisu(iso: string | null): string {
    if (!iso) return 'brak daty'
    const [r, m, d] = iso.slice(0, 10).split('-').map(Number)
    if (!r || !m || !d || m > 12) return iso
    return `${d} ${MIESIACE[m - 1]} ${r}`
}

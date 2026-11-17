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
 * – „karta” – kolumna tekstu + pasek boczny (obraz, spis treści przyklejony); karta z obrazem lub mapą: nagłówek nad siatką,
 *   pasek od pierwszej tabeli (wariant B, 17.11); karta bez obrazu: spis od wysokości tytułu (17.11 po odbiorze);
 *   element <PelnaSzerokosc> przerywa kolumnę (spis na niego nie najeżdża), a spis treści wraca po nim;
 * – „przegladarka” – nagłówek i stopka 1200 px, aplet planu (.przegladarka-aplet) do 1600 px (decyzja 3, 17.11; tylko /plany/[slug]).
 */
export type UkladStrony = 'kolumna' | 'pelna' | 'karta' | 'przegladarka'

/** Element na pełną szerokość wewnątrz strony w układzie „karta” (skan materiału, wstawka we wpisie). */
export function PelnaSzerokosc({ children }: { children: React.ReactNode }) {
    return <div className="pelna-szerokosc">{children}</div>
}

export function UkladKarty({ children, naglowek, bok, spis, sciezka }: { children: React.ReactNode; naglowek?: React.ReactNode; bok?: React.ReactNode; spis?: React.ReactNode; sciezka?: Sciezka }) {
    const odcinki: { pelny: boolean; el: React.ReactNode[] }[] = []
    for (const el of React.Children.toArray(children)) {
        const pelny = React.isValidElement(el) && el.type === PelnaSzerokosc
        const ost = odcinki[odcinki.length - 1]
        if (!pelny && ost && !ost.pelny) ost.el.push(el)
        else odcinki.push({ pelny, el: [el] })
    }
    const aside = (bok || spis) ? <aside className="karta-bok" aria-label="obok treści">{bok}{spis && <div className="karta-spis">{spis}</div>}</aside> : null
    const dalej = spis ? <div className="karta-bok karta-bok-dalej" {...({ inert: true } as object)}><div className="karta-spis">{spis}</div></div> : null
    // decyzja 17.11 po odbiorze (canva „spis treści karty”, wariant 1): karta bez obrazu (materiał, zbiór, temat, instytucja,
    // publikacja) – spis od wysokości tytułu; karta z obrazem lub mapą – wariant B (obraz i spis przy pierwszej części)
    const odGory = !!spis && !bok
    if (odGory) {
        // nagłówek w pierwszej kolumnie pierwszego odcinka, spis obok; gdy karta zaczyna się od elementu pełnej szerokości
        // (skan materiału) – odcinek z samym nagłówkiem, spis nie najeżdża na skan i wraca w następnym odcinku (przyklejony)
        const pierwszyZwykly = odcinki.length > 0 && !odcinki[0].pelny
        return (
            <>
                {sciezka && <Okruszki sciezka={sciezka} />}
                <div className="karta-odcinek karta-odcinek-pierwszy karta-odcinek-od-gory">
                    {aside}
                    <div className="karta-kolumna">
                        {naglowek && <div className="karta-naglowek">{naglowek}</div>}
                        {pierwszyZwykly && odcinki[0].el}
                    </div>
                </div>
                {odcinki.map((o, i) => {
                    if (pierwszyZwykly && i === 0) return null
                    if (o.pelny) return <React.Fragment key={i}>{o.el}</React.Fragment>
                    return <div key={i} className="karta-odcinek"><div className="karta-kolumna">{o.el}</div>{dalej}</div>
                })}
            </>
        )
    }
    // wariant B: pasek boczny (obraz, spis) zaczyna się przy pierwszej tabeli
    const pierwszy = odcinki.findIndex((o) => !o.pelny && o.el.length > 0)
    return (
        <>
            {sciezka && <Okruszki sciezka={sciezka} />}
            {naglowek && <div className="karta-naglowek">{naglowek}</div>}
            {pierwszy < 0 && aside && <div className="karta-odcinek karta-odcinek-pierwszy">{aside}</div>}
            {odcinki.map((o, i) => {
                if (o.pelny) return <React.Fragment key={i}>{o.el}</React.Fragment>
                if (i === pierwszy) return <div key={i} className="karta-odcinek karta-odcinek-pierwszy">{aside}<div className="karta-kolumna">{o.el}</div></div>
                return <div key={i} className="karta-odcinek"><div className="karta-kolumna">{o.el}</div>{i > pierwszy && dalej}</div>
            })}
        </>
    )
}

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

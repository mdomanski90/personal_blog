import * as React from 'react'
import { Link } from 'next-view-transitions'

// JW-1 · komponenty bazowe języka wizualnego (zasada 5.1c). Wygląd wyłącznie z klas i tokenów app/globals.css;
// każdy wzorzec ma wpis w lib/szablony/rejestr.ts i podgląd w panelu (/keystatic/panel/wzorce).

export type Sciezka = { tekst: string; href: string }[]

/**
 * Okruszki – wspólne dla wszystkich stron poza główną: „strona główna / dział / …”; bieżąca strona to tytuł pod spodem.
 * W druku zamiast nich „odniepamieci.pl / dział” i pełny adres strony (JW-17).
 */
export function Okruszki({ sciezka }: { sciezka: Sciezka }) {
    const dzial = sciezka[sciezka.length - 1]?.tekst
    return (
        <>
            <nav aria-label="okruszki" className="okruszki">
                <ol>
                    <li><Link href="/">strona główna</Link></li>
                    {sciezka.map((s) => <li key={s.href}><Link href={s.href}>{s.tekst}</Link></li>)}
                </ol>
            </nav>
            <p className="druk-naglowek" aria-hidden="true">odniepamieci.pl{dzial ? ` / ${dzial}` : ''}</p>
        </>
    )
}

/** Tytuł sekcji: małe litery, 20 px, kolor akcentu, krótka kreska pod spodem (wzorzec ze strony głównej 16.11). */
export function TytulSekcji({ children, id, poziom = 2 }: { children: React.ReactNode; id?: string; poziom?: 2 | 3 }) {
    const H = poziom === 3 ? 'h3' : 'h2'
    return <H id={id} className="tytul-sekcji">{children}</H>
}

export type Plec = 'K' | 'M' | 'U' | string

/** Pastylka osoby: odnośnik do karty osoby w kolorach płci z drzewa (tokeny --osoba-k/m/u-…). Lata, miejscowość obok – zwykłym tekstem. */
export function PastylkaOsoby({ href, plec, children }: { href: string; plec?: Plec; children: React.ReactNode }) {
    const p = plec === 'K' || plec === 'M' ? plec : 'U'
    return <Link href={href} className={`osoba-link osoba-${p}`}>{children}</Link>
}

/**
 * Pastylka filtra (.szukaj-filtr). Filtr z wynikiem 0 jest ukryty (decyzja 16.11), chyba że jest właśnie wybrany.
 * „liczba” – dopisana po kropce, jak „wszystko · 12”.
 */
export function PastylkaFiltra({ href, aktywny = false, liczba, title, children }: { href: string; aktywny?: boolean; liczba?: number; title?: string; children: React.ReactNode }) {
    if (liczba === 0 && !aktywny) return null
    return (
        <Link href={href} className="szukaj-filtr" aria-current={aktywny ? 'true' : undefined} title={title}>
            {children}{liczba !== undefined && <span className="szukaj-filtr-liczba"> · {liczba}</span>}
        </Link>
    )
}

/** Rząd pastylek filtrów; drugi i kolejne rzędy z podpisem (np. „miejscowość:”). Bezpośrednio pod tytułem katalogu. */
export function RzadFiltrow({ podpis, etykieta, children }: { podpis?: string; etykieta?: string; children: React.ReactNode }) {
    return (
        <div className="filtry-rzad" role="group" aria-label={etykieta ?? podpis ?? 'filtry'}>
            {podpis && <span className="filtry-podpis">{podpis}</span>}
            {children}
        </div>
    )
}

/**
 * Rząd „wybrane:” nad listą katalogu – każdy aktywny filtr z ✕ (zwykły odnośnik bez tego filtra),
 * przy dwóch i więcej – „wyczyść wszystko”. Wspólny dla archiwum i biblioteki.
 */
export function WybraneFiltry({ wybrane, wyczysc }: { wybrane: { klucz: string; etykieta: string; href: string }[]; wyczysc: string }) {
    if (!wybrane.length) return null
    return (
        <div className="k-wybrane" aria-label="wybrane filtry">
            <span className="k-wybrane-etykieta">wybrane:</span>
            {wybrane.map((x) => <Link key={x.klucz} href={x.href} className="k-wybrany" aria-label={`usuń filtr: ${x.etykieta}`}>{x.etykieta} <span aria-hidden="true">✕</span></Link>)}
            {wybrane.length > 1 && <Link href={wyczysc} className="odn k-wybrane-wyczysc">wyczyść wszystko</Link>}
        </div>
    )
}

/** „← poprzednia · 2 / 5 · następna →” pod listą katalogu; przy jednej stronie nic. Wspólne dla archiwum i biblioteki. */
export function NawigacjaStron({ strona, stron, adres, etykieta }: { strona: number; stron: number; adres: (n: number) => string; etykieta: string }) {
    if (stron <= 1) return null
    return (
        <nav aria-label={etykieta} className="flex flex-wrap items-center gap-3">
            {strona > 1 && <Link href={adres(strona - 1)} className="odn">← poprzednia</Link>}
            <span className="ot-drobne">{strona} / {stron}</span>
            {strona < stron && <Link href={adres(strona + 1)} className="odn">następna →</Link>}
        </nav>
    )
}

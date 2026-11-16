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

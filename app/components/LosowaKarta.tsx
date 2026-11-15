'use client'

// Okno „z archiwum” na stronie głównej (P7A-4): materiał tygodnia i kilka z poprzednich tygodni – tylko publiczne
// pozycje z opisem; zestaw wybiera serwer. Bez samoczynnej zmiany treści (recenzja UX, JV-07).

import * as React from 'react'
import { Link } from 'next-view-transitions'
import type { PozycjaLosowa } from '@/lib/archiwum'
import { pozycjaKadru } from '@/lib/kadr'

function rodzajPozycji(p: PozycjaLosowa): 'material' | 'osoba' | 'miejsce' | 'obiekt' | 'temat' {
    return (p.klucz.split(':')[0] as ReturnType<typeof rodzajPozycji>) ?? 'temat'
}
const DALEJ: Record<ReturnType<typeof rodzajPozycji>, string> = {
    material: 'obejrzyj →',
    osoba: 'karta osoby →',
    miejsce: 'karta miejscowości →',
    obiekt: 'zobacz obiekt →',
    temat: 'czytaj o temacie →',
}

/** Zastępcza miniatura, gdy pozycja nie ma zdjęcia – ten sam rozmiar, prosta ikonka rodzaju. */
function Ikonka({ rodzaj }: { rodzaj: ReturnType<typeof rodzajPozycji> }) {
    if (rodzaj === 'osoba') return <svg width="46" height="56" viewBox="0 0 44 54" aria-hidden="true"><circle cx="22" cy="17" r="10" /><path d="M4 52c2-12 9-18 18-18s16 6 18 18" /></svg>
    if (rodzaj === 'miejsce') return <svg width="60" height="60" viewBox="0 0 62 62" aria-hidden="true"><path d="M6 40c10-6 18 4 28-2s14-10 22-6" /><path d="M12 14l14 6 16-4 8 14-6 18-20 4-14-12z" strokeDasharray="3 2" /><circle cx="30" cy="28" r="3.5" className="kl-pkt" /></svg>
    if (rodzaj === 'material') return <svg width="46" height="58" viewBox="0 0 46 58" aria-hidden="true"><path d="M4 3h28l10 10v42H4z" /><path d="M32 3v10h10M11 22h24M11 29h24M11 36h24M11 43h16" /></svg>
    if (rodzaj === 'obiekt') return <svg width="44" height="58" viewBox="0 0 44 58" aria-hidden="true"><path d="M22 4v50M10 18h24M14 54h16" /></svg>
    return <svg width="50" height="50" viewBox="0 0 50 50" aria-hidden="true"><path d="M8 10h34v30H8zM14 18h22M14 25h22M14 32h14" /></svg>
}

/** Etykieta pozycji: pierwsza to materiał tego tygodnia, kolejne – z poprzednich tygodni. */
const kiedy = (j: number) => (j === 0 ? 'materiał tygodnia' : j === 1 ? 'tydzień temu' : `${j} tyg. temu`)

/**
 * P7A-4 (JV-07): „materiał tygodnia” zamiast samoczynnej zmiany co 12 s. Pozycja jest stała przez cały
 * tydzień (wybiera serwer), strzałki pokazują kilka wcześniejszych; nic nie zmienia się samo.
 */
export default function LosowaKarta({ pozycje }: { pozycje: PozycjaLosowa[] }) {
    const [i, ustawI] = React.useState(0)
    const [recznie, ustawRecznie] = React.useState(false)
    const n = pozycje.length
    const p = pozycje[i % Math.max(n, 1)]
    if (!p) return null
    const rodzaj = rodzajPozycji(p)
    const idz = (o: number) => { ustawI((x) => Math.min(Math.max(x + o, 0), n - 1)); ustawRecznie(true) }

    return (
        <aside className="karta-losowa" aria-label="z archiwum">
            <h2 className="kl-naglowek">z archiwum</h2>
            {/* po przejściu strzałką czytnik ekranu odczytuje nową pozycję */}
            <div key={p.klucz} className="kl-srodek" aria-live={recznie ? 'polite' : 'off'} aria-atomic="true">
                <div className="kl-tekst">
                    <span className="kl-rodzaj">{kiedy(i)} · {p.rodzaj}</span>
                    <Link href={p.href} className="kl-tytul">{p.tytul}</Link>
                    <p className="kl-opis">{p.tekst}</p>
                </div>
                <Link href={p.href} className="kl-mini" tabIndex={-1} aria-hidden="true">
                    {p.zdjecie
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={`${p.zdjecie}?w=320`} alt="" loading="lazy" style={{ objectPosition: pozycjaKadru(p.kadr) }} />
                        : <Ikonka rodzaj={rodzaj} />}
                </Link>
            </div>
            <div className="kl-stopka">
                {n > 1 ? (
                    <span className="kl-strzalki">
                        <button type="button" className="k-btn kl-strzalka" onClick={() => idz(-1)} disabled={i === 0} aria-label="nowszy (bliżej tego tygodnia)">
                            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M12 4l-6 6 6 6" /></svg>
                        </button>
                        <button type="button" className="k-btn kl-strzalka" onClick={() => idz(1)} disabled={i === n - 1} aria-label="wcześniejszy tydzień">
                            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4l6 6-6 6" /></svg>
                        </button>
                        <span className="kl-licznik">{i + 1} z {n}</span>
                    </span>
                ) : <span />}
                <span className="kl-odnosniki">
                    <Link href={p.href} className="kl-dalej">{DALEJ[rodzaj]}</Link>
                    <Link href="/archiwum" className="odn kl-wiecej">więcej z archiwum</Link>
                </span>
            </div>
        </aside>
    )
}

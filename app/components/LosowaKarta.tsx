'use client'

// Okno „z archiwum” na stronie głównej: kilka losowych pozycji (dokument, osoba, miejscowość, obiekt, temat –
// tylko publiczne i z opisem; zestaw wybiera serwer) zmienia się samo co 12 s. Zawsze ten sam układ i stała
// wysokość, więc nic pod spodem się nie przesuwa. Kropki pokazują wybraną pozycję, ❚❚ wstrzymuje (zapamiętane
// w przeglądarce). Samo się nie zmienia, gdy kursor albo fokus jest w oknie, karta jest w tle albo w systemie
// włączone jest „ogranicz ruch” (wtedy tylko kropki).

import * as React from 'react'
import { Link } from 'next-view-transitions'
import type { PozycjaLosowa } from '@/lib/archiwum'

const CO_ILE = 12_000
const KLUCZ = 'z-archiwum-pauza'

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
const NAZWA: Record<ReturnType<typeof rodzajPozycji>, string> = { material: 'materiał', osoba: 'osoba', miejsce: 'miejscowość', obiekt: 'obiekt', temat: 'temat' }

/** Zastępcza miniatura, gdy pozycja nie ma zdjęcia – ten sam rozmiar, prosta ikonka rodzaju. */
function Ikonka({ rodzaj }: { rodzaj: ReturnType<typeof rodzajPozycji> }) {
    if (rodzaj === 'osoba') return <svg width="46" height="56" viewBox="0 0 44 54" aria-hidden="true"><circle cx="22" cy="17" r="10" /><path d="M4 52c2-12 9-18 18-18s16 6 18 18" /></svg>
    if (rodzaj === 'miejsce') return <svg width="60" height="60" viewBox="0 0 62 62" aria-hidden="true"><path d="M6 40c10-6 18 4 28-2s14-10 22-6" /><path d="M12 14l14 6 16-4 8 14-6 18-20 4-14-12z" strokeDasharray="3 2" /><circle cx="30" cy="28" r="3.5" className="kl-pkt" /></svg>
    if (rodzaj === 'material') return <svg width="46" height="58" viewBox="0 0 46 58" aria-hidden="true"><path d="M4 3h28l10 10v42H4z" /><path d="M32 3v10h10M11 22h24M11 29h24M11 36h24M11 43h16" /></svg>
    if (rodzaj === 'obiekt') return <svg width="44" height="58" viewBox="0 0 44 58" aria-hidden="true"><path d="M22 4v50M10 18h24M14 54h16" /></svg>
    return <svg width="50" height="50" viewBox="0 0 50 50" aria-hidden="true"><path d="M8 10h34v30H8zM14 18h22M14 25h22M14 32h14" /></svg>
}

export default function LosowaKarta({ pozycje }: { pozycje: PozycjaLosowa[] }) {
    const [i, ustawI] = React.useState(0)
    const [pauza, ustawPauze] = React.useState(false)
    const [spokoj, ustawSpokoj] = React.useState(false) // „ogranicz ruch” w systemie
    const [wstrzymana, ustawWstrzymana] = React.useState(false) // kursor/fokus w oknie
    const [zmienionaRecznie, ustawZmienionaRecznie] = React.useState(false)

    React.useEffect(() => {
        try { ustawPauze(localStorage.getItem(KLUCZ) === '1') } catch { /* bez pamięci */ }
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
        ustawSpokoj(mq.matches)
        const zmiana = () => ustawSpokoj(mq.matches)
        mq.addEventListener('change', zmiana)
        return () => mq.removeEventListener('change', zmiana)
    }, [])

    const n = pozycje.length
    const krecisie = n > 1 && !pauza && !spokoj && !wstrzymana
    React.useEffect(() => {
        if (!krecisie) return
        const t = window.setInterval(() => { if (!document.hidden) ustawI((x) => (x + 1) % n) }, CO_ILE)
        return () => window.clearInterval(t)
    }, [krecisie, n, i])

    const p = pozycje[i % Math.max(n, 1)]
    if (!p) return null
    const rodzaj = rodzajPozycji(p)
    const przelaczPauze = () => {
        const nowa = !pauza
        ustawPauze(nowa)
        try { localStorage.setItem(KLUCZ, nowa ? '1' : '0') } catch { /* bez pamięci */ }
    }

    return (
        <aside
            className="karta-losowa"
            aria-roledescription="karuzela"
            aria-label="z archiwum"
            onMouseEnter={() => ustawWstrzymana(true)}
            onMouseLeave={() => ustawWstrzymana(false)}
            onFocus={() => ustawWstrzymana(true)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) ustawWstrzymana(false) }}
        >
            <div className="kl-gora">
                <b>z archiwum</b>
                {n > 1 && (
                    <span className="kl-sterowanie">
                        <span role="group" aria-label="wybierz propozycję" className="kl-kropki">
                            {pozycje.map((x, j) => (
                                <button key={x.klucz} type="button" className="kl-kropka" aria-label={`${j + 1} z ${n}: ${NAZWA[rodzajPozycji(x)]}`} aria-current={j === i ? 'true' : undefined}
                                    onClick={() => { ustawI(j); ustawZmienionaRecznie(true) }}><i /></button>
                            ))}
                        </span>
                        {!spokoj && (
                            <button type="button" className="kl-pauza" onClick={przelaczPauze} aria-label={pauza ? 'wznów zmienianie' : 'wstrzymaj zmienianie'} title={pauza ? 'wznów' : 'wstrzymaj'}>
                                {pauza ? '▶' : '❚❚'}
                            </button>
                        )}
                    </span>
                )}
            </div>
            {/* przy samoczynnej zmianie czytnik ekranu nie przerywa; po kliknięciu kropki – odczytuje nową pozycję */}
            <div key={p.klucz} className="kl-srodek" aria-live={krecisie && !zmienionaRecznie ? 'off' : 'polite'} aria-atomic="true">
                <Link href={p.href} className="kl-mini" tabIndex={-1} aria-hidden="true">
                    {p.zdjecie
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={`${p.zdjecie}?w=320`} alt="" loading="lazy" />
                        : <Ikonka rodzaj={rodzaj} />}
                </Link>
                <div className="kl-tekst">
                    <span className="kl-rodzaj">{p.rodzaj}</span>
                    <Link href={p.href} className="kl-tytul">{p.tytul}</Link>
                    <p className="kl-opis">{p.tekst}</p>
                    <Link href={p.href} className="odn kl-dalej">{DALEJ[rodzaj]}</Link>
                </div>
            </div>
        </aside>
    )
}

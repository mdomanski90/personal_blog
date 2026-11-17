'use client'
import * as React from 'react'
import { przewinDo } from '@/lib/ruch'

export interface PozycjaSpisu { id: string; tekst: string }

/**
 * JW-1 · spis treści karty / materiału / wpisu (makiety v2, 16.11).
 * Na komputerze w pasku bocznym, przyklejony 24 px od góry (Strona uklad="karta"); aktywna część podświetlana
 * przy przewijaniu (IntersectionObserver), kliknięcie przewija do części i przenosi na nią fokus.
 * Na telefonie zwijany wiersz „na tej stronie” pod tytułem (domyślnie zwinięty).
 */
export default function SpisTresci({ pozycje, tytul = 'na tej stronie' }: { pozycje: PozycjaSpisu[]; tytul?: string }) {
    const [aktywna, ustawAktywna] = React.useState(pozycje[0]?.id)
    const details = React.useRef<HTMLDetailsElement>(null)
    const klucz = pozycje.map((p) => p.id).join('|')

    React.useEffect(() => {
        if (details.current && window.matchMedia('(max-width: 900px)').matches) details.current.open = false
    }, [])

    React.useEffect(() => {
        const cele = klucz.split('|').map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e)
        if (!cele.length || typeof IntersectionObserver === 'undefined') return
        // aktywna = ostatnia część, której początek minął górną 1/3 okna (pierwsza, gdy żadna)
        const przelicz = () => {
            const granica = window.innerHeight / 3
            let akt = cele[0].id
            for (const c of cele) if (c.getBoundingClientRect().top <= granica) akt = c.id
            ustawAktywna(akt)
        }
        const obs = new IntersectionObserver(przelicz, { rootMargin: '0px 0px -66% 0px', threshold: [0, 1] })
        cele.forEach((c) => obs.observe(c))
        przelicz()
        return () => obs.disconnect()
    }, [klucz])

    if (!pozycje.length) return null

    const przejdz = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        const cel = document.getElementById(id)
        if (!cel) return
        e.preventDefault()
        przewinDo(cel, { block: 'start' })
        if (!cel.hasAttribute('tabindex')) cel.setAttribute('tabindex', '-1')
        cel.focus({ preventScroll: true })
        history.replaceState(null, '', `#${id}`)
        ustawAktywna(id)
    }

    return (
        <nav className="spis-tresci" aria-label="spis treści">
            <details ref={details} open>
                <summary className="spis-tresci-tytul">{tytul}</summary>
                <div className="rozwin-tresc">
                <ol>
                    {pozycje.map((p) => (
                        <li key={p.id}>
                            <a href={`#${p.id}`} aria-current={p.id === aktywna ? 'location' : undefined} onClick={(e) => przejdz(e, p.id)}>{p.tekst}</a>
                        </li>
                    ))}
                </ol>
                </div>
            </details>
        </nav>
    )
}

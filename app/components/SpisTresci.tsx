'use client'
import * as React from 'react'
import { przewinDo } from '@/lib/ruch'

export interface PozycjaSpisu { id: string; tekst: string }

/**
 * Spis treści karty / materiału / wpisu – pasek części pod nagłówkiem karty (decyzja 17.11 po odbiorze etapu 3:
 * „od góry i widoczny cały czas”; zastępuje spis w pasku bocznym). Przyklejony do górnej krawędzi okna na całej
 * wysokości karty, także obok elementów pełnej szerokości (skan, wstawki). Aktywna część podświetlana przy przewijaniu,
 * kliknięcie przewija do części (pod paskiem – scroll-margin w CSS) i przenosi na nią fokus. Na wąskim ekranie
 * pozycje przewijają się w poziomie, aktywna zawsze widoczna.
 */
export default function SpisTresci({ pozycje, tytul = 'na tej stronie' }: { pozycje: PozycjaSpisu[]; tytul?: string }) {
    const [aktywna, ustawAktywna] = React.useState(pozycje[0]?.id)
    const lista = React.useRef<HTMLOListElement>(null)
    const pasek = React.useRef<HTMLElement>(null)
    const klucz = pozycje.map((p) => p.id).join('|')
    const wybrana = React.useRef<string | null>(null)   // część wybrana w spisie – ważna do następnego ruchu czytelnika

    React.useEffect(() => {
        const cele = klucz.split('|').map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e)
        if (!cele.length) return
        // aktywna = ostatnia część, której początek minął dolną krawędź paska + 1/4 okna (pierwsza, gdy żadna)
        let rama = 0
        const przelicz = () => {
            rama = 0
            const granica = (pasek.current?.getBoundingClientRect().bottom ?? 0) + window.innerHeight / 4
            let akt = cele[0].id
            for (const c of cele) if (c.getBoundingClientRect().top <= granica) akt = c.id
            // koniec strony: ostatnie części nie dojdą do granicy – aktywna ostatnia widoczna w oknie
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2)
                for (const c of cele) if (c.getBoundingClientRect().top < window.innerHeight) akt = c.id
            const w = wybrana.current && document.getElementById(wybrana.current)
            if (w) { const t = w.getBoundingClientRect().top; if (t >= 0 && t < window.innerHeight) akt = w.id }
            ustawAktywna(akt)
        }
        const zaplanuj = () => { if (!rama) rama = requestAnimationFrame(przelicz) }
        const ruch = () => { wybrana.current = null }
        window.addEventListener('scroll', zaplanuj, { passive: true })
        window.addEventListener('resize', zaplanuj)
        for (const z of ['wheel', 'touchstart', 'keydown'] as const) window.addEventListener(z, ruch, { passive: true })
        przelicz()
        return () => {
            window.removeEventListener('scroll', zaplanuj); window.removeEventListener('resize', zaplanuj)
            for (const z of ['wheel', 'touchstart', 'keydown'] as const) window.removeEventListener(z, ruch)
            if (rama) cancelAnimationFrame(rama)
        }
    }, [klucz])

    // aktywna pozycja widoczna w przewijanym poziomo pasku (bez przewijania strony w pionie)
    React.useEffect(() => {
        const ol = lista.current
        const a = ol?.querySelector<HTMLElement>('a[aria-current]')
        if (!ol || !a || ol.scrollWidth <= ol.clientWidth) return
        const l = a.offsetLeft - ol.offsetLeft
        if (l < ol.scrollLeft || l + a.offsetWidth > ol.scrollLeft + ol.clientWidth) ol.scrollLeft = Math.max(0, l - 16)
    }, [aktywna])

    if (!pozycje.length) return null

    const przejdz = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        const cel = document.getElementById(id)
        if (!cel) return
        e.preventDefault()
        przewinDo(cel, { block: 'start' })
        if (!cel.hasAttribute('tabindex')) cel.setAttribute('tabindex', '-1')
        cel.focus({ preventScroll: true })
        history.replaceState(null, '', `#${id}`)
        wybrana.current = id
        ustawAktywna(id)
    }

    return (
        <nav ref={pasek} className="spis-tresci" aria-label="spis treści">
            <span className="spis-tresci-tytul" aria-hidden="true">{tytul}</span>
            <ol ref={lista}>
                {pozycje.map((p) => (
                    <li key={p.id}>
                        <a href={`#${p.id}`} aria-current={p.id === aktywna ? 'location' : undefined} onClick={(e) => przejdz(e, p.id)}>{p.tekst}</a>
                    </li>
                ))}
            </ol>
        </nav>
    )
}

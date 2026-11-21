'use client'

import * as React from 'react'
import { KRESKI, RAMA } from '@/lib/emblemat-dane'

// Emblemat: kapliczka w Olszance w ramie-łuku (na podstawie obrazka „Kapliczka w Olszance”).
// Przy pierwszym wejściu w danej sesji karty rysuje się sama rama-łuk, a potem cała zawartość spokojnie
// pojawia się naraz; na kolejnych stronach emblemat stoi od razu. Bez animacji przy prefers-reduced-motion. Kolor = currentColor, więc działa w trybie ciemnym.


export default function Emblemat({ rozmiar = 56, animacja = true }: { rozmiar?: number; animacja?: boolean }) {
    // po pierwszym rysowaniu w tej sesji kolejne strony pokazują emblemat od razu (atrybut na <html> wyłącza animację w CSS;
    // przy pełnym wczytaniu ustawia go skrypt w <head>, przy przejściach między stronami – ten efekt)
    React.useEffect(() => {
        if (!animacja) return
        try { sessionStorage.setItem('emblemat', '1') } catch { /* brak dostępu */ }
        const oznacz = () => { document.documentElement.dataset.emblemat = '1' }
        const start = Date.now()
        const t = window.setTimeout(oznacz, 2400)
        // przejście na inną stronę w trakcie rysowania: nowa strona już bez animacji
        // (natychmiastowe odmontowanie – podwójne uruchomienie efektu w trybie deweloperskim – pomijamy)
        return () => { window.clearTimeout(t); if (Date.now() - start > 200) oznacz() }
    }, [animacja])
    return (
        <svg
            viewBox="0 0 80 104"
            width={Math.round((rozmiar * 80) / 104)}
            height={rozmiar}
            className={animacja ? 'emblemat emblemat-rysuj' : 'emblemat'}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="kapliczka w Olszance"
        >
            <path className="emblemat-rama" d={RAMA} pathLength={1} strokeWidth={2} />
            <g className="emblemat-tresc">
                {KRESKI.map((k, i) => (
                    <path key={i} d={k.d} transform={k.g} strokeWidth={k.w ?? 1.4} />
                ))}
                <text fill="currentColor" stroke="none" fontSize={5} fontWeight={700} letterSpacing={0.6} textAnchor="middle" aria-hidden="true">
                    {/* spacja na końcu 1. wiersza: tekst odczytany z rysunku to „KAPLICZKA W OLSZANCE” (axe label-content-name-mismatch); dx cofa jej przesunięcie środka */}
                    <tspan x={40} y={89.5} dx={1.81}>{'KAPLICZKA '}</tspan>
                    <tspan x={40} y={95.7}>W OLSZANCE</tspan>
                </text>
            </g>
        </svg>
    )
}

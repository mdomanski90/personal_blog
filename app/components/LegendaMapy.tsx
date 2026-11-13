import * as React from 'react'
import { KOLEJNOSC_WYZNAN, NAZWY_OBIEKTOW, WYZNANIA, tarczaMiejsca, tarczaObiektu } from '@/lib/tarcze'

function Pozycja({ html, children }: { html: string; children: React.ReactNode }) {
    return (
        <span className="flex items-center" style={{ gap: 6, fontSize: 'calc(12px * var(--font-scale, 1))' }}>
            <span style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: html }} />
            {children}
        </span>
    )
}

/** Objaśnienie znaków mapy; `rodzajeObiektow` – rodzaje obiektów obecne na mapie (tylko one trafiają do legendy). */
export default function LegendaMapy({ rodzajeObiektow = [] }: { rodzajeObiektow?: string[] }) {
    const obecne = Object.keys(NAZWY_OBIEKTOW).filter((r) => rodzajeObiektow.includes(r))
    return (
        <details className="lowercase" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>
            <summary className="cursor-pointer text-gray-600 dark:text-gray-400 w-fit">objaśnienie znaków</summary>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))', gap: '6px 16px', marginTop: 8 }}>
                <Pozycja html={tarczaMiejsca('miasto', [], 'miasto', 24)}>miasto</Pozycja>
                {KOLEJNOSC_WYZNAN.map((w) => (
                    <Pozycja key={w} html={tarczaMiejsca('wies', [w], `wieś: ${WYZNANIA[w].nazwa}`, 24)}>wieś: {WYZNANIA[w].nazwa} (przed 1875)</Pozycja>
                ))}
                <Pozycja html={tarczaMiejsca('wies', ['unickie', 'rzymskokatolickie'], 'kilka wyznań, pierwsze przeważa', 24)}>kilka wyznań – szerszy pas przeważa</Pozycja>
                <Pozycja html={tarczaMiejsca('wies', ['unickie', 'rzymskokatolickie', 'mojzeszowe'], 'wyznania równorzędne', 24, false, true)}>wyznania równorzędne</Pozycja>
                <Pozycja html={tarczaMiejsca('wies', [], 'wieś', 24)}>wieś – wyznanie nieopisane</Pozycja>
                <Pozycja html={tarczaMiejsca('wies', [], 'położenie przybliżone', 24, true)}>położenie przybliżone</Pozycja>
                {obecne.map((r) => (
                    <Pozycja key={r} html={tarczaObiektu(r, NAZWY_OBIEKTOW[r], 26)}>{NAZWY_OBIEKTOW[r]}</Pozycja>
                ))}
                {obecne.length > 0 && <Pozycja html={tarczaObiektu(obecne[0], 'nieistniejący', 26, false)}>obiekt nieistniejący</Pozycja>}
            </div>
        </details>
    )
}

import * as React from 'react'
import { SWIATYNIE, WYZNANIA, tarczaMiejsca, tarczaSwiatyni, type RodzajSwiatyni, type Wyznanie } from '@/lib/tarcze'

function Pozycja({ html, children }: { html: string; children: React.ReactNode }) {
    return (
        <span className="flex items-center" style={{ gap: 6, fontSize: 'calc(12px * var(--font-scale, 1))' }}>
            <span style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: html }} />
            {children}
        </span>
    )
}

/** Objaśnienie znaków mapy; `swiatynie` – czy pokazać też znaki świątyń. */
export default function LegendaMapy({ swiatynie = true }: { swiatynie?: boolean }) {
    return (
        <details className="lowercase" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>
            <summary className="cursor-pointer text-gray-600 dark:text-gray-400 w-fit">objaśnienie znaków</summary>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))', gap: '6px 16px', marginTop: 8 }}>
                <Pozycja html={tarczaMiejsca('miasto', '', 'miasto', 24)}>miasto</Pozycja>
                {(Object.keys(WYZNANIA) as Exclude<Wyznanie, ''>[]).map((w) => (
                    <Pozycja key={w} html={tarczaMiejsca('wies', w, WYZNANIA[w], 24)}>{WYZNANIA[w]} (przed 1875)</Pozycja>
                ))}
                <Pozycja html={tarczaMiejsca('wies', '', 'wieś', 24)}>wieś – wyznanie nieopisane</Pozycja>
                <Pozycja html={tarczaMiejsca('wies', '', 'położenie przybliżone', 24, true)}>położenie przybliżone</Pozycja>
                {swiatynie &&
                    (Object.keys(SWIATYNIE) as RodzajSwiatyni[]).map((r) => (
                        <Pozycja key={r} html={tarczaSwiatyni(r, SWIATYNIE[r], 26)}>{SWIATYNIE[r]}</Pozycja>
                    ))}
                {swiatynie && <Pozycja html={tarczaSwiatyni('cerkiew-unicka', 'nieistniejąca', 26, false)}>świątynia nieistniejąca</Pozycja>}
            </div>
        </details>
    )
}

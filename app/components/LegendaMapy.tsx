import * as React from 'react'
import { KOLEJNOSC_WYZNAN, NAZWY_OBIEKTOW, WYZNANIA, tarczaMiejsca, tarczaObiektu } from '@/lib/tarcze'

function Pozycja({ html, children }: { html: string; children: React.ReactNode }) {
    return (
        <span className="legenda-mapy-poz">
            <span className="legenda-mapy-znak" dangerouslySetInnerHTML={{ __html: html }} />
            {children}
        </span>
    )
}

/**
 * Objaśnienie znaków mapy; `rodzajeObiektow` – rodzaje obiektów obecne na mapie (tylko one trafiają do legendy).
 * P4 (makieta 6): `otwarta` – rozwinięta od początku (mapa miejsc), `zrodlo` – wiersz o podkładzie mapy pod znakami
 * (źródło i licencja wybranego podkładu), mała mapa karty – zwinięta, obok podpisu.
 */
export default function LegendaMapy({ rodzajeObiektow = [], otwarta = false, zrodlo }: { rodzajeObiektow?: string[]; otwarta?: boolean; zrodlo?: string }) {
    const obecne = Object.keys(NAZWY_OBIEKTOW).filter((r) => rodzajeObiektow.includes(r))
    return (
        <details className="legenda-mapy lowercase" open={otwarta || undefined}>
            <summary>legenda</summary>
            <div className="rozwin-tresc">
                <div className="legenda-mapy-siatka">
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
                {zrodlo && <p className="legenda-mapy-zrodlo">{zrodlo}</p>}
            </div>
        </details>
    )
}

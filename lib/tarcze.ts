// Znaczniki mapy w kształcie tarcz herbowych (SVG jako tekst – działa i w MapLibre, i we własnej mapie SVG).
// Wieś: kolor obwódki = wyznanie mieszkańców przed kasatą unii (1875), w środku krzyż.
// Miasto: ciemna tarcza z blankami. Świątynie: tarcza ze schematycznym budynkiem.

export type Wyznanie = '' | 'unicka' | 'katolicka' | 'mieszana' | 'prawoslawna'
export type RodzajSwiatyni = 'cerkiew-unicka' | 'cerkiew-prawoslawna' | 'kosciol' | 'boznica'

export const KOLORY = {
    unicka: '#2f4a7a',
    katolicka: '#8a2f2a',
    prawoslawna: '#6b3a5a',
    boznica: '#5c5a2e',
    nieopisane: '#5f5b52',
    miasto: '#2b2a26',
    tlo: '#fbf8f1',
}

export const WYZNANIA: Record<Exclude<Wyznanie, ''>, string> = {
    unicka: 'wieś unicka',
    katolicka: 'wieś katolicka',
    mieszana: 'wieś mieszana',
    prawoslawna: 'wieś prawosławna',
}

export const SWIATYNIE: Record<RodzajSwiatyni, string> = {
    'cerkiew-unicka': 'cerkiew unicka',
    'cerkiew-prawoslawna': 'cerkiew prawosławna',
    kosciol: 'kościół katolicki',
    boznica: 'bóżnica',
}

const TARCZA = 'M-16-18H16V2C16 12 8 18 0 21C-8 18-16 12-16 2Z'
const LEWA = 'M0-18H-16V2C-16 12-8 18 0 21Z'
const PRAWA = 'M0-18H16V2C16 12 8 18 0 21Z'

const krzyzLacinski = (x: number, kolor: string, s = 1) =>
    `<path transform="translate(${x} -1) scale(${s})" d="M0-8V8M-4.5-3.5H4.5" stroke="${kolor}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
const krzyzWschodni = (x: number, kolor: string, s = 1) =>
    `<path transform="translate(${x} -1) scale(${s})" d="M0-8V8M-2.5-5.5H2.5M-4.5-2.5H4.5M-3 4.5L3 2" stroke="${kolor}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`

const esc = (t: string) => t.replace(/[&<>"]/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[z]!)

function svg(wnetrze: string, rozmiar: number, tytul: string): string {
    tytul = esc(tytul)
    const w = Math.round(rozmiar * (40 / 44))
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -22 40 44" width="${w}" height="${rozmiar}" role="img" aria-label="${tytul}"><title>${tytul}</title>${wnetrze}</svg>`
}

/** Tarcza miejscowości. */
export function tarczaMiejsca(rodzaj: string, wyznanie: Wyznanie, nazwa: string, rozmiar = 30, przyblizone = false): string {
    const kreska = przyblizone ? ' stroke-dasharray="4 3"' : ''
    if (rodzaj === 'miasto') {
        return svg(
            `<path d="${TARCZA}" fill="${KOLORY.miasto}" stroke="${KOLORY.miasto}" stroke-width="2.4" stroke-linejoin="round"/>` +
                `<path d="M-10-13L-10-6H10V-13L6-13V-9.5H2V-13H-2V-9.5H-6V-13Z" fill="${KOLORY.tlo}"/><rect x="-6" y="-4" width="12" height="11" fill="${KOLORY.tlo}"/><path d="M-2.5 7V2.5Q0 0 2.5 2.5V7Z" fill="${KOLORY.miasto}"/>`,
            rozmiar,
            nazwa,
        )
    }
    if (wyznanie === 'mieszana') {
        return svg(
            `<path d="${LEWA}" fill="#e6ecf5"/><path d="${PRAWA}" fill="#f5e6e4"/>` +
                `<path d="${TARCZA}" fill="none" stroke="${KOLORY.miasto}" stroke-width="2.4" stroke-linejoin="round"${kreska}/>` +
                krzyzWschodni(-7, KOLORY.unicka, 0.9) +
                krzyzLacinski(7, KOLORY.katolicka, 0.9),
            rozmiar,
            nazwa,
        )
    }
    const kolor =
        wyznanie === 'unicka' ? KOLORY.unicka : wyznanie === 'katolicka' ? KOLORY.katolicka : wyznanie === 'prawoslawna' ? KOLORY.prawoslawna : KOLORY.nieopisane
    const znak =
        wyznanie === 'unicka' || wyznanie === 'prawoslawna'
            ? krzyzWschodni(0, kolor)
            : wyznanie === 'katolicka'
              ? krzyzLacinski(0, kolor)
              : `<circle cy="-1" r="4.5" fill="${kolor}"/>`
    return svg(`<path d="${TARCZA}" fill="${KOLORY.tlo}" stroke="${kolor}" stroke-width="2.4" stroke-linejoin="round"${kreska}/>${znak}`, rozmiar, nazwa)
}

const BUDYNKI: Record<RodzajSwiatyni, (k: string) => string> = {
    'cerkiew-unicka': (k) =>
        `<g transform="translate(0 3) scale(0.8)" stroke="${k}" fill="none" stroke-width="1.8" stroke-linejoin="round"><path d="M-10 3V-6H10V3Z"/><path d="M-11-6L0-12L11-6"/><path d="M-3-11V-14H3V-11"/><path d="M-3.5-14Q0-19 3.5-14Z" fill="${k}"/><path d="M0-19V-22.5M-1.5-21H1.5" stroke-width="1.2"/></g>`,
    'cerkiew-prawoslawna': (k) =>
        `<g transform="translate(0 3) scale(0.8)" stroke="${k}" fill="none" stroke-width="1.8" stroke-linejoin="round"><path d="M-10 3V-7H10V3Z"/><path d="M-4-7V-11H4V-7"/><path d="M-5-11Q-5-17 0-19Q5-17 5-11Z" fill="${k}"/><path d="M0-19V-23M-1.6-21.6H1.6" stroke-width="1.1"/><path d="M-9-7Q-9-10-7.5-11Q-6-10-6-7Z M6-7Q6-10 7.5-11Q9-10 9-7Z" fill="${k}"/></g>`,
    kosciol: (k) =>
        `<g transform="translate(1 4) scale(0.8)" stroke="${k}" fill="none" stroke-width="1.8" stroke-linejoin="round"><path d="M-2 3V-8H11V3Z"/><path d="M-9 3V-12H-2V3Z"/><path d="M-9-12L-5.5-21L-2-12Z" fill="${k}"/><path d="M-5.5-21V-25M-7-23.5H-4" stroke-width="1.1"/></g>`,
    boznica: (k) =>
        `<g transform="translate(0 2) scale(0.8)" stroke="${k}" fill="none" stroke-width="1.8" stroke-linejoin="round"><path d="M-10 3V-6H10V3Z"/><path d="M-11-6L-7-10H7L11-6Z"/><path d="M-7-10L-4.5-14H4.5L7-10" fill="${k}"/><path d="M0 0.8L-1.8-2.4H1.8Z M0-3.6L-1.8-0.4H1.8Z" stroke-width="0.9"/></g>`,
}

/** Tarcza świątyni; nieistniejąca – przygaszona. */
export function tarczaSwiatyni(rodzaj: RodzajSwiatyni, nazwa: string, rozmiar = 32, istnieje = true): string {
    const k = rodzaj === 'kosciol' ? KOLORY.katolicka : rodzaj === 'cerkiew-unicka' ? KOLORY.unicka : rodzaj === 'cerkiew-prawoslawna' ? KOLORY.prawoslawna : KOLORY.boznica
    const wnetrze = `<g${istnieje ? '' : ' opacity="0.45"'}><path d="${TARCZA}" fill="${KOLORY.tlo}" stroke="${k}" stroke-width="2.4" stroke-linejoin="round"/>${BUDYNKI[rodzaj](k)}</g>`
    return svg(wnetrze, rozmiar, nazwa)
}

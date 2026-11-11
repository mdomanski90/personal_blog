// Znaczniki mapy w kształcie tarcz herbowych (SVG jako tekst – do mapy, legendy i list na stronach).
// Wieś: kolor obwódki = wyznanie mieszkańców przed kasatą unii (1875), w środku krzyż.
// Miasto: ciemna tarcza z blankami. Obiekty w terenie: tarcza ze schematycznym znakiem, kolor wg grupy.

export type Wyznanie = '' | 'unicka' | 'katolicka' | 'mieszana' | 'prawoslawna'

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

// ---------- obiekty w terenie ----------

export const GRUPY_OBIEKTOW: Record<string, string> = {
    swiatynie: 'świątynie',
    cmentarze: 'cmentarze i groby',
    kapliczki: 'kapliczki i krzyże',
    zabudowa: 'dwory i zabudowa',
    pamiec: 'pamięć',
    inne: 'inne',
}

const BRAZ = '#7a5a2a'
const ZABUDOWA = '#6b4f2e'
const GRAFIT = '#3d3a33'
const ZIELEN = '#3f5a3a'

// znak w środku tarczy: współrzędne jak tarcza (-16…16, -18…21), kolor k
type Obiekt = { nazwa: string; grupa: string; kolor: string; znak: (k: string) => string }
const g = (tresc: string, k: string, tr = '') => `<g${tr ? ` transform="${tr}"` : ''} stroke="${k}" fill="none" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${tresc}</g>`
const nagrobek = (k: string) => g(`<path d="M-9 8H9M-5 8V-2Q-5-6 0-6Q5-6 5-2V8"/>`, k)

export const OBIEKTY: Record<string, Obiekt> = {
    'cerkiew-unicka': {
        nazwa: 'cerkiew unicka', grupa: 'swiatynie', kolor: KOLORY.unicka,
        znak: (k) => g(`<path d="M-10 3V-6H10V3Z"/><path d="M-11-6L0-12L11-6"/><path d="M-3-11V-14H3V-11"/><path d="M-3.5-14Q0-19 3.5-14Z" fill="${k}"/><path d="M0-19V-22.5M-1.5-21H1.5" stroke-width="1.2"/>`, k, 'translate(0 3) scale(0.8)'),
    },
    'cerkiew-prawoslawna': {
        nazwa: 'cerkiew prawosławna', grupa: 'swiatynie', kolor: KOLORY.prawoslawna,
        znak: (k) => g(`<path d="M-10 3V-7H10V3Z"/><path d="M-4-7V-11H4V-7"/><path d="M-5-11Q-5-17 0-19Q5-17 5-11Z" fill="${k}"/><path d="M0-19V-23M-1.6-21.6H1.6" stroke-width="1.1"/><path d="M-9-7Q-9-10-7.5-11Q-6-10-6-7Z M6-7Q6-10 7.5-11Q9-10 9-7Z" fill="${k}"/>`, k, 'translate(0 3) scale(0.8)'),
    },
    kosciol: {
        nazwa: 'kościół katolicki', grupa: 'swiatynie', kolor: KOLORY.katolicka,
        znak: (k) => g(`<path d="M-2 3V-8H11V3Z"/><path d="M-9 3V-12H-2V3Z"/><path d="M-9-12L-5.5-21L-2-12Z" fill="${k}"/><path d="M-5.5-21V-25M-7-23.5H-4" stroke-width="1.1"/>`, k, 'translate(1 4) scale(0.8)'),
    },
    boznica: {
        nazwa: 'bóżnica', grupa: 'swiatynie', kolor: KOLORY.boznica,
        znak: (k) => g(`<path d="M-10 3V-6H10V3Z"/><path d="M-11-6L-7-10H7L11-6Z"/><path d="M-7-10L-4.5-14H4.5L7-10" fill="${k}"/><path d="M0 0.8L-1.8-2.4H1.8Z M0-3.6L-1.8-0.4H1.8Z" stroke-width="0.9"/>`, k, 'translate(0 2) scale(0.8)'),
    },
    'cmentarz-katolicki': {
        nazwa: 'cmentarz katolicki', grupa: 'cmentarze', kolor: KOLORY.katolicka,
        znak: (k) => nagrobek(k) + g(`<path d="M0-11V-4M-2.5-8.5H2.5" stroke-width="1.6"/>`, k),
    },
    'cmentarz-unicki': {
        nazwa: 'cmentarz unicki / prawosławny', grupa: 'cmentarze', kolor: KOLORY.unicka,
        znak: (k) => nagrobek(k) + g(`<path d="M0-12V-4M-1.5-10.5H1.5M-3-8.5H3M-2-5.5L2-6.5" stroke-width="1.3"/>`, k),
    },
    'cmentarz-zydowski': {
        nazwa: 'cmentarz żydowski (kirkut)', grupa: 'cmentarze', kolor: KOLORY.boznica,
        znak: (k) => g(`<path d="M-9 8H9M-6 8V-3Q-6-8-2.5-8Q1-8 1-3V8"/><path d="M3 8V0Q3-3 6-3Q8-3 8 0V8" stroke-width="1.5"/>`, k),
    },
    'cmentarz-wojenny': {
        nazwa: 'cmentarz wojenny', grupa: 'cmentarze', kolor: '#4a4f3a',
        znak: (k) => g(`<path d="M-9 8H9M-4-6V8M-8-2H0M4-3V8M1 0H7"/>`, k),
    },
    mogila: {
        nazwa: 'mogiła / grób leśny', grupa: 'cmentarze', kolor: ZIELEN,
        znak: (k) => g(`<path d="M-10 8Q0 2 10 8"/><path d="M0 4V-8M-3.5-4H3.5"/><path d="M-9 1L-6-8L-3 1Z M3 1L6-8L9 1Z" fill="${k}" stroke-width="1"/>`, k),
    },
    kapliczka: {
        nazwa: 'kapliczka', grupa: 'kapliczki', kolor: BRAZ,
        znak: (k) => g(`<path d="M-5 8V-3H5V8Z M-7-3L0-9L7-3"/><path d="M0-9V-13M-1.5-11.5H1.5" stroke-width="1.2"/><path d="M-2 4V0Q0-2 2 0V4" stroke-width="1.1"/>`, k),
    },
    krzyz: {
        nazwa: 'krzyż przydrożny', grupa: 'kapliczki', kolor: BRAZ,
        znak: (k) => g(`<path d="M0-12V8M-6-5H6M-7 8H7" stroke-width="2"/>`, k),
    },
    figura: {
        nazwa: 'figura', grupa: 'kapliczki', kolor: BRAZ,
        znak: (k) => g(`<path d="M-4 8H4V4H-4Z M-2 4V-4H2V4" stroke-width="1.6"/><circle cy="-7" r="2.5" fill="${k}" stroke="none"/>`, k),
    },
    dwor: {
        nazwa: 'dwór / pałac', grupa: 'zabudowa', kolor: ZABUDOWA,
        znak: (k) => g(`<path d="M-11 8V-1H11V8Z M-12-1L-8-7H8L12-1" stroke-width="1.7"/><path d="M-3 8V2H3V8M-4-1V-5H4V-1Z" stroke-width="1.3"/><path d="M-9 3H-6M6 3H9" stroke-width="1.3"/>`, k),
    },
    mlyn: {
        nazwa: 'młyn / wiatrak', grupa: 'zabudowa', kolor: ZABUDOWA,
        znak: (k) => g(`<path d="M-2 8V-4L3-9L8-4V8Z" stroke-width="1.6"/><path d="M3-9L-8-14M3-9L-6-3M3-9L10-16M3-9L12-5" stroke-width="1.4"/>`, k),
    },
    szkola: {
        nazwa: 'szkoła', grupa: 'zabudowa', kolor: ZABUDOWA,
        znak: (k) => g(`<path d="M-10 8V-2H10V8Z M-11-2L0-10L11-2" stroke-width="1.7"/><path d="M-6 3H-2M2 3H6M-6 0H6" stroke-width="1.2"/>`, k),
    },
    budynek: {
        nazwa: 'karczma / inny budynek', grupa: 'zabudowa', kolor: ZABUDOWA,
        znak: (k) => g(`<path d="M-10 8V-2H10V8Z M-11-2L0-9L11-2" stroke-width="1.7"/><path d="M-2 8V2H2V8" stroke-width="1.3"/><circle cx="6" cy="2" r="1.6" fill="${k}" stroke="none"/>`, k),
    },
    pomnik: {
        nazwa: 'pomnik / tablica', grupa: 'pamiec', kolor: GRAFIT,
        znak: (k) => g(`<path d="M-6 8H6V5H-6Z M-3 5V-9H3V5" stroke-width="1.6"/><path d="M-1.5-5H1.5" stroke-width="1.2"/>`, k),
    },
    'miejsce-pamieci': {
        nazwa: 'miejsce wydarzenia / uroczysko', grupa: 'pamiec', kolor: GRAFIT,
        znak: (k) => g(`<circle r="6"/><circle r="1.8" fill="${k}" stroke="none"/>`, k),
    },
    inne: {
        nazwa: 'inny obiekt', grupa: 'inne', kolor: KOLORY.nieopisane,
        znak: (k) => `<rect x="-4" y="-5" width="8" height="8" fill="${k}"/>`,
    },
}

/** Nazwy rodzajów obiektów (do list, metek i eksportu). */
export const NAZWY_OBIEKTOW: Record<string, string> = Object.fromEntries(Object.entries(OBIEKTY).map(([k, v]) => [k, v.nazwa]))
export const grupaObiektu = (rodzaj: string) => OBIEKTY[rodzaj]?.grupa ?? 'inne'

/** Tarcza obiektu w terenie; nieistniejący – przygaszony. */
export function tarczaObiektu(rodzaj: string, nazwa: string, rozmiar = 32, istnieje = true): string {
    const o = OBIEKTY[rodzaj] ?? OBIEKTY.inne
    const wnetrze = `<g${istnieje ? '' : ' opacity="0.45"'}><path d="${TARCZA}" fill="${KOLORY.tlo}" stroke="${o.kolor}" stroke-width="2.4" stroke-linejoin="round"/>${o.znak(o.kolor)}</g>`
    return svg(wnetrze, rozmiar, nazwa)
}

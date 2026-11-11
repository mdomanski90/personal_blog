// Polska odmiana nazw miejscowości i tematów – do wyszukiwarki i (w etapie 3) wyłapywania wzmianek.
// Reguły dla typowych końcówek (-ka, -ica, -nia, -anna, -ów, -ew, -ec, -sk, -ice, -ki, -y, -e, -o);
// nazwy nieregularne w WYJATKI. Wynik: dopełniacz, celownik, biernik, narzędnik, miejscownik
// (bez powtórzeń i bez formy podstawowej). Formy można poprawić ręcznie w panelu.

type Przypadki = [string, string, string, string, string] // D., C., B., N., Ms.

const WYJATKI: Record<string, Przypadki> = {
    Szawły: ['Szaweł', 'Szawłom', 'Szawły', 'Szawłami', 'Szawłach'],
    Unici: ['Unitów', 'Unitom', 'Unitów', 'Unitami', 'Unitach'],
    unia: ['unii', 'unii', 'unię', 'unią', 'unii'],
    Unia: ['Unii', 'Unii', 'Unię', 'Unią', 'Unii'],
}

// zmiękczenie przed -e w celowniku/miejscowniku (Olszanka → Olszance, Mszanna → Mszannie)
const MIEKCZENIE: [string, string][] = [
    ['ch', 'sze'], ['k', 'ce'], ['g', 'dze'], ['r', 'rze'], ['ł', 'le'], ['t', 'cie'], ['d', 'dzie'],
    ['st', 'ście'], ['zd', 'ździe'], ['sł', 'śle'], ['sn', 'śnie'], ['zn', 'źnie'],
    ['n', 'nie'], ['s', 'sie'], ['z', 'zie'], ['w', 'wie'], ['m', 'mie'], ['p', 'pie'], ['b', 'bie'], ['f', 'fie'],
]

function zmiekcz(temat: string): string {
    for (const [z, na] of [...MIEKCZENIE].sort((a, b) => b[0].length - a[0].length)) {
        if (temat.endsWith(z)) return temat.slice(0, -z.length) + na
    }
    return temat + 'u'
}

const TWARDE_POPRZEDZAJACE_Y = /(c|cz|sz|rz|ż|dz|dż)$/

type Rodzaj = 'ż' | 'm' | 'n' | 'mn'

function rzeczownik(w: string): { przypadki: Przypadki; rodzaj: Rodzaj } | null {
    if (WYJATKI[w]) return { przypadki: WYJATKI[w], rodzaj: 'mn' }
    const l = w.toLowerCase()
    // liczba mnoga męskoosobowa na -cy (grekokatolicy → grekokatolików)
    if (/[^aeiouyąęó]cy$/.test(l) || /icy$/.test(l)) {
        const t = w.slice(0, -2) + 'k'
        return { przypadki: [t + 'ów', t + 'om', t + 'ów', t + 'ami', t + 'ach'], rodzaj: 'mn' }
    }
    // liczba mnoga
    if (/(k|g)i$/.test(l)) {
        const t = w.slice(0, -1) // Łepk, Szpak
        // spółgłoska przed k: Łepki → Łepek; samogłoska: Szpaki → Szpaków
        const dop = /[aeiouyąęó](k|g)$/.test(t.toLowerCase()) ? t + 'ów' : t.slice(0, -1) + 'e' + t.slice(-1)
        return { przypadki: [dop, t + 'om', w, t + 'ami', t + 'ach'], rodzaj: 'mn' }
    }
    if (/(c|dz)e$/.test(l) || /(sz|cz|rz|ż)e$/.test(l)) {
        const t = w.slice(0, -1) // Łosic, Pościsz
        return { przypadki: [t, t + 'om', w, t + 'ami', t + 'ach'], rodzaj: 'mn' }
    }
    if (/[^i]y$/.test(l) || /[^aeiouyąęó]i$/.test(l)) {
        const t = w.slice(0, -1) // Bejd
        return { przypadki: [t, t + 'om', w, t + 'ami', t + 'ach'], rodzaj: 'mn' }
    }
    // żeńskie na -a
    if (l.endsWith('ia')) {
        const t = w.slice(0, -1) // Radlni
        return { przypadki: [t, t, w.slice(0, -1) + 'ę', w.slice(0, -1) + 'ą', t], rodzaj: 'ż' }
    }
    if (l.endsWith('a')) {
        const t = w.slice(0, -1)
        const lt = t.toLowerCase()
        const dop = /(k|g)$/.test(lt) ? t + 'i' : TWARDE_POPRZEDZAJACE_Y.test(lt) ? t + 'y' : /l$/.test(lt) ? t + 'i' : t + 'y'
        const ms = TWARDE_POPRZEDZAJACE_Y.test(lt) ? t + 'y' : /l$/.test(lt) ? t + 'i' : zmiekcz(t)
        return { przypadki: [dop, ms, t + 'ę', t + 'ą', ms], rodzaj: 'ż' }
    }
    // nijakie na -o
    if (l.endsWith('o')) {
        const t = w.slice(0, -1)
        const lt = t.toLowerCase()
        const ms = /(k|g|ch)$/.test(lt) ? t + 'u' : zmiekcz(t)
        const narz = /(k|g)$/.test(lt) ? t + 'iem' : t + 'em'
        return { przypadki: [t + 'a', t + 'u', w, narz, ms], rodzaj: 'n' }
    }
    // męskie na -ów: Hadynów → Hadynowa, w Hadynowie
    if (l.endsWith('ów')) {
        const t = w.slice(0, -2) + 'ow'
        return { przypadki: [t + 'a', t + 'owi', w, t + 'em', t + 'ie'], rodzaj: 'm' }
    }
    // męskie (nieżywotne – biernik = mianownik)
    if (/[a-ząćęłńóśźż]$/i.test(l)) {
        const welar = /(k|g|ch)$/.test(l)
        const miekka = /(ń|ś|ź|ć|l|j|c|cz|sz|rz|ż|dz)$/.test(l)
        const ms = welar || miekka ? w + 'u' : zmiekcz(w)
        const narz = /(k|g)$/.test(l) ? w + 'iem' : w + 'em'
        return { przypadki: [w + 'a', w + 'owi', w, narz, ms], rodzaj: 'm' }
    }
    return null
}

function przymiotnik(w: string, rodzaj: Rodzaj): Przypadki | null {
    const l = w.toLowerCase()
    const ki = /(k|g)i$/.test(l) || /(k|g)ie$/.test(l) || /(k|g)a$/.test(l)
    const i = ki ? 'i' : 'y'
    let t: string
    if (/(ski|cki|dzki|ki|gi|y|i)$/.test(l) && rodzaj === 'm') {
        t = w.replace(/(y|i)$/, '')
        return [t + (ki ? 'iego' : 'ego'), t + (ki ? 'iemu' : 'emu'), w, t + i + 'm', t + i + 'm']
    }
    if (/a$/.test(l) && rodzaj === 'ż') {
        t = w.slice(0, -1)
        return [t + (ki ? 'iej' : 'ej'), t + (ki ? 'iej' : 'ej'), t + 'ą', t + 'ą', t + (ki ? 'iej' : 'ej')]
    }
    if (/e$/.test(l) && (rodzaj === 'mn' || rodzaj === 'n')) {
        t = w.replace(/i?e$/, '')
        if (rodzaj === 'n') return [t + (ki ? 'iego' : 'ego'), t + (ki ? 'iemu' : 'emu'), w, t + i + 'm', t + i + 'm']
        return [t + i + 'ch', t + i + 'm', w, t + i + 'mi', t + i + 'ch']
    }
    return null
}

const PRZYMIOTNIKI = /^(star|now|wielk|mał|górn|doln|biał|czarn|średn|kolonijn|szlachetn|włościańsk)(y|i|a|e|ie)$/
const wygladaNaPrzymiotnik = (w: string) => {
    const l = w.toLowerCase()
    return /(sk|ck|dzk)(i|a|ie)$/.test(l) || PRZYMIOTNIKI.test(l)
}
const rodzajPrzymiotnika = (w: string): Rodzaj => (/a$/i.test(w) ? 'ż' : /e$/i.test(w) ? 'mn' : 'm')

/** Formy odmiany nazwy (bez formy podstawowej). Pusta lista, gdy nazwy nie umiemy odmienić. */
export function formyOdmiany(nazwa: string): string[] {
    const slowa = nazwa.trim().split(/\s+/)
    if (!slowa.length || !slowa[0]) return []
    // nazwa zaczynająca się od przymiotnika (Biała Podlaska, Stare Łepki)
    if (wygladaNaPrzymiotnik(slowa[0]) && !WYJATKI[slowa[0]]) {
        const r = rodzajPrzymiotnika(slowa[0])
        const pierwszy = przymiotnik(slowa[0], r)
        const reszta = slowa.slice(1).map((s) => (wygladaNaPrzymiotnik(s) ? przymiotnik(s, r) : rzeczownik(s)?.przypadki ?? null))
        if (pierwszy) {
            const wyniki: string[] = []
            for (let p = 0; p < 5; p++) wyniki.push([pierwszy[p], ...reszta.map((x, i) => (x ? x[p] : slowa[i + 1]))].join(' '))
            return [...new Set(wyniki)].filter((f) => f !== nazwa)
        }
    }
    const glowa = rzeczownik(slowa[0])
    if (!glowa) return []
    const wyniki: string[] = []
    for (let p = 0; p < 5; p++) {
        const czesci = [glowa.przypadki[p]]
        for (const s of slowa.slice(1)) {
            const przym = wygladaNaPrzymiotnik(s) ? przymiotnik(s, glowa.rodzaj) : null
            czesci.push(przym ? przym[p] : s)
        }
        wyniki.push(czesci.join(' '))
    }
    return [...new Set(wyniki)].filter((f) => f !== nazwa)
}

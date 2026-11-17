// Style rysunku planu dla obrazów poza stroną (podglad.svg, mapa.png): reguły klas .pl-* i tokeny --pl-* z globals.css.
// Rysunek planu część wyglądu ma w klasach (porządki JW, etap 3) – bez tych reguł obraz poza stroną rysuje je
// domyślnie na czarno (np. przezroczysty obszar trafienia .pl-traf). Lekcja odbioru 17.11: czarny kształt na mapie.

/** reguły najwyższego poziomu, których selektor zaczyna się od klasy .pl- (bez reguł wewnątrz @media) */
export function regulyPlanu(css: string): string {
    const wynik: string[] = []
    let glebokosc = 0, start = 0
    for (let i = 0; i < css.length; i++) {
        const z = css[i]
        if (z === '{') {
            if (glebokosc === 0) {
                const sel = css.slice(start, i).replace(/\/\*[\s\S]*?\*\//g, '').trim()
                const koniec = css.indexOf('}', i)
                if (/^\.pl-[\w-]+/.test(sel) && !sel.startsWith('@') && koniec > 0 && !css.slice(i + 1, koniec).includes('{')) {
                    wynik.push(`${sel}{${css.slice(i + 1, koniec).trim()}}`)
                    i = koniec; start = i + 1; continue
                }
            }
            glebokosc++
        } else if (z === '}') {
            glebokosc = Math.max(0, glebokosc - 1)
            if (glebokosc === 0) start = i + 1
        } else if (z === ';' && glebokosc === 0) start = i + 1
    }
    return wynik.join('\n')
}

/** tokeny z bloku (:root lub .dark) zawierającego --pl-papier */
export function tokenyPlanu(css: string, selektor: ':root' | '.dark'): Map<string, string> {
    const re = new RegExp(`${selektor.replace('.', '\\.')}\\s*\\{([^}]*--pl-papier[^}]*)\\}`)
    const blok = css.match(re)?.[1] ?? ''
    return new Map([...blok.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
}

/** zamiana var(--x[, zapas]) na wartości (dla rysowania bez obsługi zmiennych CSS – sharp / librsvg) */
export function bezZmiennych(tekst: string, tokeny: Map<string, string>): string {
    let s = tekst
    for (let n = 0; n < 4 && s.includes('var('); n++) {
        s = s.replace(/var\(--([\w-]+)\s*(?:,\s*([^()]*))?\)/g, (_, nazwa: string, zapas?: string) =>
            tokeny.get(nazwa) ?? (zapas?.trim() || (nazwa.startsWith('font') ? 'monospace' : '#888')))
    }
    // pusta pozycja listy krojów po usunięciu zmiennej
    return s.replace(/font-family:\s*,/g, 'font-family:')
}

// Łatka 21.11 (podgląd linku): opis pod tytułem w komunikatorach – początek opisu karty, przycięty na końcu zdania.

/** Do ok. `max` znaków: najpierw całe zdania, inaczej na granicy słowa z „…”. Pusty tekst – undefined (zostaje opis serwisu). */
export function opisOg(tekst: string | null | undefined, max = 170): string | undefined {
    const t = (tekst ?? '').replace(/\s+/g, ' ').trim()
    if (!t) return undefined
    if (t.length <= max) return t
    const kawalek = t.slice(0, max + 1)
    const zdanie = Math.max(...['. ', '! ', '? ', '… '].map((z) => kawalek.lastIndexOf(z)))
    if (zdanie >= max * 0.5) return kawalek.slice(0, zdanie + 1).trim()
    const slowo = kawalek.lastIndexOf(' ')
    return `${kawalek.slice(0, slowo > max * 0.5 ? slowo : max).replace(/[\s,;:–-]+$/, '')}…`
}

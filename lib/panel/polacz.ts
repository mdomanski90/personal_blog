// P6b (PD-10): „połącz” w panelu – wzmianka bez odnośnika → [[…]] (odpowiednik „unlinked references” z Logseq).
// Lista z kontekstem, zaznaczenie, podgląd, zapis jako operacja P5 z „cofnij” (lib/panel/operacje.ts).
// Wcześniej tylko skrypt w terminalu (scripts/wzmianki.ts – teraz korzysta z tej samej logiki).
//
// Pomija teksty już powiązane z pozycją (odnośnikiem albo polem w panelu: miejsca, tematy, należy do),
// a w treści: istniejące [[…]], linki, obrazki, kod, komponenty {% … %}, tabele i nagłówki. Hasła słownika – pominięte
// (zwykłe słowa rozpoznaje sieć powiązań bez [[…]]; „połącz” zamieniałby je masowo).

import { ODNOSNIK, wzorzecWzmianek, znajdzWzmianki, type Cel, type PozycjaSieci, type Rozwiaz } from '../odnosniki'

export interface TekstDoPolaczenia {
    /** ścieżka względna, np. content/miejsca/testowo.mdoc */
    plik: string
    zrodlo: Cel
    /** cała zawartość pliku (nagłówek YAML + treść) */
    zawartosc: string
    /** pozycje już powiązane polami w panelu */
    zwiazane: Set<string>
}

export interface Wzmianka {
    /** stały w obrębie niezmienionego pliku: plik:początek:cel */
    klucz: string
    plik: string
    zrodlo: { rodzaj: string; id: string; nazwa: string }
    cel: { rodzaj: string; id: string; nazwa: string }
    /** położenie w całej zawartości pliku */
    start: number
    koniec: number
    slowo: string
    nowy: string
    przed: string
    po: string
    /** pierwsza wzmianka tej pozycji w tym tekście – domyślnie zaznaczona (jak dawny skrypt) */
    pierwsza: boolean
}

const kluczCelu = (c: { rodzaj: string; id: string }) => `${c.rodzaj}:${c.id}`

/** Nagłówek YAML (--- … ---) i treść. */
export function rozdzielPlik(plik: string): { naglowek: string; tresc: string } {
    const m = plik.match(/^(---\n[\s\S]*?\n?---\n?)([\s\S]*)$/)
    return m ? { naglowek: m[1], tresc: m[2] } : { naglowek: '', tresc: plik }
}

/** Zastępuje spacjami fragmenty, w których nie wolno wstawiać odnośników (zachowuje długość tekstu). */
export function zamaskuj(tresc: string): string {
    const spacje = (m: string) => m.replace(/[^\n]/g, ' ')
    return tresc
        .replace(/```[\s\S]*?```/g, spacje)
        .replace(/\{%[\s\S]*?%\}/g, spacje)
        .replace(/`[^`\n]*`/g, spacje)
        .replace(/!?\[[^\]\n]*\]\([^)\n]*\)/g, spacje)
        .replace(/<[^>\n]+>/g, spacje)
        .replace(/^[ \t]*(\||#).*$/gm, spacje)
}

const kontekst = (t: string, a: number, b: number, ile = 60) => ({
    przed: ((Math.max(0, a - ile) > 0 ? '…' : '') + t.slice(Math.max(0, a - ile), a)).replace(/\s+/g, ' '),
    po: (t.slice(b, b + ile) + (b + ile < t.length ? '…' : '')).replace(/\s+/g, ' '),
})

/** Wzorce wzmianek dla pozycji sieci (bez wpisów i haseł). */
export function wzorcePozycji(pozycje: PozycjaSieci[]) {
    return pozycje.filter((p) => p.cel.rodzaj !== 'wpis' && p.cel.rodzaj !== 'haslo' && p.nazwy.length > 0)
        .map((p) => ({ cel: p.cel, wzorzec: wzorzecWzmianek(p.nazwy, p.cel.rodzaj === 'temat') }))
}

/** Wszystkie wzmianki bez odnośnika w jednym tekście. */
export function wzmiankiWTekscie(t: TekstDoPolaczenia, wzorce: ReturnType<typeof wzorcePozycji>, rozwiaz: Rozwiaz): Wzmianka[] {
    const { naglowek, tresc } = rozdzielPlik(t.zawartosc)
    // panel może zapisać nawiasy z ukośnikiem (\[\[…\]\]) – do wyszukiwania „\[\[” → „  [[” (ta sama długość)
    const doSzukania = tresc.replace(/\\\[\\\[/g, '  [[').replace(/\\\]\\\]/g, ']]  ').replace(/\\\|/g, ' |')
    const maska = zamaskuj(doSzukania)
    const polaczone = new Set<string>()
    for (const o of doSzukania.matchAll(ODNOSNIK)) { const c = rozwiaz(o[1]); if (c) polaczone.add(kluczCelu(c)) }
    // jak zapisać cel w odnośniku: nazwa, a gdy nazwa prowadzi gdzie indziej – identyfikator
    const zapis = (c: Cel) => (rozwiaz(c.nazwa) === c || (rozwiaz(c.nazwa) && kluczCelu(rozwiaz(c.nazwa)!) === kluczCelu(c)) ? c.nazwa : c.id)
    const wlasny = kluczCelu(t.zrodlo)
    // kandydaci ze wszystkich pozycji; przy nakładaniu wygrywa dłuższa nazwa („Wola Przykładowa” przed „Wola”)
    const kandydaci: { cel: Cel; start: number; koniec: number }[] = []
    for (const { cel, wzorzec } of wzorce) {
        const k = kluczCelu(cel)
        if (k === wlasny || polaczone.has(k) || t.zwiazane.has(k)) continue
        for (const tr of znajdzWzmianki(maska, wzorzec)) kandydaci.push({ cel, ...tr })
    }
    const przyjete: typeof kandydaci = []
    for (const c of kandydaci.sort((a, b) => (b.koniec - b.start) - (a.koniec - a.start) || a.start - b.start)) {
        if (!przyjete.some((z) => c.start < z.koniec && c.koniec > z.start)) przyjete.push(c)
    }
    const byly = new Set<string>()
    const wyn: Wzmianka[] = []
    for (const { cel, start: s0, koniec: k0 } of przyjete.sort((a, b) => a.start - b.start)) {
        const k = kluczCelu(cel)
        const slowo = tresc.slice(s0, k0)
        const cz = zapis(cel)
        const nowy = slowo === cz ? `[[${cz}]]` : `[[${cz}|${slowo}]]`
        const start = naglowek.length + s0
        wyn.push({
            klucz: `${t.plik}:${start}:${k}`, plik: t.plik, zrodlo: { rodzaj: t.zrodlo.rodzaj, id: t.zrodlo.id, nazwa: t.zrodlo.nazwa },
            cel: { rodzaj: cel.rodzaj, id: cel.id, nazwa: cel.nazwa }, start, koniec: naglowek.length + k0, slowo, nowy,
            ...kontekst(tresc, s0, k0), pierwsza: !byly.has(k),
        })
        byly.add(k)
    }
    return wyn
}

/**
 * Wstawia wybrane odnośniki w zawartość pliku (od końca – wcześniejsze pozycje się nie przesuwają).
 * Każde miejsce musi nadal zawierać to samo słowo – inaczej błąd (plik zmienił się od podglądu).
 */
export function polaczWTekscie(zawartosc: string, wybrane: Pick<Wzmianka, 'start' | 'koniec' | 'slowo' | 'nowy'>[]): string {
    let t = zawartosc
    const zrobione: { start: number; koniec: number }[] = []
    for (const w of [...wybrane].sort((a, b) => b.start - a.start)) {
        if (zrobione.some((z) => w.start < z.koniec && w.koniec > z.start)) continue
        if (t.slice(w.start, w.koniec) !== w.slowo) throw new Error('Tekst zmienił się od podglądu – odśwież listę.')
        t = t.slice(0, w.start) + w.nowy + t.slice(w.koniec)
        zrobione.push(w)
    }
    return t
}

// Wzmianki bez odnośnika – podpowiedzi, gdzie wstawić [[…]] (odpowiednik „unlinked references” z Logseq).
//
//   npm run wzmianki                # tylko pokazuje (nic nie zmienia)
//   npm run wzmianki -- --polacz    # w każdym tekście zamienia PIERWSZĄ wzmiankę danej pozycji na [[…]]
//
// Pomija teksty już powiązane z pozycją (odnośnikiem albo polem w panelu: miejsca, tematy, należy do),
// a w treści: istniejące [[…]], linki, obrazki, kod, komponenty {% … %}, tabele i nagłówki.

import fs from 'node:fs'
import path from 'node:path'
import { daneSieci } from '../lib/archiwum'
import { odmiana } from '../lib/tekst'
import { ODNOSNIK, slownikOdnosnikow, wzorzecWzmianek, znajdzWzmianki, type Cel } from '../lib/odnosniki'

const POLACZ = process.argv.includes('--polacz')
const KORZEN = process.cwd()

/** Zastępuje spacjami fragmenty, w których nie wolno wstawiać odnośników (zachowuje długość tekstu). */
function zamaskuj(tresc: string): string {
    const spacje = (m: string) => m.replace(/[^\n]/g, ' ')
    return tresc
        .replace(/```[\s\S]*?```/g, spacje)
        .replace(/\{%[\s\S]*?%\}/g, spacje)
        .replace(/`[^`\n]*`/g, spacje)
        .replace(/!?\[[^\]\n]*\]\([^)\n]*\)/g, spacje)
        .replace(/<[^>\n]+>/g, spacje)
        .replace(/^[ \t]*(\||#).*$/gm, spacje)
}

function fragment(tekst: string, start: number, koniec: number): string {
    const a = Math.max(0, start - 50)
    const b = Math.min(tekst.length, koniec + 50)
    return ((a > 0 ? '…' : '') + tekst.slice(a, start) + '»' + tekst.slice(start, koniec) + '«' + tekst.slice(koniec, b) + (b < tekst.length ? '…' : '')).replace(/\s+/g, ' ')
}

async function main() {
    const { pozycje, teksty } = await daneSieci('ja')
    const rozwiaz = slownikOdnosnikow(pozycje)
    const klucz = (c: Cel) => `${c.rodzaj}:${c.id}`
    // jak zapisać cel w odnośniku: nazwa, a gdy nazwa prowadzi gdzie indziej – identyfikator
    const zapis = (c: Cel) => (rozwiaz(c.nazwa) === c ? c.nazwa : c.id)
    const wzorce = pozycje.filter((p) => p.cel.rodzaj !== 'wpis').map((p) => ({ cel: p.cel, wzorzec: wzorzecWzmianek(p.nazwy, p.cel.rodzaj === 'temat') }))

    let ileWzmianek = 0
    let ilePolaczonych = 0
    const bezUprawnien: string[] = []
    for (const t of teksty) {
        const sciezka = path.join(KORZEN, t.plik)
        if (!fs.existsSync(sciezka)) continue
        const plik = fs.readFileSync(sciezka, 'utf8')
        const m = plik.match(/^(---\n[\s\S]*?\n?---\n?)([\s\S]*)$/)
        const naglowek = m ? m[1] : ''
        let tresc = m ? m[2] : plik
        // panel może zapisać nawiasy z ukośnikiem (\[\[…\]\]) – do wyszukiwania „\[\[” → „  [[” (ta sama długość)
        const doSzukania = tresc.replace(/\\\[\\\[/g, '  [[').replace(/\\\]\\\]/g, ']]  ').replace(/\\\|/g, ' |')
        const maska = zamaskuj(doSzukania)
        const polaczone = new Set<string>()
        for (const o of doSzukania.matchAll(ODNOSNIK)) {
            const c = rozwiaz(o[1])
            if (c) polaczone.add(klucz(c))
        }
        const wiersze: string[] = []
        // od końca tekstu – wstawienie odnośnika nie przesuwa wcześniejszych pozycji
        const zmiany: { start: number; koniec: number; nowy: string }[] = []
        for (const { cel, wzorzec } of wzorce) {
            const k = klucz(cel)
            if (k === klucz(t.zrodlo) || polaczone.has(k) || t.zwiazane.has(k)) continue
            const trafienia = znajdzWzmianki(maska, wzorzec)
            if (!trafienia.length) continue
            ileWzmianek += trafienia.length
            const p = trafienia[0]
            const slowo = tresc.slice(p.start, p.koniec)
            const cel_ = zapis(cel)
            const nowy = slowo === cel_ ? `[[${cel_}]]` : `[[${cel_}|${slowo}]]`
            wiersze.push(`  ${cel.rodzaj} „${cel.nazwa}”: ${trafienia.length}× – ${fragment(tresc, p.start, p.koniec)}\n      → ${nowy}`)
            zmiany.push({ start: p.start, koniec: p.koniec, nowy })
        }
        if (!wiersze.length) continue
        console.log(`\n${t.plik} (${t.zrodlo.rodzaj} „${t.zrodlo.nazwa}”)`)
        wiersze.forEach((w) => console.log(w))
        if (!POLACZ) continue
        const wstawione: { start: number; koniec: number }[] = []
        for (const z of zmiany.sort((a, b) => b.start - a.start)) {
            // dwie pozycje mogą trafić w to samo słowo – druga zmiana w tym miejscu jest pomijana
            if (wstawione.some((w) => z.start < w.koniec && z.koniec > w.start)) continue
            tresc = tresc.slice(0, z.start) + z.nowy + tresc.slice(z.koniec)
            wstawione.push(z)
            ilePolaczonych++
        }
        try {
            fs.writeFileSync(sciezka, naglowek + tresc, 'utf8')
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'EACCES') throw e
            bezUprawnien.push(t.plik)
        }
    }

    if (bezUprawnien.length) console.log(`\n! Brak uprawnień do zapisu: ${bezUprawnien.join(', ')} – sudo chmod -R g+w content i jeszcze raz`)
    if (!ileWzmianek) console.log('Brak wzmianek bez odnośnika.')
    else if (POLACZ) console.log(`\nGotowe – wstawiono ${odmiana(ilePolaczonych, ['odnośnik', 'odnośniki', 'odnośników'])} (pierwsza wzmianka w każdym tekście). Sprawdź w panelu.`)
    else console.log(`\nZnaleziono ${odmiana(ileWzmianek, ['wzmiankę', 'wzmianki', 'wzmianek'])}. Żeby wstawić odnośniki przy pierwszej wzmiance w każdym tekście: npm run wzmianki -- --polacz`)
}

void main()

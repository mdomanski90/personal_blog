// Eksport treści do plików CSV dla modułu CSV Import w Omeka S i sprawdzenie spójności danych.
// Uruchamiany przy każdym buildzie (npm run build). Błąd w danych zatrzymuje build z czytelnym komunikatem.
//
//   npm run eksport:omeka            → eksport/omeka/*.csv
//
// Kolumny = nazwy właściwości Omeka (dcterms:…); wiele wartości rozdzielone „|”;
// powiązania przez dcterms:identifier (w CSV Import: „Identifier” jako sposób dopasowania zasobów).
// Kolejność importu: miejsca → obiekty → tematy → wpisy (później: osoby, obiekty, materiały).

import fs from 'node:fs'
import path from 'node:path'
import { dlaEksportu, OBSZARY, RODZAJE_MIEJSC, RODZAJE_OBIEKTOW, RODZAJE_OPOWIESCI, RODZAJE_TEMATOW, WYZNANIA_MIEJSC, type Widocznosc } from '../lib/archiwum'
import { czyPoprawnaEdtf, zakresIso } from '../lib/edtf'
import { naTekst } from '../lib/markdoc'
import { odmiana } from '../lib/tekst'

const KATALOG = path.join(process.cwd(), 'eksport', 'omeka')
const bledy: string[] = []
const ostrzezenia: string[] = []

function pole(v: unknown): string {
    const s = Array.isArray(v)
        ? v.filter((x) => x !== null && x !== undefined && x !== '').map((x) => String(x).replace(/\|/g, '/')).join('|')
        : v === null || v === undefined ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function zapiszCsv(nazwa: string, kolumny: string[], wiersze: Record<string, unknown>[]) {
    const linie = [kolumny.join(','), ...wiersze.map((w) => kolumny.map((k) => pole(w[k])).join(','))]
    fs.writeFileSync(path.join(KATALOG, nazwa), linie.join('\n') + '\n', 'utf8')
}

const publiczne = (w: Widocznosc) => (w === 'publiczne' ? '1' : '0')

async function main() {
    const miejsca = await dlaEksportu.miejsca()
    const obiekty = await dlaEksportu.obiekty()
    const tematy = await dlaEksportu.tematy()
    const opowiesci = await dlaEksportu.opowiesci()

    const idMiejsc = new Set(miejsca.map((m) => m.id))
    const idTematow = new Set(tematy.map((t) => t.id))

    // --- sprawdzanie spójności ---
    for (const m of miejsca) {
        if (m.nalezyDo && !idMiejsc.has(m.nalezyDo)) bledy.push(`miejsce „${m.id}”: „należy do” wskazuje nieistniejące miejsce „${m.nalezyDo}”`)
        if (m.nalezyDo === m.id) bledy.push(`miejsce „${m.id}”: nie może należeć samo do siebie`)
    }
    for (const o of obiekty) {
        if (o.miejsce && !idMiejsc.has(o.miejsce)) bledy.push(`obiekt „${o.id}”: nieistniejąca miejscowość „${o.miejsce}”`)
        if (!czyPoprawnaEdtf(o.czas)) bledy.push(`obiekt „${o.id}”: niepoprawne lata „${o.czas}”`)
    }
    for (const t of tematy) {
        if (!czyPoprawnaEdtf(t.czas)) bledy.push(`temat „${t.id}”: niepoprawna data „${t.czas}”`)
        for (const id of t.miejsca) if (!idMiejsc.has(id)) bledy.push(`temat „${t.id}”: nieistniejące miejsce „${id}”`)
    }
    for (const o of opowiesci) {
        for (const id of o.miejsca) if (!idMiejsc.has(id)) bledy.push(`wpis „${o.id}”: nieistniejące miejsce „${id}”`)
        for (const id of o.tematy) if (!idTematow.has(id)) bledy.push(`wpis „${o.id}”: nieistniejący temat „${id}”`)
    }
    const bezWspolrzednych = miejsca.filter((m) => !m.wspolrzedne && !OBSZARY.includes(m.rodzaj)).map((m) => m.nazwa)
    if (bezWspolrzednych.length) ostrzezenia.push(`miejsca bez współrzędnych (nie ma ich na mapie): ${bezWspolrzednych.join(', ')}`)

    if (bledy.length) {
        console.error('\n✗ Błędy w danych – popraw je w panelu (/keystatic):\n')
        for (const b of bledy) console.error('  - ' + b)
        console.error('')
        process.exit(1)
    }

    // --- eksport ---
    fs.mkdirSync(KATALOG, { recursive: true })

    zapiszCsv(
        'miejsca.csv',
        ['dcterms:identifier', 'o:resource_class', 'dcterms:title', 'dcterms:alternative', 'dcterms:type', 'mapping:latitude', 'mapping:longitude', 'mapping:approximate', 'dcterms:isPartOf', 'dcterms:subject', 'owl:sameAs', 'dcterms:description', 'dcterms:dateSubmitted', 'o:is_public'],
        miejsca.map((m) => ({
            'dcterms:identifier': m.id,
            'o:resource_class': 'dcterms:Location',
            'dcterms:title': m.nazwa,
            'dcterms:alternative': m.inneNazwy,
            'dcterms:type': RODZAJE_MIEJSC[m.rodzaj] ?? m.rodzaj,
            'mapping:latitude': m.wspolrzedne?.[0],
            'mapping:longitude': m.wspolrzedne?.[1],
            'mapping:approximate': m.przyblizone ? '1' : '',
            'dcterms:isPartOf': m.nalezyDo,
            'dcterms:subject': m.wyznanie ? `wyznanie przed 1875: ${WYZNANIA_MIEJSC[m.wyznanie] ?? m.wyznanie}` : '',
            'owl:sameAs': m.sameAs,
            'dcterms:description': naTekst(m.opis),
            'dcterms:dateSubmitted': m.dodano,
            'o:is_public': publiczne(m.widocznosc),
        })),
    )

    zapiszCsv(
        'obiekty.csv',
        ['dcterms:identifier', 'o:resource_class', 'dcterms:title', 'dcterms:alternative', 'dcterms:type', 'dcterms:spatial', 'dcterms:temporal', 'numeric:interval', 'mapping:latitude', 'mapping:longitude', 'mapping:approximate', 'dcterms:description', 'dcterms:dateSubmitted', 'o:is_public'],
        obiekty.map((o) => ({
            'dcterms:identifier': o.id,
            'o:resource_class': 'dctype:PhysicalObject',
            'dcterms:title': o.nazwa,
            'dcterms:alternative': o.inneNazwy,
            'dcterms:type': (RODZAJE_OBIEKTOW[o.rodzaj] ?? o.rodzaj) + (o.istnieje ? '' : ' (nie istnieje)'),
            'dcterms:spatial': o.miejsce,
            'dcterms:temporal': o.czas,
            'numeric:interval': zakresIso(o.czas),
            'mapping:latitude': o.wspolrzedne?.[0],
            'mapping:longitude': o.wspolrzedne?.[1],
            'mapping:approximate': o.przyblizone ? '1' : '',
            'dcterms:description': naTekst(o.opis),
            'dcterms:dateSubmitted': o.dodano,
            'o:is_public': publiczne(o.widocznosc),
        })),
    )

    zapiszCsv(
        'tematy.csv',
        ['dcterms:identifier', 'o:resource_class', 'dcterms:title', 'dcterms:alternative', 'dcterms:type', 'dcterms:temporal', 'numeric:interval', 'dcterms:spatial', 'dcterms:description', 'dcterms:dateSubmitted', 'o:is_public'],
        tematy.map((t) => {
            const z = zakresIso(t.czas)
            return {
                'dcterms:identifier': t.id,
                'o:resource_class': t.rodzaj === 'wydarzenie' ? 'dcterms:PeriodOfTime' : 'skos:Concept',
                'dcterms:title': t.nazwa,
                'dcterms:alternative': t.inneNazwy,
                'dcterms:type': RODZAJE_TEMATOW[t.rodzaj] ?? t.rodzaj,
                'dcterms:temporal': t.czas,
                'numeric:interval': z ? `${z.od ?? ''}/${z.do ?? ''}` : '',
                'dcterms:spatial': t.miejsca,
                'dcterms:description': naTekst(t.opis),
                'dcterms:dateSubmitted': t.dodano,
                'o:is_public': publiczne(t.widocznosc),
            }
        }),
    )

    zapiszCsv(
        'wpisy.csv',
        ['dcterms:identifier', 'o:resource_class', 'dcterms:title', 'dcterms:date', 'dcterms:type', 'dcterms:spatial', 'dcterms:subject', 'bibo:content', 'o:is_public'],
        opowiesci.map((o) => ({
            'dcterms:identifier': o.id,
            'o:resource_class': 'bibo:Article',
            'dcterms:title': o.tytul,
            'dcterms:date': o.data,
            'dcterms:type': RODZAJE_OPOWIESCI[o.rodzaj] ?? o.rodzaj,
            'dcterms:spatial': o.miejsca,
            'dcterms:subject': o.tematy,
            'bibo:content': naTekst(o.tresc),
            'o:is_public': publiczne(o.widocznosc),
        })),
    )

    for (const o of ostrzezenia) console.warn('! ' + o)
    console.log(`✓ Eksport dla Omeka S: ${odmiana(miejsca.length, ['miejsce', 'miejsca', 'miejsc'])}, ${odmiana(obiekty.length, ['obiekt', 'obiekty', 'obiektów'])}, ${odmiana(tematy.length, ['temat', 'tematy', 'tematów'])}, ${odmiana(opowiesci.length, ['wpis', 'wpisy', 'wpisów'])} → eksport/omeka/`)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})

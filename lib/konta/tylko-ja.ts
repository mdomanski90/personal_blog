// P7c (KON-08, decyzja właściciela 20.11.2026): pozycje „tylko ja” widzi w panelu wyłącznie konto z rolą administratora
// (lib/konta/straz.ts widziTylkoJa – ta sama reguła co przy zapisie). Ten moduł mówi, KTÓRE pliki są „tylko ja”:
//  • kolekcje Keystatic z polem `visibility` (nagłówek .mdoc albo .yaml): `visibility: ja`,
//  • plany (`content/plany/<slug>.json`) i osoby (`content/osoby/<id>.json`): `widocznosc: "ja"`.
// Do pliku pozycji należą też jej pliki: katalog `content/<kolekcja>/<slug>/`, zdjęcia `pliki-archiwum/<kolekcja>/<slug>/`,
// `public/images/<kolekcja>/<slug>/`, strony skanów materiału `pliki-archiwum/strony/<slug>/`, pliki planu `pliki-archiwum/plany/<slug>/`.
// Czysta część (bez fs) ma test; skan katalogów – `ukrytePozycje()` (pamięć na 2 s – jedno żądanie panelu pyta wiele razy).
import fs from 'node:fs'
import path from 'node:path'
import * as yaml from 'js-yaml'

/** Kolekcje Keystatic z polem widoczności (keystatic.config.ts). */
export const KOLEKCJE_Z_WIDOCZNOSCIA = ['posts', 'miejsca', 'tematy', 'obiekty', 'materialy', 'zbiory', 'publikacje', 'hasla', 'ksiegi'] as const

export interface UkrytePozycje {
    /** klucze „kolekcja/slug” (także „plany/<slug>”, „osoby/<id>”) */
    klucze: Set<string>
    /** początki ścieżek (względem katalogu projektu, „/”) – plik pozycji i jej katalogi */
    sciezki: string[]
}
export const BRAK_UKRYTYCH: UkrytePozycje = { klucze: new Set(), sciezki: [] }

/** Widoczność zapisana w pliku treści (null – brak pola albo plik nieczytelny). */
export function widocznoscPliku(nazwa: string, tekst: string): string | null {
    try {
        let dane: unknown
        if (nazwa.endsWith('.json')) dane = JSON.parse(tekst)
        else if (/\.(mdoc|md)$/.test(nazwa)) {
            const t = tekst.replace(/^﻿/, '')
            if (!t.startsWith('---')) return null
            const k = t.indexOf('\n---', 3)
            dane = yaml.load(t.slice(t.indexOf('\n') + 1, k < 0 ? undefined : k + 1))
        } else if (/\.ya?ml$/.test(nazwa)) dane = yaml.load(tekst)
        else return null
        if (!dane || typeof dane !== 'object' || Array.isArray(dane)) return null
        const o = dane as Record<string, unknown>
        const w = o.visibility ?? o.widocznosc
        return typeof w === 'string' ? w : null
    } catch { return null }
}

/** Ścieżki należące do pozycji (plik i katalogi z jej plikami). */
export function sciezkiPozycji(kolekcja: string, slug: string, plik: string): string[] {
    const L = [`content/${kolekcja}/${plik}`, `content/${kolekcja}/${slug}/`, `pliki-archiwum/${kolekcja}/${slug}/`, `public/images/${kolekcja}/${slug}/`]
    if (kolekcja === 'materialy') L.push(`pliki-archiwum/strony/${slug}/`)
    return L
}

export function zbudujUkryte(pozycje: { kolekcja: string; slug: string; plik: string }[]): UkrytePozycje {
    return { klucze: new Set(pozycje.map((p) => `${p.kolekcja}/${p.slug}`)), sciezki: pozycje.flatMap((p) => sciezkiPozycji(p.kolekcja, p.slug, p.plik)) }
}

/** Czy ścieżka (względem katalogu projektu; „content/…” albo bez „content/”) należy do pozycji „tylko ja”. */
export function ukrytaSciezka(sciezka: string, u: UkrytePozycje): boolean {
    if (!u.sciezki.length) return false
    const s = sciezka.replace(/^\/+/, '')
    const pelna = /^(content|pliki-archiwum|public)\//.test(s) ? s : `content/${s}`
    return u.sciezki.some((p) => (p.endsWith('/') ? pelna.startsWith(p) || `${pelna}/` === p : pelna === p))
}
export const ukrytyKlucz = (kolekcja: string, slug: string, u: UkrytePozycje) => u.klucze.has(`${kolekcja}/${slug}`)

/** Adres w panelu (edycja Keystatic, plan, osoba – także z ?…) → czy prowadzi do pozycji „tylko ja”. */
export function ukrytyAdresPanelu(href: string | null | undefined, u: UkrytePozycje): boolean {
    if (!href || !u.klucze.size) return false
    const m = /^\/keystatic\/(?:collection\/([\w-]+)\/item\/([\w-]+)|(plany|osoby)\/([\w-]+))/.exec(href)
    return !!m && (m[1] ? ukrytyKlucz(m[1], m[2], u) : ukrytyKlucz(m[3], m[4], u))
}

// ---------- skan (serwer) ----------
let pamiec: { korzen: string; czas: number; u: UkrytePozycje } | null = null

/** Wszystkie pozycje „tylko ja” w treści. */
export async function ukrytePozycje(korzen = process.cwd()): Promise<UkrytePozycje> {
    if (pamiec && pamiec.korzen === korzen && Date.now() - pamiec.czas < 2000) return pamiec.u
    const poz: { kolekcja: string; slug: string; plik: string }[] = []
    const skanuj = async (kolekcja: string, rozszerzenia: RegExp) => {
        const kat = path.join(/*turbopackIgnore: true*/ korzen, 'content', kolekcja)
        let pliki: string[] = []
        try { pliki = await fs.promises.readdir(kat) } catch { return }
        await Promise.all(pliki.filter((p) => rozszerzenia.test(p) && !p.startsWith('_') && !p.startsWith('.')).map(async (p) => {
            try {
                if (widocznoscPliku(p, await fs.promises.readFile(path.join(kat, p), 'utf8')) === 'ja') poz.push({ kolekcja, slug: p.replace(rozszerzenia, ''), plik: p })
            } catch { /* zniknął */ }
        }))
    }
    await Promise.all([
        ...KOLEKCJE_Z_WIDOCZNOSCIA.map((k) => skanuj(k, /\.(mdoc|md|yaml|yml)$/)),
        skanuj('plany', /\.json$/), skanuj('osoby', /\.json$/),
    ])
    const u = zbudujUkryte(poz.sort((a, b) => `${a.kolekcja}/${a.slug}`.localeCompare(`${b.kolekcja}/${b.slug}`)))
    pamiec = { korzen, czas: Date.now(), u }
    return u
}
/** Po zapisie zmieniającym widoczność – następne pytanie liczy od nowa. */
export const zapomnijUkryte = () => { pamiec = null }

/** Pozycje ukryte dla tego żądania: puste, gdy konto widzi „tylko ja”. */
export async function ukryteDla(widzi: boolean, korzen = process.cwd()): Promise<UkrytePozycje> {
    return widzi ? BRAK_UKRYTYCH : ukrytePozycje(korzen)
}

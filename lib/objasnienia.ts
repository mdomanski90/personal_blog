// Objaśnienia na skanach materiałów: odczyt, tłumaczenie, objaśnienie, pieczęć – prostokąt na stronie skanu + tekst.
// Zapis: content/objasnienia/<materiał>.json w formacie W3C Web Annotation (AnnotationPage), obok listy stron
// (content/strony/<materiał>.json). Panel (/keystatic/panel/materialy/<id>/objasnienia) rysuje je Annotoriousem;
// strona publiczna pokazuje je własną lekką warstwą w przeglądarce dokumentu.
//
// Współrzędne prostokąta zapisujemy w procentach szerokości i wysokości strony (xywh=percent:…), więc pasują
// do oryginału i do każdej pomniejszonej kopii.

import fs from 'node:fs'
import path from 'node:path'
import { ID_MATERIALU, NAZWA_STRONY } from './strony-materialow'

import { JEZYKI, RODZAJE_OBJASNIEN, type RodzajObjasnienia, type WidocznoscObjasnienia } from './objasnienia-widok'
export { JEZYKI, RODZAJE_OBJASNIEN, type RodzajObjasnienia, type WidocznoscObjasnienia }

const RODZAJ_Z_CELU = Object.fromEntries(Object.entries(RODZAJE_OBJASNIEN).map(([k, v]) => [v.cel, k])) as Record<string, RodzajObjasnienia>

export interface Objasnienie {
    id: string
    /** plik strony (s-….jpg) */
    strona: string
    /** prostokąt w procentach strony (0–100) */
    x: number
    y: number
    w: number
    h: number
    rodzaj: RodzajObjasnienia
    tekst: string
    /** język tekstu – kod z JEZYKI (np. la, ru; przy tłumaczeniu pl) */
    jezyk?: string
    /** identyfikatory osób, miejsc, tematów, obiektów (jak w [[…]]) */
    powiazania: string[]
    /** kto odczytał / przetłumaczył / objaśnił */
    opracowal: string
    /** weryfikacja w źródłach: skąd wiadomo, co potwierdza, co niepewne */
    weryfikacja?: string
    widocznosc: WidocznoscObjasnienia
    utworzono?: string
    zmieniono?: string
}

export const ID_OBJASNIENIA = /^o-[a-z0-9]{4,24}$/
const KONTEKST = 'http://www.w3.org/ns/anno.jsonld'
const MEDIA = 'http://www.w3.org/TR/media-frags/'
const WIDOCZNOSC = 'odniepamieci:widocznosc'

const liczba = (v: unknown, min = 0, max = 100) => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 1000) / 1000)) : min
}
const tekst = (v: unknown, maks: number) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim().slice(0, maks) : '')

/** Sprawdza i porządkuje objaśnienie z panelu albo z pliku (null, gdy się nie nadaje). */
export function poprawObjasnienie(o: Partial<Objasnienie> | null | undefined): Objasnienie | null {
    if (!o || typeof o !== 'object') return null
    if (typeof o.id !== 'string' || !ID_OBJASNIENIA.test(o.id)) return null
    if (typeof o.strona !== 'string' || !NAZWA_STRONY.test(o.strona)) return null
    const x = liczba(o.x), y = liczba(o.y)
    const w = liczba(o.w, 0, 100 - x), h = liczba(o.h, 0, 100 - y)
    if (w <= 0 || h <= 0) return null
    const rodzaj = (o.rodzaj && o.rodzaj in RODZAJE_OBJASNIEN ? o.rodzaj : 'objasnienie') as RodzajObjasnienia
    const widocznosc: WidocznoscObjasnienia = o.widocznosc === 'bliscy' || o.widocznosc === 'ja' ? o.widocznosc : 'publiczne'
    const jezyk = typeof o.jezyk === 'string' && /^[a-z]{2,3}$/.test(o.jezyk) ? o.jezyk : ''
    const weryfikacja = tekst(o.weryfikacja, 4000)
    const powiazania = [...new Set((Array.isArray(o.powiazania) ? o.powiazania : []).map((p) => tekst(p, 120)).filter((p) => /^[\p{L}\p{N}][\p{L}\p{N} .,'’-]*$/u.test(p)))].slice(0, 30)
    return {
        id: o.id, strona: o.strona, x, y, w, h, rodzaj,
        tekst: tekst(o.tekst, 8000),
        ...(jezyk ? { jezyk } : {}),
        powiazania,
        opracowal: tekst(o.opracowal, 200),
        ...(weryfikacja ? { weryfikacja } : {}),
        widocznosc,
        ...(typeof o.utworzono === 'string' ? { utworzono: o.utworzono.slice(0, 40) } : {}),
        ...(typeof o.zmieniono === 'string' ? { zmieniono: o.zmieniono.slice(0, 40) } : {}),
    }
}

/** Kolejność czytania: strona (wg listy stron), potem z góry na dół, w jednym wierszu od lewej. */
export function wKolejnosci<T extends Pick<Objasnienie, 'strona' | 'x' | 'y' | 'h'>>(lista: T[], strony: string[]): T[] {
    const nr = new Map(strony.map((s, i) => [s, i]))
    return [...lista].sort((a, b) => (nr.get(a.strona) ?? 1e9) - (nr.get(b.strona) ?? 1e9) || (Math.abs(a.y - b.y) < Math.min(a.h, b.h) / 2 ? a.x - b.x : a.y - b.y))
}

// ---------- W3C Web Annotation ----------

export interface W3CAdnotacja {
    id: string
    type: 'Annotation'
    motivation: string
    body: Record<string, unknown>[]
    target: { source: string; selector: { type: 'FragmentSelector'; conformsTo: string; value: string } }
    creator?: { type: 'Person'; name: string }
    created?: string
    modified?: string
    [WIDOCZNOSC]?: WidocznoscObjasnienia
}

export interface OpcjeW3C {
    /** adres pliku strony (domyślnie sama nazwa pliku) */
    zrodlo?: (strona: string) => string
    /** adres powiązania (domyślnie sam identyfikator); null – pominąć */
    powiazanie?: (id: string) => string | null
    /** identyfikator adnotacji (domyślnie „#o-…”) */
    idAdnotacji?: (id: string) => string
    /** zapis widoczności (tylko w pliku na serwerze, nie w eksporcie) */
    zWidocznoscia?: boolean
}

export function naW3C(o: Objasnienie, op: OpcjeW3C = {}): W3CAdnotacja {
    const r = RODZAJE_OBJASNIEN[o.rodzaj]
    const body: Record<string, unknown>[] = [{ type: 'TextualBody', purpose: r.cel, value: o.tekst, format: 'text/plain', ...(o.jezyk ? { language: o.jezyk } : {}) }]
    if (o.weryfikacja) body.push({ type: 'TextualBody', purpose: 'assessing', value: o.weryfikacja, format: 'text/plain' })
    for (const p of o.powiazania) {
        const src = op.powiazanie ? op.powiazanie(p) : p
        if (src) body.push({ type: 'SpecificResource', purpose: 'linking', source: src })
    }
    const f = (n: number) => String(Math.round(n * 1000) / 1000)
    return {
        id: op.idAdnotacji ? op.idAdnotacji(o.id) : `#${o.id}`,
        type: 'Annotation',
        motivation: r.cel,
        body,
        target: { source: op.zrodlo ? op.zrodlo(o.strona) : o.strona, selector: { type: 'FragmentSelector', conformsTo: MEDIA, value: `xywh=percent:${f(o.x)},${f(o.y)},${f(o.w)},${f(o.h)}` } },
        ...(o.opracowal ? { creator: { type: 'Person' as const, name: o.opracowal } } : {}),
        ...(o.utworzono ? { created: o.utworzono } : {}),
        ...(o.zmieniono ? { modified: o.zmieniono } : {}),
        ...(op.zWidocznoscia ? { [WIDOCZNOSC]: o.widocznosc } : {}),
    }
}

export function zW3C(a: Partial<W3CAdnotacja> | null | undefined): Objasnienie | null {
    if (!a || typeof a !== 'object') return null
    const id = String(a.id ?? '').replace(/^.*#/, '')
    const sel = a.target?.selector?.value ?? ''
    const m = /^xywh=percent:([\d.]+),([\d.]+),([\d.]+),([\d.]+)$/.exec(sel)
    if (!m) return null
    const ciala = Array.isArray(a.body) ? a.body : []
    const glowne = ciala.find((b) => b.type === 'TextualBody' && b.purpose !== 'assessing')
    const ocena = ciala.find((b) => b.type === 'TextualBody' && b.purpose === 'assessing')
    return poprawObjasnienie({
        id,
        strona: String(a.target?.source ?? '').split('/').pop(),
        x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]),
        rodzaj: RODZAJ_Z_CELU[String(glowne?.purpose ?? a.motivation)] ?? 'objasnienie',
        tekst: String(glowne?.value ?? ''),
        jezyk: typeof glowne?.language === 'string' ? glowne.language : undefined,
        powiazania: ciala.filter((b) => b.purpose === 'linking' && typeof b.source === 'string').map((b) => String(b.source)),
        opracowal: a.creator?.name ?? '',
        weryfikacja: typeof ocena?.value === 'string' ? ocena.value : undefined,
        widocznosc: a[WIDOCZNOSC],
        utworzono: a.created,
        zmieniono: a.modified,
    })
}

/** Strona adnotacji (AnnotationPage) – plik na serwerze albo eksport publiczny. */
export function stronaW3C(lista: Objasnienie[], op: OpcjeW3C & { id?: string } = {}) {
    return { '@context': KONTEKST, ...(op.id ? { id: op.id } : {}), type: 'AnnotationPage', items: lista.map((o) => naW3C(o, op)) }
}

// ---------- pliki ----------

const KAT = () => path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', 'objasnienia')
const plik = (id: string) => path.join(/*turbopackIgnore: true*/ KAT(), `${id}.json`)

export function objasnieniaMaterialu(id: string): Objasnienie[] {
    if (!ID_MATERIALU.test(id)) return []
    try {
        const d = JSON.parse(fs.readFileSync(plik(id), 'utf8')) as { items?: W3CAdnotacja[] }
        return (d.items ?? []).map(zW3C).filter((o): o is Objasnienie => o !== null)
    } catch {
        return []
    }
}

export async function zapiszObjasnienia(id: string, lista: Objasnienie[]): Promise<void> {
    await fs.promises.mkdir(KAT(), { recursive: true })
    if (!lista.length) { await fs.promises.rm(plik(id), { force: true }); return }
    const tmp = `${plik(id)}.${process.pid}.tmp`
    await fs.promises.writeFile(tmp, JSON.stringify(stronaW3C(lista, { zWidocznoscia: true }), null, 2) + '\n')
    await fs.promises.rename(tmp, plik(id))
}

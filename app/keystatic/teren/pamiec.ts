// P7b-2 (TER-06): pamięć telefonu dla pracy w terenie – plany pobrane do pracy bez internetu, kolejka czynności i nowych miejsc,
// wysyłka po wznowieniu połączenia. Logika decyzji (kolejność, ocena odpowiedzi, wygasanie) – lib/teren/kolejka.ts (testy).
// IndexedDB „odniepamieci-teren”: plany (plan dla konta, ustawienia, pliki), kolejka, zdjecia (Bloby pozycji), inne (start, miejscowości).
// Dane przypisane do konta: inne konto na tym telefonie ich nie dostaje; wylogowanie (gdy nic nie czeka) i „usuń z telefonu” czyszczą.
import * as React from 'react'
import type { Plan } from '@/lib/plany/model'
import type { UstawieniaPlanow } from '@/lib/plany/typy'
import type { PunktMiejscowosci } from '@/lib/teren/miejsca'
import { doWyslania, ocenOdpowiedz, wygaslo, wymiaryPoZmniejszeniu, type PozycjaKolejki } from '@/lib/teren/kolejka'
import type { WpisDziennika } from '@/lib/teren/czynnosci'

export type DanePlanu = { plan: Plan; ustawienia: UstawieniaPlanow; sprawdzony: boolean; konto: string; imie: string; pliki?: { adres: string; bajty: number }[] }
export interface PlanWTelefonie { klucz: string; konto: string; slug: string; tytul: string; dane: DanePlanu; pobrano: string; otwarto: string; bajty: number; pliki: string[] }

const BAZA = 'odniepamieci-teren', PLIKI = 'teren-pliki'

// ---------- IndexedDB ----------
let baza: Promise<IDBDatabase> | null = null
/** po „wyczyść telefon” baza nie jest otwierana ponownie (inaczej odświeżenie widoku założyłoby ją od nowa) – aż do przeładowania strony */
let wyczyszczony = false
function otworz(): Promise<IDBDatabase> {
    if (wyczyszczony) return Promise.reject(new Error('dane usunięte z telefonu'))
    if (baza) return baza
    baza = new Promise((ok, zle) => {
        const r = indexedDB.open(BAZA, 1)
        r.onupgradeneeded = () => {
            const d = r.result
            d.createObjectStore('plany', { keyPath: 'klucz' })
            d.createObjectStore('kolejka', { keyPath: 'id' })
            d.createObjectStore('zdjecia', { keyPath: 'id' })
            d.createObjectStore('inne', { keyPath: 'klucz' })
        }
        r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); baza = null }; ok(r.result) }
        r.onerror = () => { baza = null; zle(r.error) }
    })
    return baza
}
async function magazyn<T>(nazwa: string, tryb: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
    const d = await otworz()
    return new Promise((ok, zle) => {
        const t = d.transaction(nazwa, tryb), r = f(t.objectStore(nazwa))
        t.oncomplete = () => ok((r ? r.result : undefined) as T)
        t.onerror = () => zle(t.error)
        t.onabort = () => zle(t.error)
    })
}
const wszystkie = <T,>(n: string) => magazyn<T[]>(n, 'readonly', (s) => s.getAll())
const jeden = <T,>(n: string, k: string) => magazyn<T | undefined>(n, 'readonly', (s) => s.get(k))
const zapisz = (n: string, v: unknown) => magazyn<void>(n, 'readwrite', (s) => { s.put(v) })
const usun = (n: string, k: string) => magazyn<void>(n, 'readwrite', (s) => { s.delete(k) })

// ---------- powiadomienia między ekranami (i kartami) ----------
const zmiany = typeof window !== 'undefined' ? new EventTarget() : null
const kanal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('odniepamieci-teren') : null
kanal?.addEventListener('message', () => zmiany?.dispatchEvent(new Event('zmiana')))
function powiadom() { zmiany?.dispatchEvent(new Event('zmiana')); kanal?.postMessage('zmiana') }

// ---------- sieć ----------
let bezSieci = false
function ustawSiec(jest: boolean) { if (bezSieci === jest) { bezSieci = !jest; powiadom() } }
export const brakSieci = () => bezSieci || (typeof navigator !== 'undefined' && navigator.onLine === false)
/** fetch, który zapamiętuje brak sieci (pasek „Brak internetu”) i jego powrót. */
export async function pobierz(adres: string, opcje?: RequestInit): Promise<Response> {
    try { const r = await fetch(adres, { cache: 'no-store', ...opcje }); ustawSiec(true); return r }
    catch (b) { ustawSiec(false); throw b }
}

// ---------- konto ----------
/** Konto z ostatniej odpowiedzi serwera; dane innego konta w telefonie są usuwane (kolejka zostaje – do decyzji tej osoby). */
export async function przypiszKonto(konto: string) {
    await zapisz('inne', { klucz: 'konto', konto })
    for (const p of await wszystkie<PlanWTelefonie>('plany')) if (p.konto !== konto) await usunPlanZTelefonu(p.konto, p.slug)
    powiadom()
}
export async function kontoWTelefonie(): Promise<string | null> {
    return (await jeden<{ konto: string }>('inne', 'konto'))?.konto ?? null
}

// ---------- start (lista planów) bez sieci ----------
export async function zapiszStart(dane: unknown) { await zapisz('inne', { klucz: 'start', dane, czas: new Date().toISOString() }) }
export async function startZTelefonu<T>(): Promise<{ dane: T; czas: string } | null> {
    const s = await jeden<{ dane: T; czas: string }>('inne', 'start')
    return s ? { dane: s.dane, czas: s.czas } : null
}

// ---------- plany w telefonie ----------
const klucz = (konto: string, slug: string) => `${konto}|${slug}`
export const planyWTelefonie = () => wszystkie<PlanWTelefonie>('plany')
export async function planZTelefonu(slug: string): Promise<PlanWTelefonie | null> {
    const k = await kontoWTelefonie()
    return k ? (await jeden<PlanWTelefonie>('plany', klucz(k, slug))) ?? null : null
}
export async function oznaczOtwarcie(p: PlanWTelefonie) { await zapisz('plany', { ...p, otwarto: new Date().toISOString() }) }

/** „Pobierz do pracy bez internetu”: plan dla konta, pliki planu (podkłady, ikony), miejscowości, strony aplikacji. */
export async function pobierzPlan(slug: string): Promise<PlanWTelefonie> {
    const r = await pobierz(`/api/keystatic/plany/${encodeURIComponent(slug)}/teren`)
    const j = await r.json().catch(() => null)
    if (!r.ok || !j?.plan) throw new Error(j?.blad ?? (r.status === 401 ? 'Sesja wygasła – zaloguj się ponownie.' : 'Nie udało się pobrać planu.'))
    return zapiszPlanWTelefonie(slug, j as DanePlanu, true)
}
async function zapiszPlanWTelefonie(slug: string, d: DanePlanu, plikiTez: boolean): Promise<PlanWTelefonie> {
    const pliki = (d.pliki ?? []).map((p) => p.adres)
    if (plikiTez) {
        const c = await caches.open(PLIKI)
        for (const a of pliki) {
            if (await c.match(a)) continue
            const o = await pobierz(a)
            if (!o.ok) throw new Error('Nie udało się pobrać podkładu planu.')
            await c.put(a, o)
        }
        await pobierzMiejscowosci().catch(() => {})
    }
    const teraz = new Date().toISOString(), byl = await jeden<PlanWTelefonie>('plany', klucz(d.konto, slug))
    const bajty = (d.pliki ?? []).reduce((s, p) => s + p.bajty, 0) + new Blob([JSON.stringify(d.plan)]).size
    const rek: PlanWTelefonie = { klucz: klucz(d.konto, slug), konto: d.konto, slug, tytul: d.plan.tytul, dane: { ...d, pliki: undefined }, pobrano: plikiTez ? teraz : byl?.pobrano ?? teraz, otwarto: teraz, bajty, pliki }
    await zapisz('plany', rek)
    await przypiszKonto(d.konto)
    if (plikiTez) przygotujStrony(true)
    powiadom()
    return rek
}
/** Świeży plan z serwera (po wysłaniu kolejki albo przy otwarciu z siecią) – aktualizuje kopię w telefonie, jeśli plan jest pobrany. */
export async function odswiezPlanWTelefonie(slug: string, d: DanePlanu) {
    const byl = await jeden<PlanWTelefonie>('plany', klucz(d.konto, slug))
    if (!byl) return
    const nowe = (d.pliki ?? []).some((p) => !byl.pliki.includes(p.adres))
    await zapiszPlanWTelefonie(slug, d, nowe)
}
export async function usunPlanZTelefonu(konto: string, slug: string) {
    const p = await jeden<PlanWTelefonie>('plany', klucz(konto, slug))
    if (p && typeof caches !== 'undefined') {
        const inne = (await wszystkie<PlanWTelefonie>('plany')).filter((x) => x.klucz !== p.klucz).flatMap((x) => x.pliki)
        const c = await caches.open(PLIKI)
        for (const a of p.pliki) if (!inne.includes(a)) await c.delete(a)
    }
    await usun('plany', klucz(konto, slug))
    powiadom()
}
/** Dane planów wygasają po 30 dniach bez otwarcia (decyzja 19.11); kolejka zostaje, dopóki nie zostanie wysłana albo usunięta. */
export async function usunWygasle(): Promise<number> {
    let n = 0
    for (const p of await wszystkie<PlanWTelefonie>('plany')) if (wygaslo(p.otwarto)) { await usunPlanZTelefonu(p.konto, p.slug); n++ }
    return n
}

// ---------- miejscowości („najbliżej” bez sieci) ----------
export async function pobierzMiejscowosci() {
    const r = await pobierz('/api/keystatic/teren/gdzie?lista=1')
    if (r.ok) await zapisz('inne', { klucz: 'miejscowosci', lista: (await r.json()).miejscowosci ?? [], czas: new Date().toISOString() })
}
export async function miejscowosciZTelefonu(): Promise<PunktMiejscowosci[]> {
    return (await jeden<{ lista: PunktMiejscowosci[] }>('inne', 'miejscowosci'))?.lista ?? []
}

// ---------- strony aplikacji w telefonie (service worker) ----------
export async function rejestrujSW() {
    if (!('serviceWorker' in navigator)) return
    try { await navigator.serviceWorker.register('/teren-sw.js', { scope: '/keystatic/teren' }) } catch { /* bez service workera aplikacja działa jak dotąd – z internetem */ }
}
/** Prosi service worker o zapisanie stron terenu (i stron pobranych planów) z ich kodem; bez `zawsze` – najwyżej raz na godzinę. */
export async function przygotujStrony(zawsze = false): Promise<{ pliki?: number; blad?: string; pominieto?: boolean } | null> {
    if (!('serviceWorker' in navigator) || brakSieci()) return null
    const r = await navigator.serviceWorker.ready.catch(() => null)
    if (!r?.active) return null
    const k = await kontoWTelefonie()
    const plany = (await wszystkie<PlanWTelefonie>('plany')).filter((p) => p.konto === k).map((p) => p.slug)
    return new Promise((ok) => {
        const t = window.setTimeout(() => ok(null), 60000)
        navigator.serviceWorker.addEventListener('message', function sluchaj(e) {
            if (e.data?.typ !== 'przygotowane') return
            navigator.serviceWorker.removeEventListener('message', sluchaj); window.clearTimeout(t); ok(e.data)
        })
        r.active!.postMessage({ typ: 'przygotuj', plany, zawsze })
    })
}

// ---------- kolejka ----------
export const kolejka = () => wszystkie<PozycjaKolejki>('kolejka')
export async function zdjeciaPozycji(id: string): Promise<Blob[]> { return (await jeden<{ pliki: Blob[] }>('zdjecia', id))?.pliki ?? [] }
export async function dodajDoKolejki(p: PozycjaKolejki, zdjecia: Blob[] = []) {
    if (zdjecia.length) await zapisz('zdjecia', { id: p.id, pliki: zdjecia })
    await zapisz('kolejka', p)
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {})
    powiadom()
}
export async function usunZKolejki(id: string) { await usun('kolejka', id); await usun('zdjecia', id); powiadom() }

export type WynikWysylki = { wyslane: Map<string, WpisDziennika | null>; zaloguj: boolean; przerwane: boolean; konto: string | null }
let trwa: Promise<WynikWysylki> | null = null
let stanWysylki: { trwa: boolean; zaloguj: boolean } = { trwa: false, zaloguj: false }
export const wysylka = () => stanWysylki

/** Wysyła czekające pozycje bieżącego konta po kolei. Jedna wysyłka naraz; brak sieci przerywa (pozycje czekają dalej). */
export function wyslijKolejke(): Promise<WynikWysylki> {
    if (trwa) return trwa
    trwa = (async (): Promise<WynikWysylki> => {
        const wyn: WynikWysylki = { wyslane: new Map(), zaloguj: false, przerwane: false, konto: null }
        const L = await kolejka()
        if (!L.some((p) => p.stan === 'czeka')) return wyn
        stanWysylki = { trwa: true, zaloguj: false }; powiadom()
        // kto jest zalogowany teraz – pozycje innego konta nie są wysyłane (podpis „kto”)
        let ja: string
        try {
            const r = await pobierz('/api/keystatic/teren')
            if (r.status === 401) { wyn.zaloguj = true; return wyn }
            if (!r.ok) { wyn.przerwane = true; return wyn }
            const j = await r.json(); ja = j.konto; wyn.konto = ja
            await zapiszStart(j); await przypiszKonto(ja)
        } catch { wyn.przerwane = true; return wyn }
        const plany = new Set<string>()
        for (const p of doWyslania(L, ja)) {
            let status: number | 'siec' = 'siec', j: { blad?: string; wpis?: WpisDziennika } | null = null
            try {
                const r = await wyslijPozycje(p)
                status = r.status; j = await r.json().catch(() => null)
            } catch { status = 'siec' }
            const o = ocenOdpowiedz(status, j?.blad)
            if (o.co === 'wyslane') { wyn.wyslane.set(p.id, j?.wpis ?? null); if (p.rodzaj === 'czynnosc') plany.add(p.plan); await usunZKolejki(p.id) }
            else if (o.co === 'problem') await zapisz('kolejka', { ...p, stan: 'problem', blad: o.blad })
            else { if (o.co === 'zaloguj') wyn.zaloguj = true; else wyn.przerwane = true; break }
        }
        for (const slug of plany) {
            try {
                const r = await pobierz(`/api/keystatic/plany/${encodeURIComponent(slug)}/teren`)
                if (r.ok) await odswiezPlanWTelefonie(slug, await r.json())
            } catch { /* świeży plan przy następnym otwarciu */ }
        }
        return wyn
    })()
        .then((w) => { stanWysylki = { trwa: false, zaloguj: w.zaloguj }; return w })
        .finally(() => { trwa = null; if (stanWysylki.trwa) stanWysylki = { trwa: false, zaloguj: false }; powiadom() })
    return trwa
}

async function wyslijPozycje(p: PozycjaKolejki): Promise<Response> {
    const fd = new FormData()
    if (p.rodzaj === 'miejsce') {
        fd.append('id', p.id)
        for (const [k, v] of Object.entries(p.pola)) if (v !== undefined && v !== null) fd.append(k, String(v))
        for (const [i, b] of (await zdjeciaPozycji(p.id)).entries()) fd.append('zdjecie', new File([b], `zdjecie-${i + 1}.jpg`, { type: b.type || 'image/jpeg' }))
        return fetch('/api/keystatic/teren/miejsca', { method: 'POST', body: fd })
    }
    const adres = `/api/keystatic/plany/${encodeURIComponent(p.plan)}/teren`
    if (p.czynnosc.rodzaj !== 'zdjecie') return fetch(adres, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p.czynnosc) })
    const [b] = await zdjeciaPozycji(p.id)
    if (!b) return new Response(JSON.stringify({ blad: 'Zdjęcie zniknęło z pamięci telefonu.' }), { status: 422 })
    fd.append('plik', new File([b], 'zdjecie.jpg', { type: b.type || 'image/jpeg' }))
    for (const [k, v] of Object.entries(p.czynnosc)) if (k !== 'plik' && v !== undefined) fd.append(k, String(v))
    return fetch(adres, { method: 'POST', body: fd })
}

// ---------- wszystko z telefonu (wylogowanie, „usuń z telefonu”) ----------
export async function wyczyscTelefon() {
    try { (await otworz()).close() } catch { /* brak bazy */ }
    wyczyszczony = true; baza = null
    await new Promise<void>((ok) => { const r = indexedDB.deleteDatabase(BAZA); r.onsuccess = r.onerror = () => ok(); r.onblocked = () => window.setTimeout(ok, 1500) })
    if (typeof caches !== 'undefined') for (const k of await caches.keys()) if (k.startsWith('teren-')) await caches.delete(k)
    const r = await navigator.serviceWorker?.getRegistration('/keystatic/teren').catch(() => undefined)
    await r?.unregister().catch(() => {})
}

// ---------- zdjęcie zmniejszone w telefonie ----------
/** Dłuższy bok najwyżej 2400 px, JPEG; obraz przerysowany w telefonie nie ma EXIF ani GPS. Gdy się nie da (format) – oryginał. */
export async function zmniejszZdjecie(f: File): Promise<Blob> {
    try {
        const bm = await createImageBitmap(f, { imageOrientation: 'from-image' })
        const { szer, wys } = wymiaryPoZmniejszeniu(bm.width, bm.height)
        const c = document.createElement('canvas'); c.width = szer; c.height = wys
        c.getContext('2d')!.drawImage(bm, 0, 0, szer, wys); bm.close()
        const b = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.86))
        return b && b.size > 0 ? b : f
    } catch { return f }
}

// ---------- hooki ----------
/** Kolejka, stan sieci i wysyłki – odświeżane po każdej zmianie (także z innej karty). */
export function useKolejka(): { pozycje: PozycjaKolejki[]; bezSieci: boolean; trwa: boolean; zaloguj: boolean } {
    const [s, ustaw] = React.useState({ pozycje: [] as PozycjaKolejki[], bezSieci: false, trwa: false, zaloguj: false })
    React.useEffect(() => {
        let zywy = true
        const odswiez = () => { kolejka().then((p) => { if (zywy) ustaw({ pozycje: p.sort((a, b) => a.czas.localeCompare(b.czas)), bezSieci: brakSieci(), ...wysylka() }) }).catch(() => {}) }
        const siec = () => { ustawSiec(navigator.onLine); odswiez() }
        odswiez()
        zmiany?.addEventListener('zmiana', odswiez); window.addEventListener('online', siec); window.addEventListener('offline', siec)
        return () => { zywy = false; zmiany?.removeEventListener('zmiana', odswiez); window.removeEventListener('online', siec); window.removeEventListener('offline', siec) }
    }, [])
    return s
}
/** Wywołuje `f` przy każdej zmianie w pamięci telefonu (kolejka, plany). */
export function useZmianyPamieci(f: () => void) {
    const ref = React.useRef(f)
    React.useEffect(() => { ref.current = f })
    React.useEffect(() => {
        const h = () => ref.current()
        zmiany?.addEventListener('zmiana', h)
        return () => zmiany?.removeEventListener('zmiana', h)
    }, [])
}

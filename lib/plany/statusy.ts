// Statusy pracy nad grobem (etap 1, CEM-22): etap opracowania osobno od weryfikacji źródeł i od pewności położenia.
//   etap opracowania:   narysowany → opracowany → sprawdzony   (stan pracy redakcji)
//   weryfikacja źródeł: brak / częściowa / potwierdzona        (co potwierdzają księgi – obok tekstu „weryfikacja w źródłach”)
//   położenie:          auto (rozpoznany automatycznie) / przyp (przypuszczalny) – brak pola = położenie pewne
// Dawne jedno pole `weryfikacja` (auto | przyp | ok) mieszało te rzeczy, a nowy grób dostawał „ok”.
// Migracja (decyzja właściciela 16.11): dane = napis, osoby, zdjęcia albo weryfikacja w źródłach;
//   bez danych → narysowany, z danymi → opracowany (nigdy „sprawdzony” – to zatwierdza człowiek w trybie „Sprawdź”);
//   auto / przyp → pole `polozenie`. Wszystkie statusy są robocze – czytelnik ich nie dostaje (dlaCzytelnika).

import type { Element, Plan } from './model'
import { typGrobu, type TypElementu } from './typy'

export type Etap = 'narysowany' | 'opracowany' | 'sprawdzony'
export type StanZrodel = 'brak' | 'czesciowa' | 'potwierdzona'
export type Polozenie = 'auto' | 'przyp'

export const ETAPY: readonly Etap[] = ['narysowany', 'opracowany', 'sprawdzony']
export const STANY_ZRODEL: readonly StanZrodel[] = ['brak', 'czesciowa', 'potwierdzona']
export const ETYKIETA_ETAPU: Record<Etap, string> = { narysowany: 'narysowany', opracowany: 'opracowany', sprawdzony: 'sprawdzony' }
export const ETYKIETA_ZRODEL: Record<StanZrodel, string> = { brak: 'brak', czesciowa: 'częściowa', potwierdzona: 'potwierdzona' }
export const ETYKIETA_POLOZENIA: Record<Polozenie | 'pewne', string> = { pewne: 'pewne', auto: 'rozpoznane automatycznie', przyp: 'przypuszczalne' }

/** Czy grób ma dane opracowania: napis, osoby, zdjęcia albo weryfikację w źródłach. */
export function maDane(e: Element): boolean {
    return !!(e.napis?.trim() || e.zrodla?.trim() || e.osoby?.some((o) => o.nazwa?.trim()) || e.zdjecia?.length)
}

/** Etap opracowania: zapisany albo – dla planów sprzed migracji – wyliczony tak samo jak w migracji. */
export function etapElementu(e: Element): Etap {
    if (e.etap && ETAPY.includes(e.etap)) return e.etap
    return maDane(e) ? 'opracowany' : 'narysowany'
}

export function stanZrodel(e: Element): StanZrodel {
    return e.zrodlaStan && STANY_ZRODEL.includes(e.zrodlaStan) ? e.zrodlaStan : 'brak'
}

export function polozenie(e: Element): Polozenie | undefined {
    if (e.polozenie === 'auto' || e.polozenie === 'przyp') return e.polozenie
    if (e.weryfikacja === 'auto' || e.weryfikacja === 'przyp') return e.weryfikacja
    return undefined
}

/** Grób po migracji: zapisany etap, pewność położenia w osobnym polu, bez dawnego pola `weryfikacja`. */
export function migrujElement(e: Element, typ: TypElementu | undefined): Element {
    if (!typGrobu(typ)) {
        if (e.weryfikacja === undefined) return e
        const { weryfikacja: _w, ...reszta } = e
        return reszta
    }
    if (e.etap && e.weryfikacja === undefined) return e
    const { weryfikacja: _w, ...reszta } = e
    const p = polozenie(e)
    const wyn: Element = { ...reszta, etap: etapElementu(e) }
    if (p) wyn.polozenie = p
    return wyn
}

export interface RaportStatusow {
    grobow: number
    /** dawne pole weryfikacja: ok / auto / przyp / brak (bez pola) / juz (grób ma już zapisany etap) */
    przed: Record<'ok' | 'auto' | 'przyp' | 'brak' | 'juz', number>
    po: Record<Etap, number>
    /** ile grobów zmieni zapis (dostanie etap albo straci dawne pole) */
    zmienione: number
    /** szczegóły przejść, np. „ok → narysowany” */
    przejscia: Record<string, number>
}

export function raportStatusow(plan: Pick<Plan, 'elementy'>, typy: Map<string, TypElementu>): RaportStatusow {
    const r: RaportStatusow = { grobow: 0, przed: { ok: 0, auto: 0, przyp: 0, brak: 0, juz: 0 }, po: { narysowany: 0, opracowany: 0, sprawdzony: 0 }, zmienione: 0, przejscia: {} }
    for (const e of plan.elementy) {
        const t = typy.get(e.typ)
        if (!typGrobu(t)) { if (e.weryfikacja !== undefined) r.zmienione++; continue }
        r.grobow++
        const dawny = e.etap && e.weryfikacja === undefined ? 'juz' : (e.weryfikacja ?? 'brak')
        r.przed[dawny]++
        const m = migrujElement(e, t), etap = etapElementu(m)
        r.po[etap]++
        if (m !== e) r.zmienione++
        const k = `${dawny === 'juz' ? `zapisany ${e.etap}` : dawny} → ${etap}`
        r.przejscia[k] = (r.przejscia[k] ?? 0) + 1
    }
    return r
}

/** Cały plan po migracji statusów. Zwraca ten sam obiekt, gdy nic się nie zmienia (migracja jest powtarzalna). */
export function migrujPlan<P extends Pick<Plan, 'elementy'>>(plan: P, typy: Map<string, TypElementu>): P {
    let zm = false
    const elementy = plan.elementy.map((e) => { const m = migrujElement(e, typy.get(e.typ)); if (m !== e) zm = true; return m })
    return zm ? { ...plan, elementy } : plan
}

/**
 * Zmiana danych grobu przez redaktora: grób „narysowany” po wpisaniu danych staje się „opracowany”
 * (nigdy automatycznie „sprawdzony”). Zmiana etapu albo położenia usuwa dawne pole `weryfikacja`.
 */
export function poZmianieDanych(e: Element, zmiana: Partial<Element>, typ: TypElementu | undefined): Partial<Element> {
    if (!typGrobu(typ)) return zmiana
    const wyn: Partial<Element> = { ...zmiana }
    if (('etap' in zmiana || 'polozenie' in zmiana) && e.weryfikacja !== undefined) {
        wyn.weryfikacja = undefined
        if (!('etap' in zmiana)) wyn.etap = etapElementu(e)
        if (!('polozenie' in zmiana)) { const p = polozenie(e); if (p) wyn.polozenie = p }
    }
    if (!('etap' in zmiana) && etapElementu(e) === 'narysowany' && maDane({ ...e, ...zmiana })) {
        wyn.etap = 'opracowany'
        if (e.weryfikacja !== undefined) { wyn.weryfikacja = undefined; const p = polozenie(e); if (p && !('polozenie' in zmiana)) wyn.polozenie = p }
    }
    return wyn
}

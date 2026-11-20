// P7c (KON-08): plany a „tylko ja” w panelu dla konta bez roli administratora (decyzja właściciela 20.11.2026).
// Plan „tylko ja” – niewidoczny (jak nieistniejący). W widocznym planie elementy „tylko ja” są wycinane z odczytu, a przy zapisie
// z edytora wracają z pliku na swoje miejsce (inaczej zapis redaktora by je skasował). Konto bez tej roli nie ustawia „tylko ja”.
// Czysta logika (bez fs) – test lib/konta/tylko-ja.test.ts.
import type { Element, Plan } from './model'

export const BLAD_TYLKO_JA = 'Widoczność „tylko ja” ustawia tylko administrator (przełącz rolę w menu pod swoim imieniem).'

export const planUkryty = (p: Pick<Plan, 'widocznosc'> | null | undefined) => p?.widocznosc === 'ja'
const elementUkryty = (e: Pick<Element, 'widocznosc'>) => e.widocznosc === 'ja'

export function planBezTylkoJa<T extends Pick<Plan, 'elementy'>>(plan: T): T {
    return plan.elementy.some(elementUkryty) ? { ...plan, elementy: plan.elementy.filter((e) => !elementUkryty(e)) } : plan
}

/** Pliki zdjęć elementów „tylko ja” (nie wydajemy ich kontu bez tej roli). */
export function plikiUkrytychElementow(plan: Pick<Plan, 'elementy'>): Set<string> {
    return new Set(plan.elementy.filter(elementUkryty).flatMap((e) => (e.zdjecia ?? []).map((z) => z.plik)))
}

/**
 * Zapis planu przez konto bez roli administratora: elementy „tylko ja” z obecnego pliku wracają na swoje miejsca
 * (element o tym samym id z edytora jest pomijany – nie mógł go widzieć). Zwraca plan do zapisu albo zdanie o błędzie.
 */
export function scalZUkrytymi<T extends Pick<Plan, 'widocznosc' | 'elementy'>>(nowy: T, stary: Pick<Plan, 'widocznosc' | 'elementy'> | null): T | string {
    if (planUkryty(stary)) return 'Nie ma takiego planu.'
    if (planUkryty(nowy) || nowy.elementy.some(elementUkryty)) return BLAD_TYLKO_JA
    const ukryte = (stary?.elementy ?? []).map((e, i) => ({ e, i })).filter(({ e }) => elementUkryty(e))
    if (!ukryte.length) return nowy
    const id = new Set(ukryte.map(({ e }) => e.id))
    const elementy = nowy.elementy.filter((e) => !id.has(e.id))
    for (const { e, i } of ukryte) elementy.splice(Math.min(i, elementy.length), 0, e)
    return { ...nowy, elementy }
}

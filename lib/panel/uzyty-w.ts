// Łatka 21.11: „użyty w” na stronach materiału w panelu – te same teksty co „we wpisach” i „odnośniki w tekstach”
// na publicznej karcie materiału (sieć powiązań: odnośnik [[…]] albo materiał wstawiony we wpis), z adresem edycji.
import type { Powiazania, Widocznosc } from '@/lib/archiwum'
import { adresEdycji } from './menu'

export const WSTAWIONY = 'materiał wstawiony we wpis'

export interface UzycieMaterialu {
    rodzaj: string
    nazwa: string
    /** strona publiczna tekstu */
    adres: string
    /** edycja w Keystatic / panelu (null – gdy tekstu nie da się edytować z panelu) */
    edycja: string | null
    wstawiony: boolean
    /** ile odnośników w tekście */
    odnosnikow: number
}

/** Najpierw wpisy, potem pozostałe teksty – w kolejności sieci (ta sama co na karcie materiału). */
export function naUzycia(p: Powiazania): UzycieMaterialu[] {
    const wynik = p.odnosniki.map((z) => {
        const wstawiony = z.fragmenty.some((f) => f.trafienie === WSTAWIONY)
        return { rodzaj: z.zrodlo.rodzaj, nazwa: z.zrodlo.nazwa, adres: z.zrodlo.adres, edycja: adresEdycji(z.zrodlo.adres), wstawiony, odnosnikow: wstawiony ? Math.max(0, z.ile - 1) : z.ile }
    })
    return [...wynik.filter((u) => u.rodzaj === 'wpis'), ...wynik.filter((u) => u.rodzaj !== 'wpis')]
}

export async function uzytyW(id: string, poziom: Widocznosc): Promise<UzycieMaterialu[]> {
    const { powiazania } = await import('@/lib/archiwum')
    return naUzycia(await powiazania('material', id, poziom))
}

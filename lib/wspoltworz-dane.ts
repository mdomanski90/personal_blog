// WSP-02 (etap R): wczytanie zadań „czego brakuje” – tylko rekordy publiczne; definicje i filtry – lib/wspoltworz.ts.
import { materialy, miejsca, obiekty, objasnieniaDoWidoku, OBSZARY, RODZAJE_MIEJSC } from './archiwum'
import { zignorowaneUwagi } from './panel/jakosc'
import { zbierzZadania, type Zadanie } from './wspoltworz'
import { kluczZadania, type IdBraku } from './wspoltworz-reguly'

/** Wszystkie zadania – tylko z rekordów publicznych. */
export async function zadania(): Promise<Zadanie[]> {
    const poziom = 'publiczne' as const
    const [mats, obs, msc, ign] = await Promise.all([materialy(poziom), obiekty(poziom), miejsca(poziom), zignorowaneUwagi()])
    const odczyty = new Map<string, { odczyt: boolean; tlumaczenie: boolean }>()
    for (const m of mats) if (m.strony.length) {
        const obj = await objasnieniaDoWidoku(m.id, poziom)
        odczyty.set(m.id, { odczyt: obj.some((o) => o.rodzaj === 'odczyt'), tlumaczenie: obj.some((o) => o.rodzaj === 'tlumaczenie') })
    }
    return zbierzZadania({
        materialy: mats, obiekty: obs, miejsca: msc, zignorowane: ign,
        odczyty: (id) => odczyty.get(id) ?? { odczyt: false, tlumaczenie: false },
        rodzajMiejsca: (m) => ({ nazwa: RODZAJE_MIEJSC[m.rodzaj] ?? m.rodzaj, obszar: OBSZARY.includes(m.rodzaj) }),
    })
}

/**
 * WSP-04 (etap R): które braki karty pokazać z „pomóż uzupełnić” – te same decyzje redakcji co na stronie „współtwórz”
 * (pole „nie pokazuj w współtwórz” i „zignoruj” w panelu). Braki liczy karta z danych, które już pokazuje czytelnikowi.
 */
export async function brakiDoPomocy(kolekcja: 'materialy' | 'obiekty' | 'miejsca', id: string, braki: IdBraku[], wylaczony: boolean): Promise<Set<IdBraku>> {
    if (wylaczony || !braki.length) return new Set()
    const ign = await zignorowaneUwagi()
    return new Set(braki.filter((b) => !ign.has(kluczZadania(kolekcja, id, b))))
}

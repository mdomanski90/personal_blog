// KAT-03/04: czy pozycja z rejestru jest widoczna dla czytelnika (te same funkcje co strony – zasada 1.5) i jaki ma
// obecny identyfikator (po zmianie sluga – przez tabelę przekierowań). Niewidoczna = null: krótki adres i wyszukiwarka
// nie zdradzają, że numer istnieje ani dokąd prowadzi.
import type { Widocznosc } from '../archiwum'
import type { RodzajKat } from './model'
import { adresPozycji } from './dane'

const PRZEKIEROWANIA: Partial<Record<RodzajKat, string>> = { material: 'archiwum', wpis: 'wpisy', miejsce: 'miejsca', obiekt: 'obiekty', temat: 'tematy', instytucja: 'parafie' }

async function istnieje(rodzaj: RodzajKat, id: string, poziom: Widocznosc): Promise<boolean> {
    const a = await import('../archiwum')
    switch (rodzaj) {
        case 'material': return !!(await a.material(id, poziom))
        case 'wpis': return !!(await a.opowiesc(id, poziom))
        case 'miejsce': return !!(await a.miejsce(id, poziom))
        case 'obiekt': return !!(await a.obiekt(id, poziom))
        case 'temat': return !!(await a.temat(id, poziom))
        case 'instytucja': return (await a.parafie()).some((p) => p.id === id)
        case 'zbior': return !!(await (await import('../paczka5')).zbior(id, poziom))
        case 'publikacja': return !!(await (await import('../paczka5')).publikacja(id, poziom))
        case 'plan': { const { wczytajPlan } = await import('../plany/dane'); const p = await wczytajPlan(id); return !!p && a.widoczne(p.widocznosc, poziom) }
        case 'osoba': { const s = await (await import('../osoby/dane')).stanOsob(); return s.drzewo.osoby.has(id) && a.widoczne(s.widocznosc(id), poziom) }
    }
}

/** Adres strony pozycji dla czytelnika albo null (nie ma jej albo jest dla niego niewidoczna). */
export async function adresDlaCzytelnika(rodzaj: RodzajKat, id: string, poziom: Widocznosc): Promise<string | null> {
    let cel = id
    if (!(await istnieje(rodzaj, cel, poziom))) {
        const r = PRZEKIEROWANIA[rodzaj]
        if (!r) return null
        const { wczytajPrzekierowania, celPrzekierowania } = await import('../przekierowania')
        const nowy = celPrzekierowania(await wczytajPrzekierowania(), r, id)
        if (!nowy || !(await istnieje(rodzaj, nowy, poziom))) return null
        cel = nowy
    }
    return adresPozycji(rodzaj, cel)
}

/** Adres pozycji o numerze katalogowym dla czytelnika (null – nie ma numeru albo pozycja niewidoczna). */
export async function adresNumeru(nr: string, poziom: Widocznosc): Promise<string | null> {
    const { wczytajRejestr } = await import('./dane')
    const p = wczytajRejestr()?.pozycje[nr]
    return p ? adresDlaCzytelnika(p.rodzaj, p.id, poziom) : null
}

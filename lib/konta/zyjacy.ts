// P7a (KON-01): uprawnienie „dane osób żyjących” w panelu osób. Bez niego konto nie dostaje z API osób żyjących
// (lista, karta, krewni na karcie, biogram, portret). Konta wyłączone – jak przed P7a (panel widzi wszystko).
// P7c (KON-08): tak samo osoby „tylko ja” – tylko dla konta z rolą administratora (lib/konta/straz.ts widziTylkoJa).
import { kontaWlaczone, widziTylkoJaZadanie, zalogowany } from './straz'

export const widziZyjacych = (req: Request) => !kontaWlaczone() || !!zalogowany(req)?.uprawnienia.has('zyjacy')

type StanDostepu = { zyje: (id: string) => boolean; widocznosc: (id: string) => string }
/** Czy osoba jest dla konta z tego żądania: żyjąca – z uprawnieniem „dane osób żyjących”, „tylko ja” – z rolą administratora. */
export function osobaDostepna(req: Request): (s: StanDostepu, id: string) => boolean {
    const zyjacy = widziZyjacych(req), tylkoJa = widziTylkoJaZadanie(req)
    return (s, id) => (zyjacy || !s.zyje(id)) && (tylkoJa || s.widocznosc(id) !== 'ja')
}

/** Odmowa dla trasy jednej osoby, gdy osoba żyje, a konto nie ma uprawnienia (403), albo jest „tylko ja” bez roli administratora (404). */
export async function odmowaOsobyZyjacej(req: Request, id: string): Promise<Response | null> {
    const zyjacy = widziZyjacych(req), tylkoJa = widziTylkoJaZadanie(req)
    if (zyjacy && tylkoJa) return null
    const { stanOsob } = await import('../osoby/dane')
    const s = await stanOsob()
    if (!s.drzewo.osoby.has(id)) return null
    if (!tylkoJa && s.widocznosc(id) === 'ja') return Response.json({ blad: 'Nie ma takiej osoby.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    return !zyjacy && s.zyje(id)
        ? Response.json({ blad: 'Dane osób żyjących widzą tylko konta z uprawnieniem „dane osób żyjących”.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
        : null
}

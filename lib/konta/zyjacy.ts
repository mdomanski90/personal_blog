// P7a (KON-01): uprawnienie „dane osób żyjących” w panelu osób. Bez niego konto nie dostaje z API osób żyjących
// (lista, karta, krewni na karcie, biogram, portret). Konta wyłączone – jak przed P7a (panel widzi wszystko).
import { kontaWlaczone, zalogowany } from './straz'

export const widziZyjacych = (req: Request) => !kontaWlaczone() || !!zalogowany(req)?.uprawnienia.has('zyjacy')

/** Odmowa dla trasy jednej osoby, gdy osoba żyje, a konto nie ma uprawnienia. */
export async function odmowaOsobyZyjacej(req: Request, id: string): Promise<Response | null> {
    if (widziZyjacych(req)) return null
    const { stanOsob } = await import('../osoby/dane')
    const s = await stanOsob()
    return s.drzewo.osoby.has(id) && s.zyje(id)
        ? Response.json({ blad: 'Dane osób żyjących widzą tylko konta z uprawnieniem „dane osób żyjących”.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
        : null
}

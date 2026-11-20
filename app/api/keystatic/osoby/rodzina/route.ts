import { brakDostepu } from '@/lib/plany/dane'
import { osobaDostepna } from '@/lib/konta/zyjacy'
import { stanOsob, zapiszRodzine } from '@/lib/osoby/dane'
import { polacz, rozlacz } from '@/lib/osoby/relacje'
import { poprawRodzine, type Rodzina } from '@/lib/osoby/model'
import { zNadaniemNumerow } from '@/lib/katalog/dane'

// Relacje w panelu: połącz istniejące osoby, wypisz z rodziny, zapisz ślub/rozwód i kolejność dzieci.
// KAT-01: po udanym zapisie – numery katalogowe dla nowych pozycji publicznych
export const POST = zNadaniemNumerow(zapiszPOST)

/** Rodzina z osobą niedostępną dla konta (żyjącą bez uprawnienia, „tylko ja”) – jak nieistniejąca. */
function rodzinaDostepna(s: Awaited<ReturnType<typeof stanOsob>>, id: string, dostepna: ReturnType<typeof osobaDostepna>): boolean {
    const r = s.drzewo.rodziny.get(id)
    return !r || [r.maz, r.zona, ...r.dzieci].filter((x): x is string => !!x).every((x) => !s.drzewo.osoby.has(x) || dostepna(s, x))
}

async function zapiszPOST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = await req.json().catch(() => null)
    const s = await stanOsob()
    try {
        if (d?.akcja === 'polacz') {
            // P7c (KON-08): osoby „tylko ja” (i żyjące bez uprawnienia) – jak nieistniejące
            const dostepna = osobaDostepna(req)
            if (!s.drzewo.osoby.has(d.osoba) || !s.drzewo.osoby.has(d.z) || d.osoba === d.z || !dostepna(s, d.osoba) || !dostepna(s, d.z)) return Response.json({ blad: 'Nie ma takiej osoby.' }, { status: 400 })
            await polacz(d.osoba, d.z, d.jako, d.rodzina)
            return Response.json({ ok: true })
        }
        if ((d?.akcja === 'rozlacz' || d?.akcja === 'zapisz') && !rodzinaDostepna(s, String(d.rodzina?.id ?? d.rodzina), osobaDostepna(req))) return Response.json({ blad: 'Nie ma takiej rodziny.' }, { status: 400 })
        if (d?.akcja === 'rozlacz') {
            await rozlacz(String(d.rodzina), String(d.osoba))
            return Response.json({ ok: true })
        }
        if (d?.akcja === 'zapisz' && d.rodzina?.id && s.drzewo.rodziny.has(d.rodzina.id)) {
            const ist = s.drzewo.rodziny.get(d.rodzina.id)!
            const n = d.rodzina as Rodzina
            // z panelu zmieniają się tylko zdarzenia i kolejność dzieci (te same osoby)
            const dzieci = n.dzieci?.length === ist.dzieci.length && n.dzieci.every((c) => ist.dzieci.includes(c)) ? n.dzieci : ist.dzieci
            return Response.json({ rodzina: await zapiszRodzine(poprawRodzine({ ...ist, zdarzenia: n.zdarzenia ?? ist.zdarzenia, dzieci })) })
        }
    } catch (e) {
        return Response.json({ blad: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
    return Response.json({ blad: 'nieznane polecenie' }, { status: 400 })
}

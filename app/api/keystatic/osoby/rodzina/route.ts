import { brakDostepu } from '@/lib/plany/dane'
import { stanOsob, zapiszRodzine } from '@/lib/osoby/dane'
import { polacz, rozlacz } from '@/lib/osoby/relacje'
import { poprawRodzine, type Rodzina } from '@/lib/osoby/model'

// Relacje w panelu: połącz istniejące osoby, wypisz z rodziny, zapisz ślub/rozwód i kolejność dzieci.
export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = await req.json().catch(() => null)
    const s = await stanOsob()
    try {
        if (d?.akcja === 'polacz') {
            if (!s.drzewo.osoby.has(d.osoba) || !s.drzewo.osoby.has(d.z) || d.osoba === d.z) return Response.json({ blad: 'Nie ma takiej osoby.' }, { status: 400 })
            await polacz(d.osoba, d.z, d.jako, d.rodzina)
            return Response.json({ ok: true })
        }
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

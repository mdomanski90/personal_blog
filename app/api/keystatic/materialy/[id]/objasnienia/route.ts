import { brakDostepu } from '@/lib/plany/dane'
import { celeSieci, material } from '@/lib/archiwum'
import { ID_MATERIALU, stronyMaterialu } from '@/lib/strony-materialow'
import { objasnieniaMaterialu, poprawObjasnienie, zapiszObjasnienia, type Objasnienie } from '@/lib/objasnienia'

// Objaśnienia na skanach materiału (panel): odczyt + zapis całej listy.
export const dynamic = 'force-dynamic'

async function sprawdz(req: Request, params: Promise<{ id: string }>) {
    const b = brakDostepu(req); if (b) return { b }
    const { id } = await params
    if (!ID_MATERIALU.test(id)) return { b: Response.json({ blad: 'zły identyfikator' }, { status: 400 }) }
    const m = await material(id, 'ja')
    if (!m) return { b: Response.json({ blad: 'Nie ma takiego materiału.' }, { status: 404 }) }
    return { id, m }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const r = await sprawdz(req, params); if (r.b) return r.b
    const id = r.id!
    const strony = stronyMaterialu(id).map((s) => ({ ...s, podglad: `/api/keystatic/materialy/${id}/strony?podglad=${encodeURIComponent(s.plik)}` }))
    const cele = (await celeSieci('ja')).filter((c) => !(c.rodzaj === 'material' && c.id === id)).map((c) => ({ id: c.id, nazwa: c.nazwa, rodzaj: c.rodzaj }))
    return Response.json({ id, nazwa: r.m!.nazwa, widocznosc: r.m!.widocznosc, opracowal: r.m!.opracowal, strony, objasnienia: objasnieniaMaterialu(id), cele })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const r = await sprawdz(req, params); if (r.b) return r.b
    const id = r.id!
    const d = (await req.json().catch(() => null)) as { objasnienia?: Partial<Objasnienie>[] } | null
    if (!Array.isArray(d?.objasnienia)) return Response.json({ blad: 'brak danych' }, { status: 400 })
    const strony = new Set(stronyMaterialu(id).map((s) => s.plik))
    const dawne = new Map(objasnieniaMaterialu(id).map((o) => [o.id, o]))
    const teraz = new Date().toISOString().slice(0, 19) + 'Z'
    const widziane = new Set<string>()
    const nowe: Objasnienie[] = []
    for (const surowe of d!.objasnienia.slice(0, 2000)) {
        const o = poprawObjasnienie(surowe)
        if (!o || !strony.has(o.strona) || widziane.has(o.id)) continue
        widziane.add(o.id)
        const by = dawne.get(o.id)
        const zmiana = !by || JSON.stringify({ ...by, utworzono: 0, zmieniono: 0 }) !== JSON.stringify({ ...o, utworzono: 0, zmieniono: 0 })
        nowe.push({ ...o, utworzono: by?.utworzono ?? teraz, ...(zmiana ? { zmieniono: teraz } : by?.zmieniono ? { zmieniono: by.zmieniono } : {}) })
    }
    await zapiszObjasnienia(id, nowe)
    return Response.json({ objasnienia: nowe })
}

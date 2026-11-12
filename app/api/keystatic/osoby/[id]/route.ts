import { brakDostepu } from '@/lib/plany/dane'
import { Konflikt, obrzadekZdarzenia, stanOsob, usunOsobe, zapiszOsobe } from '@/lib/osoby/dane'
import { ID_OSOBY, poprawOsobe, type Osoba } from '@/lib/osoby/model'
import { ostrzezeniaWgOsob, skrot } from '@/lib/osoby/serwer'
import { parafie } from '@/lib/archiwum'

// Jedna osoba w panelu: dane, rodzina, ostrzeżenia; zapis z kontrolą wersji; usunięcie do kosza.
export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const b = brakDostepu(req); if (b) return b
    const { id } = await params
    const s = await stanOsob()
    const o = s.drzewo.osoby.get(id)
    if (!o) return Response.json({ blad: 'Nie ma takiej osoby.' }, { status: 404 })
    const rel = s.relacje.get(id) ?? { rodzice: [], malzenstwa: [] }
    const sk = (x?: string) => (x && s.drzewo.osoby.get(x) ? skrot(s, s.drzewo.osoby.get(x)!) : null)
    const par = await parafie()
    const zWszystkich = [...o.zdarzenia, ...rel.malzenstwa.flatMap((f) => f.zdarzenia)]
    const zParafii = Object.fromEntries(zWszystkich.map((z) => [z.id, obrzadekZdarzenia({ ...z, obrzadek: undefined }, par)?.obrzadek ?? null]))
    const potrzebneOsoby = new Set(o.zdarzenia.flatMap((z) => (z.chrzestni ?? []).map((c) => c.osoba).filter(Boolean) as string[]))
    return Response.json({
        osoba: o,
        zyjeAuto: s.zyje(id),
        rodzice: rel.rodzice.map((f) => ({ rodzina: f, maz: sk(f.maz), zona: sk(f.zona), rodzenstwo: f.dzieci.filter((c) => c !== id).map(sk).filter(Boolean) })),
        malzenstwa: rel.malzenstwa.map((f) => ({ rodzina: f, malzonek: sk(f.maz === id ? f.zona : f.maz), dzieci: f.dzieci.map(sk).filter(Boolean) })),
        osoby: Object.fromEntries([...potrzebneOsoby].map((x) => [x, sk(x)])),
        zrodla: Object.fromEntries([...s.drzewo.zrodla]),
        ostrzezenia: ostrzezeniaWgOsob(s).get(id) ?? [],
        zParafii,
        wszystkie: [...s.drzewo.osoby.values()].map((x) => skrot(s, x)),
    })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const b = brakDostepu(req); if (b) return b
    const { id } = await params
    if (!ID_OSOBY.test(id)) return Response.json({ blad: 'zły identyfikator' }, { status: 400 })
    const d = (await req.json().catch(() => null)) as { osoba?: Osoba } | null
    if (!d?.osoba) return Response.json({ blad: 'brak danych' }, { status: 400 })
    try {
        const o = await zapiszOsobe(poprawOsobe({ ...d.osoba, id }), d.osoba.wersja)
        return Response.json({ osoba: o })
    } catch (e) {
        if (e instanceof Konflikt) return Response.json({ blad: e.message }, { status: 409 })
        return Response.json({ blad: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const b = brakDostepu(req); if (b) return b
    const { id } = await params
    await usunOsobe(id)
    return Response.json({ ok: true })
}

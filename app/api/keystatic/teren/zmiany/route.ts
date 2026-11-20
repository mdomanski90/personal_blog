import { brakDostepu, listaPlanow } from '@/lib/plany/dane'
import { ktoTeraz } from '@/lib/konta/straz'
import { osobaWTerenie, planUkrytyWTerenie, rozstrzygnijZmiane, wpisyZTerenu } from '@/lib/teren/serwer'

// P7b (TER-01): zmiany z terenu dla redakcji – kto, co i kiedy zapisał na planach; napisy „do decyzji” (obie wersje) i ich rozstrzygnięcie.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const o = osobaWTerenie(req)
    if (!o?.pelne) return Response.json({ blad: 'Zmiany z terenu przegląda redakcja planów.' }, { status: 403 })
    // P7c (KON-08): zmiany na elementach „tylko ja” i planach „tylko ja” – tylko dla konta z rolą administratora
    const plany = (await listaPlanow()).filter((p) => !planUkrytyWTerenie(o, p))
    const ukryte = new Set(o.poziom === 'ja' ? [] : plany.flatMap((p) => p.elementy.filter((e) => e.widocznosc === 'ja').map((e) => `${p.slug}/${e.id}`)))
    const wpisy = (await wpisyZTerenu(plany, undefined, 200)).filter((w) => !ukryte.has(`${w.plan}/${w.grob}`))
    return Response.json({ wpisy, doDecyzji: wpisy.filter((w) => w.wynik === 'do-decyzji' && !w.rozstrzygnieto).length }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = (await req.json().catch(() => ({}))) as { plan?: string; id?: string; wybor?: string }
    if (typeof d.plan !== 'string' || typeof d.id !== 'string' || (d.wybor !== 'teren' && d.wybor !== 'redakcja')) return Response.json({ blad: 'Brak danych.' }, { status: 400 })
    const o = osobaWTerenie(req)
    if (o && o.poziom !== 'ja') {
        const p = (await listaPlanow()).find((x) => x.slug === d.plan)
        if (!p || planUkrytyWTerenie(o, p)) return Response.json({ blad: 'Nie ma takiego planu.' }, { status: 404 })
    }
    const w = await rozstrzygnijZmiane(d.plan, d.id, d.wybor, { id: ktoTeraz()?.id ?? 'redakcja' })
    if ('blad' in w) return Response.json({ blad: w.blad }, { status: w.status })
    return Response.json(w)
}

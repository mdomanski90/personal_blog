import { brakDostepu, wczytajUstawienia } from '@/lib/plany/dane'
import { postepPlanu } from '@/lib/teren/czynnosci'
import { listaMiejscTerenu, osobaWTerenie, planyOsoby, wpisyZTerenu } from '@/lib/teren/serwer'

// P7b (TER-01): ekran startowy „w terenie” – moje plany z postępem, moje ostatnie czynności i nowe miejsca. Tylko własne dane konta.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const o = osobaWTerenie(req)
    if (!o) return Response.json({ blad: 'Twoje konto nie pracuje w terenie.' }, { status: 403 })
    const [plany, u] = await Promise.all([planyOsoby(o), wczytajUstawienia()])
    const miejsca = o.miejsca ? (await listaMiejscTerenu()).filter((m) => m.kto === o.id).slice(0, 30) : []
    return Response.json({
        imie: o.imie, mozna: { plany: o.plany, miejsca: o.miejsca, sprawdzony: o.pelne },
        plany: plany.map((p) => ({ slug: p.slug, tytul: p.tytul, geo: p.geo.length >= 2, ...postepPlanu(p, u) })),
        czynnosci: await wpisyZTerenu(plany, o.id, 40),
        miejsca: miejsca.map((m) => ({ id: m.id, czas: m.czas, rodzaj: m.rodzaj, nazwa: m.nazwa, zdjec: m.zdjecia.length, stan: m.stan })),
    }, { headers: { 'Cache-Control': 'no-store' } })
}

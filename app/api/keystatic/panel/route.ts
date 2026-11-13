import { brakDostepu } from '@/lib/plany/dane'
import { indeksPanelu, kosz, plikiOmeka, plikOmeka, podsumowanie, postepPlanow, przywrocZKosza, stanSerwera, usunZKosza } from '@/lib/panel/dane'

// Panel administracyjny: ?czesc=pulpit (domyślnie) | indeks | system | omeka&plik=…; POST – kosz (przywróć / usuń na stałe).
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const q = new URL(req.url).searchParams
    const czesc = q.get('czesc') ?? 'pulpit'
    if (czesc === 'indeks') return Response.json(await indeksPanelu(), { headers: { 'Cache-Control': 'no-store' } })
    if (czesc === 'system') {
        const [serwer, k, omeka, plany] = await Promise.all([stanSerwera(), kosz(), plikiOmeka(), postepPlanow()])
        return Response.json({ serwer, kosz: k, omeka, plany: plany.map((p) => ({ slug: p.slug, tytul: p.tytul })) }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (czesc === 'omeka') {
        const nazwa = q.get('plik') ?? ''
        const dane = await plikOmeka(nazwa)
        if (!dane) return new Response('Nie ma takiego pliku', { status: 404 })
        return new Response(new Uint8Array(dane), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="omeka-${nazwa}"`, 'Cache-Control': 'no-store' } })
    }
    return Response.json(await podsumowanie(), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = (await req.json().catch(() => null)) as { akcja?: string; rodzaj?: string; plik?: string } | null
    if (!d?.rodzaj || !d.plik) return Response.json({ blad: 'złe dane' }, { status: 400 })
    const blad = d.akcja === 'przywroc' ? await przywrocZKosza(d.rodzaj, d.plik) : d.akcja === 'usun' ? await usunZKosza(d.rodzaj, d.plik) : 'nieznana akcja'
    return blad ? Response.json({ blad }, { status: 400 }) : Response.json({ ok: true })
}

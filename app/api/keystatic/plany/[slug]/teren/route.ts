import { brakDostepu, wczytajPlan, wczytajUstawienia, zapiszObraz } from '@/lib/plany/dane'
import { odczytajCzynnosc, planDlaTerenu } from '@/lib/teren/czynnosci'
import { ktoWTerenie, osobaWTerenie, wykonajCzynnosc } from '@/lib/teren/serwer'

// P7b (TER-01): plan przygotowany do pracy w terenie (GET) i pojedyncze czynności na grobie (POST): zdjęcie, napis, notatka,
// „sprawdzony”. Zamiast zapisu całego planu – serwer nakłada czynność na aktualny plan (lib/teren/czynnosci.ts).
export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string }> }
const odmowa = () => Response.json({ blad: 'Ten plan nie jest przydzielony twojemu kontu.' }, { status: 403 })

export async function GET(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const slug = (await params).slug, o = osobaWTerenie(req)
    if (!o?.naPlanie(slug)) return odmowa()
    const [plan, u] = await Promise.all([wczytajPlan(slug), wczytajUstawienia()])
    if (!plan) return Response.json({ blad: 'Nie ma takiego planu.' }, { status: 404 })
    return Response.json({ plan: planDlaTerenu(plan, o.pelne, o.poziom, u), ustawienia: u, sprawdzony: o.pelne }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const slug = (await params).slug, o = osobaWTerenie(req)
    if (!o?.naPlanie(slug)) return odmowa()
    let dane: Record<string, unknown>
    if ((req.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
        // zdjęcie: plik + pola czynności; obraz przechodzi tę samą drogę co w edytorze (2400 px, bez EXIF i GPS)
        const f = await req.formData().catch(() => null), plik = f?.get('plik')
        if (!f || !(plik instanceof File)) return Response.json({ blad: 'Brak pliku zdjęcia.' }, { status: 400 })
        if (plik.size > 40 * 1024 * 1024) return Response.json({ blad: 'Zdjęcie jest za duże (najwyżej 40 MB).' }, { status: 413 })
        const pola = Object.fromEntries([...f.entries()].filter(([, v]) => typeof v === 'string')) as Record<string, string>
        const wstepnie = odczytajCzynnosc({ ...pola, rodzaj: 'zdjecie', plik: 'x.jpg' })
        if (typeof wstepnie === 'string') return Response.json({ blad: wstepnie }, { status: 400 })
        if (!(await wczytajPlan(slug))) return Response.json({ blad: 'Nie ma takiego planu.' }, { status: 404 })
        try {
            const z = await zapiszObraz(slug, Buffer.from(await plik.arrayBuffer()), plik.name || 'zdjecie.jpg', 'zdjecie', 2400)
            dane = { ...pola, rodzaj: 'zdjecie', plik: z.plik, lat: pola.lat ? Number(pola.lat) : undefined, lon: pola.lon ? Number(pola.lon) : undefined }
        } catch (e) { return Response.json({ blad: e instanceof Error ? e.message : 'Nie udało się zapisać zdjęcia.' }, { status: 400 }) }
    } else dane = await req.json().catch(() => ({}))
    const cz = odczytajCzynnosc(dane)
    if (typeof cz === 'string') return Response.json({ blad: cz }, { status: 400 })
    const w = await wykonajCzynnosc(slug, cz, ktoWTerenie(o))
    if ('blad' in w) return Response.json({ blad: w.blad }, { status: w.status })
    return Response.json(w)
}

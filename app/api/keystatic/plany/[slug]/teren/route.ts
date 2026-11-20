import { brakDostepu, usunPlik, wczytajPlan, wczytajUstawienia, zapiszObraz } from '@/lib/plany/dane'
import { odczytajCzynnosc, planDlaTerenu } from '@/lib/teren/czynnosci'
import { czynnoscWDzienniku, ktoWTerenie, osobaWTerenie, planUkrytyWTerenie, plikiDoPobrania, wykonajCzynnosc } from '@/lib/teren/serwer'
import { planBezTylkoJa } from '@/lib/plany/tylko-ja'

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
    // P7c (KON-08): elementy „tylko ja” – tylko dla konta z rolą administratora (poziom „ja”); plan – lib/teren/serwer.ts planUkrytyWTerenie
    if (!plan || planUkrytyWTerenie(o, plan)) return Response.json({ blad: 'Nie ma takiego planu.' }, { status: 404 })
    const pt = planDlaTerenu(o.poziom === 'ja' ? plan : planBezTylkoJa(plan), o.pelne, o.poziom, u)
    // P7b-2: konto (dane w telefonie przypisane do konta) i pliki do pobrania przed pracą bez internetu
    return Response.json({ plan: pt, ustawienia: u, sprawdzony: o.pelne, konto: o.id || 'redakcja', imie: o.imie, pliki: await plikiDoPobrania(slug, pt, u) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const slug = (await params).slug, o = osobaWTerenie(req)
    if (!o?.naPlanie(slug)) return odmowa()
    let dane: Record<string, unknown>, nowyPlik = ''
    if ((req.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
        // zdjęcie: plik + pola czynności; obraz przechodzi tę samą drogę co w edytorze (2400 px, bez EXIF i GPS)
        const f = await req.formData().catch(() => null), plik = f?.get('plik')
        if (!f || !(plik instanceof File)) return Response.json({ blad: 'Brak pliku zdjęcia.' }, { status: 400 })
        if (plik.size > 40 * 1024 * 1024) return Response.json({ blad: 'Zdjęcie jest za duże (najwyżej 40 MB).' }, { status: 413 })
        const pola = Object.fromEntries([...f.entries()].filter(([, v]) => typeof v === 'string')) as Record<string, string>
        const wstepnie = odczytajCzynnosc({ ...pola, rodzaj: 'zdjecie', plik: 'x.jpg' })
        if (typeof wstepnie === 'string') return Response.json({ blad: wstepnie }, { status: 400 })
        const plan = await wczytajPlan(slug)
        if (!plan) return Response.json({ blad: 'Nie ma takiego planu.' }, { status: 404 })
        // P7b-2: powtórzona wysyłka z kolejki telefonu (zgubiona odpowiedź) – pierwszy wynik, bez zapisu drugiego pliku
        const byl = await czynnoscWDzienniku(slug, wstepnie.id)
        if (byl) return Response.json({ wpis: byl, wersja: plan.wersja, powtorzona: true })
        try {
            const z = await zapiszObraz(slug, Buffer.from(await plik.arrayBuffer()), plik.name || 'zdjecie.jpg', 'zdjecie', 2400)
            nowyPlik = z.plik
            dane = { ...pola, rodzaj: 'zdjecie', plik: z.plik, lat: pola.lat ? Number(pola.lat) : undefined, lon: pola.lon ? Number(pola.lon) : undefined }
        } catch (e) { return Response.json({ blad: e instanceof Error ? e.message : 'Nie udało się zapisać zdjęcia.' }, { status: 400 }) }
    } else dane = await req.json().catch(() => ({}))
    const cz = odczytajCzynnosc(dane)
    if (typeof cz === 'string') { if (nowyPlik) await usunPlik(slug, nowyPlik).catch(() => {}); return Response.json({ blad: cz }, { status: 400 }) }
    if (o.poziom !== 'ja') {
        const p = await wczytajPlan(slug)
        if (!p || planUkrytyWTerenie(o, p) || p.elementy.some((e) => e.id === cz.grob && e.widocznosc === 'ja')) {
            if (nowyPlik) await usunPlik(slug, nowyPlik).catch(() => {})
            return Response.json({ blad: 'Tego grobu albo planu nie ma już na serwerze.' }, { status: 404 })
        }
    }
    const w = await wykonajCzynnosc(slug, cz, ktoWTerenie(o))
    // dwie wysyłki tej samej czynności naraz: plik drugiej nie jest nigdzie użyty – do kosza (nie obok w katalogu planu)
    if (nowyPlik && ('blad' in w || w.powtorzona || w.wpis.wynik !== 'zapisano' || w.wpis.plik !== nowyPlik)) await usunPlik(slug, nowyPlik).catch(() => {})
    if ('blad' in w) return Response.json({ blad: w.blad }, { status: w.status })
    return Response.json(w)
}

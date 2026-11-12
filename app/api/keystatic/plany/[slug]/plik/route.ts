import { brakDostepu, usunPlik, wczytajPlan, zapiszObraz } from '@/lib/plany/dane'

// Wgrywanie podkładu (duże obrazy zmniejszane do 6000 px) albo zdjęcia nagrobka (2400 px, bez danych EXIF).
export const dynamic = 'force-dynamic'
type P = { params: Promise<{ slug: string }> }

export async function POST(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const slug = (await params).slug
    if (!(await wczytajPlan(slug))) return Response.json({ blad: 'nie ma takiego planu' }, { status: 404 })
    const f = await req.formData().catch(() => null)
    const plik = f?.get('plik'), rodzaj = f?.get('rodzaj') === 'zdjecie' ? 'zdjecie' : 'podklad'
    if (!(plik instanceof File)) return Response.json({ blad: 'brak pliku' }, { status: 400 })
    if (plik.size > 190 * 1024 * 1024) return Response.json({ blad: 'Plik jest za duży (najwyżej 190 MB).' }, { status: 413 })
    try {
        const z = await zapiszObraz(slug, Buffer.from(await plik.arrayBuffer()), plik.name, rodzaj, rodzaj === 'zdjecie' ? 2400 : 6000)
        return Response.json(z)
    } catch (e) {
        return Response.json({ blad: e instanceof Error ? e.message : 'nie udało się zapisać' }, { status: 400 })
    }
}

export async function DELETE(req: Request, { params }: P) {
    const b = brakDostepu(req); if (b) return b
    const plik = new URL(req.url).searchParams.get('plik') ?? ''
    await usunPlik((await params).slug, plik)
    return Response.json({ ok: true })
}

import { brakDostepu, wczytajUstawienia, zapiszObraz, zapiszUstawienia } from '@/lib/plany/dane'
import { odczytajSvg } from '@/lib/plany/svg'
import type { UstawieniaPlanow } from '@/lib/plany/typy'

// Ustawienia planów: próg lat, ukryte typy, własne typy (PUT); odczyt znaku własnego typu z pliku SVG/PNG (POST).
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    return Response.json(await wczytajUstawienia())
}

export async function PUT(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = (await req.json().catch(() => null)) as UstawieniaPlanow | null
    if (!d) return Response.json({ blad: 'złe dane' }, { status: 400 })
    const u: UstawieniaPlanow = {
        progLat: Math.max(0, Math.min(150, Math.round(Number(d.progLat) || 0))),
        ukryteTypy: Array.isArray(d.ukryteTypy) ? d.ukryteTypy.filter((t) => typeof t === 'string').slice(0, 500) : [],
        wlasneTypy: Array.isArray(d.wlasneTypy) ? d.wlasneTypy.filter((t) => t && /^wl-[a-z0-9-]+$/.test(t.id)).slice(0, 200) : [],
    }
    await zapiszUstawienia(u)
    return Response.json(u)
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const f = await req.formData().catch(() => null)
    const plik = f?.get('plik')
    if (!(plik instanceof File)) return Response.json({ blad: 'brak pliku' }, { status: 400 })
    if (/\.svg$/i.test(plik.name) || plik.type === 'image/svg+xml') {
        const z = odczytajSvg(await plik.text())
        return z ? Response.json({ svg: z.elementy, svgVb: z.vb }) : Response.json({ blad: 'W pliku SVG nie ma prostych kształtów (ścieżek, kół, linii).' }, { status: 400 })
    }
    try {
        const z = await zapiszObraz('_ikony', Buffer.from(await plik.arrayBuffer()), plik.name, 'ikona', 192)
        return Response.json({ png: z.plik })
    } catch (e) {
        return Response.json({ blad: e instanceof Error ? e.message : 'nie udało się zapisać' }, { status: 400 })
    }
}

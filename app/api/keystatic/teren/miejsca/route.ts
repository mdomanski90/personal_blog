import { brakDostepu } from '@/lib/plany/dane'
import { najblizszaMiejscowosc, odczytajNoweMiejsce, type MiejsceTerenu } from '@/lib/teren/miejsca'
import { listaMiejscTerenu, miejscowosciZPolozeniem, osobaWTerenie, wczytajMiejsceTerenu, zapiszMiejsceTerenu, zapiszZdjecieTerenu } from '@/lib/teren/serwer'

// P7b (TER-01): skrzynka „z terenu”. GET – redakcja (dział „miejsca i obiekty”) widzi wszystkie wpisy, konto terenowe tylko swoje.
// POST – nowe miejsce z telefonu (zdjęcia, położenie, rodzaj, nazwa, notatka); zawsze stan „nowe”, widoczne tylko w panelu.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const o = osobaWTerenie(req)
    if (!o) return Response.json({ blad: 'Brak dostępu.' }, { status: 403 })
    const L = await listaMiejscTerenu()
    return Response.json({ redakcja: o.redakcja, miejsca: o.redakcja ? L : L.filter((m) => m.kto === o.id) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const o = osobaWTerenie(req)
    if (!o?.miejsca) return Response.json({ blad: 'Twoje konto nie zapisuje nowych miejsc.' }, { status: 403 })
    const f = await req.formData().catch(() => null)
    if (!f) return Response.json({ blad: 'Brak danych.' }, { status: 400 })
    const pola = odczytajNoweMiejsce(Object.fromEntries([...f.entries()].filter(([, v]) => typeof v === 'string')))
    if (typeof pola === 'string') return Response.json({ blad: pola }, { status: 400 })
    // ta sama wysyłka drugi raz (zerwane połączenie) – zwracamy pierwszy zapis
    const byl = await wczytajMiejsceTerenu(pola.id)
    if (byl) return byl.kto === o.id ? Response.json({ miejsce: byl, powtorzona: true }) : Response.json({ blad: 'Taki wpis już istnieje.' }, { status: 409 })
    const pliki = f.getAll('zdjecie').filter((x): x is File => x instanceof File && x.size > 0).slice(0, 6)
    if (!pliki.length && !pola.nazwa) return Response.json({ blad: 'Dodaj zdjęcie albo wpisz nazwę.' }, { status: 422 })
    if (pliki.some((p) => p.size > 40 * 1024 * 1024)) return Response.json({ blad: 'Zdjęcie jest za duże (najwyżej 40 MB).' }, { status: 413 })
    const zdjecia: MiejsceTerenu['zdjecia'] = []
    try {
        for (const [i, p] of pliki.entries()) zdjecia.push(await zapiszZdjecieTerenu(pola.id, Buffer.from(await p.arrayBuffer()), i + 1))
    } catch { return Response.json({ blad: 'Nie udało się odczytać zdjęcia – spróbuj zrobić je jeszcze raz.' }, { status: 400 }) }
    const blisko = pola.lat !== undefined && pola.lon !== undefined ? najblizszaMiejscowosc(pola.lat, pola.lon, await miejscowosciZPolozeniem().catch(() => [])) : undefined
    const miejsce: MiejsceTerenu = { ...pola, czas: new Date().toISOString(), kto: o.id, imie: o.imie, zdjecia, stan: 'nowe', ...(blisko ? { blisko } : {}) }
    await zapiszMiejsceTerenu(miejsce)
    return Response.json({ miejsce })
}

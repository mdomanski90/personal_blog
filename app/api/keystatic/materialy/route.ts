import { brakDostepu } from '@/lib/plany/dane'
import { materialy } from '@/lib/archiwum'
import { stronyMaterialu } from '@/lib/strony-materialow'

// Lista materiałów do panelu „strony materiałów”.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const L = await materialy('ja')
    return Response.json(L.map((m) => ({ id: m.id, nazwa: m.nazwa, rodzaj: m.rodzaj, czas: m.czas, widocznosc: m.widocznosc, plik: m.plik, strony: stronyMaterialu(m.id).length })))
}

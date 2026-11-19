import fs from 'node:fs/promises'
import path from 'node:path'
import { brakDostepu } from '@/lib/plany/dane'
import { materialy } from '@/lib/archiwum'
import { stronyMaterialu } from '@/lib/strony-materialow'

// Lista materiałów do panelu „strony materiałów” i do okna wyboru materiału w edytorze (P6b, PD-20):
// `podglad` – miniatura (pierwsza strona skanu z panelu, inaczej sam plik-obraz), `zmieniono` – czas zmiany opisu (5 ostatnich).
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const L = await materialy('ja')
    const kat = path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', 'materialy')
    const wyn = await Promise.all(L.map(async (m) => {
        const strony = stronyMaterialu(m.id)
        const zmieniono = await fs.stat(path.join(/*turbopackIgnore: true*/ kat, `${m.id}.mdoc`)).then((s) => s.mtime.toISOString(), () => null)
        const podglad = strony[0] ? `/api/keystatic/materialy/${encodeURIComponent(m.id)}/strony?podglad=${encodeURIComponent(strony[0].plik)}` : (m.strony[0]?.adres ?? null)
        return { id: m.id, nazwa: m.nazwa, rodzaj: m.rodzaj, czas: m.czas, widocznosc: m.widocznosc, plik: m.plik, strony: strony.length, podglad, zmieniono }
    }))
    return Response.json(wyn, { headers: { 'Cache-Control': 'no-store' } })
}

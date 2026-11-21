import fs from 'node:fs/promises'
import path from 'node:path'
import { brakDostepu } from '@/lib/plany/dane'
import { poziomPanelu } from '@/lib/konta/straz'
import { materialy } from '@/lib/archiwum'
import { stronyMaterialu } from '@/lib/strony-materialow'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'

// Lista materiałów do panelu „strony materiałów” i do okna wyboru materiału w edytorze (P6b, PD-20):
// `podglad` – miniatura (pierwsza strona skanu z panelu, inaczej sam plik-obraz), `zmieniono` – czas zmiany opisu (5 ostatnich).
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const L = await materialy(poziomPanelu(req)) // P7c (KON-08): „tylko ja” – tylko dla roli administratora
    const kat = path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', 'materialy')
    const wyn = await Promise.all(L.map(async (m) => {
        const strony = stronyMaterialu(m.id)
        const zmieniono = await fs.stat(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ kat, `${m.id}.mdoc`)).then((s) => s.mtime.toISOString(), () => null)
        const podglad = strony[0] ? `/api/keystatic/materialy/${encodeURIComponent(m.id)}/strony?podglad=${encodeURIComponent(strony[0].plik)}` : (m.strony[0]?.adres ?? null)
        return { id: m.id, nazwa: m.nazwa, rodzaj: m.rodzaj, rodzajNazwa: (RODZAJE_MATERIALOW as Record<string, string>)[m.rodzaj] ?? m.rodzaj, czas: m.czas, widocznosc: m.widocznosc, plik: m.plik, strony: strony.length, podglad, zmieniono }
    }))
    return Response.json(wyn, { headers: { 'Cache-Control': 'no-store' } })
}

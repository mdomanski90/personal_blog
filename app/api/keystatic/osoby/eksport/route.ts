import { brakDostepu } from '@/lib/plany/dane'
import { eksportujGedcom } from '@/lib/osoby/gedcom'
import { stanOsob } from '@/lib/osoby/dane'
import { miejscaDoDopasowania } from '@/lib/osoby/serwer'

// Eksport całego drzewa do GEDCOM 5.5.1 (np. do Ancestry). ?zyjace=ukryte – osoby żyjące bez danych.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const zyjace = new URL(req.url).searchParams.get('zyjace') === 'pelne' ? 'pelne' : 'ukryte'
    const s = await stanOsob()
    const nazwy = new Map((await miejscaDoDopasowania()).map((m) => [m.id, m.nazwa]))
    const tekst = eksportujGedcom(s.drzewo, { zyjace, zyje: s.zyje, nazwaMiejsca: (id) => nazwy.get(id) })
    const data = new Date().toISOString().slice(0, 10)
    return new Response(tekst, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="odniepamieci-drzewo-${data}${zyjace === 'ukryte' ? '-bez-zyjacych' : ''}.ged"`, 'Cache-Control': 'no-store' } })
}

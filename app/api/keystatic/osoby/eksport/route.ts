import { brakDostepu } from '@/lib/plany/dane'
import { eksportujGedcom } from '@/lib/osoby/gedcom'
import { stanOsob } from '@/lib/osoby/dane'
import { wycinekRodziny } from '@/lib/osoby/model'
import { miejscaDoDopasowania } from '@/lib/osoby/serwer'

// Eksport drzewa do GEDCOM 5.5.1 (np. do Ancestry). ?zyjace=ukryte – osoby żyjące bez danych;
// ?rodzina=<id osoby> – tylko krewni tej osoby i ich małżonkowie („tylko moja rodzina”).
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const q = new URL(req.url).searchParams
    const zyjace = q.get('zyjace') === 'pelne' ? 'pelne' : 'ukryte'
    const s = await stanOsob()
    const rodzina = q.get('rodzina')
    if (rodzina && !s.drzewo.osoby.has(rodzina)) return new Response('Nie ma takiej osoby', { status: 404 })
    const drzewo = rodzina ? wycinekRodziny(s.drzewo, rodzina) : s.drzewo
    const nazwy = new Map((await miejscaDoDopasowania()).map((m) => [m.id, m.nazwa]))
    const tekst = eksportujGedcom(drzewo, { zyjace, zyje: s.zyje, nazwaMiejsca: (id) => nazwy.get(id) })
    const data = new Date().toISOString().slice(0, 10)
    const nazwa = `odniepamieci-${rodzina ? `rodzina-${rodzina}` : 'drzewo'}-${data}${zyjace === 'ukryte' ? '-bez-zyjacych' : ''}.ged`
    return new Response(tekst, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${nazwa}"`, 'Cache-Control': 'no-store' } })
}

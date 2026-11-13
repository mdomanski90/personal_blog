import { brakDostepu } from '@/lib/plany/dane'
import { stanOsob } from '@/lib/osoby/dane'
import { lataZycia, nazwaOsoby } from '@/lib/osoby/model'
import { zalozBiogram } from '@/lib/osoby/biogramy'

// „napisz biogram →” w panelu osoby: zakłada plik biogramu (jeśli go nie ma) i zwraca adres edycji w Keystatic.
export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const b = brakDostepu(req); if (b) return b
    const { id } = await params
    const o = (await stanOsob()).drzewo.osoby.get(id)
    if (!o) return Response.json({ blad: 'Nie ma takiej osoby.' }, { status: 404 })
    const lata = lataZycia(o)
    return Response.json({ adres: await zalozBiogram(id, `${nazwaOsoby(o)}${lata ? ` (${lata})` : ''}`) })
}

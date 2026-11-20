import { brakDostepu } from '@/lib/plany/dane'
import { listaZgloszenStrony, usunZgloszenieStrony } from '@/lib/zgloszenia'
import { widziTylkoJaZadanie } from '@/lib/konta/straz'
import { zgloszeniaPanelu, zgloszenieWidoczne } from '@/lib/panel/dane'

// Zgłoszenia czytelników ze stron (poprawki, nowe miejsca, materiały) – tylko w panelu.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    // P7c (KON-08): bez zgłoszeń o pozycjach „tylko ja” dla konta bez roli administratora
    if (widziTylkoJaZadanie(req)) return Response.json(await listaZgloszenStrony())
    const widoczne = new Set((await zgloszeniaPanelu(false)).filter((z) => z.zrodlo === 'strona').map((z) => z.id))
    return Response.json((await listaZgloszenStrony()).filter((z) => widoczne.has(z.id)))
}

export async function DELETE(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const id = new URL(req.url).searchParams.get('id') ?? ''
    if (!(await zgloszenieWidoczne('strona', id, widziTylkoJaZadanie(req)))) return Response.json({ blad: 'Nie ma takiego zgłoszenia.' }, { status: 404 })
    await usunZgloszenieStrony(id)
    return Response.json({ ok: true })
}

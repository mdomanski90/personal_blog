import { brakDostepu } from '@/lib/plany/dane'
import { listaZgloszenStrony, usunZgloszenieStrony } from '@/lib/zgloszenia'

// Zgłoszenia czytelników ze stron (poprawki, nowe miejsca, materiały) – tylko w panelu.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    return Response.json(await listaZgloszenStrony())
}

export async function DELETE(req: Request) {
    const b = brakDostepu(req); if (b) return b
    await usunZgloszenieStrony(new URL(req.url).searchParams.get('id') ?? '')
    return Response.json({ ok: true })
}

import { brakDostepu, listaZgloszen } from '@/lib/plany/dane'
import { usunZgloszeniePanelu } from '@/lib/panel/dane'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    return Response.json(await listaZgloszen())
}

export async function DELETE(req: Request) {
    const b = brakDostepu(req); if (b) return b
    // P6a: do kosza treści, jak w panelu zgłoszeń (zasada 2.5)
    const blad = await usunZgloszeniePanelu('plan', new URL(req.url).searchParams.get('id') ?? '')
    return blad ? Response.json({ blad }, { status: 400 }) : Response.json({ ok: true })
}

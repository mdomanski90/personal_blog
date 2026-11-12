import { brakDostepu, listaZgloszen, usunZgloszenie } from '@/lib/plany/dane'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    return Response.json(await listaZgloszen())
}

export async function DELETE(req: Request) {
    const b = brakDostepu(req); if (b) return b
    await usunZgloszenie(new URL(req.url).searchParams.get('id') ?? '')
    return Response.json({ ok: true })
}

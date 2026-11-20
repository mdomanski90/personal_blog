import { brakDostepu, listaZgloszen } from '@/lib/plany/dane'
import { usunZgloszeniePanelu, zgloszeniaPanelu, zgloszenieWidoczne } from '@/lib/panel/dane'
import { widziTylkoJaZadanie } from '@/lib/konta/straz'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    // P7c (KON-08): bez zgłoszeń o planach i grobach „tylko ja” dla konta bez roli administratora
    if (widziTylkoJaZadanie(req)) return Response.json(await listaZgloszen())
    const widoczne = new Set((await zgloszeniaPanelu(false)).filter((z) => z.zrodlo === 'plan').map((z) => z.id))
    return Response.json((await listaZgloszen()).filter((z) => widoczne.has(z.id)))
}

export async function DELETE(req: Request) {
    const b = brakDostepu(req); if (b) return b
    // P6a: do kosza treści, jak w panelu zgłoszeń (zasada 2.5)
    const id = new URL(req.url).searchParams.get('id') ?? ''
    if (!(await zgloszenieWidoczne('plan', id, widziTylkoJaZadanie(req)))) return Response.json({ blad: 'Nie ma takiego zgłoszenia.' }, { status: 404 })
    const blad = await usunZgloszeniePanelu('plan', id)
    return blad ? Response.json({ blad }, { status: 400 }) : Response.json({ ok: true })
}

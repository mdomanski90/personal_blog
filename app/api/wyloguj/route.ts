import { adresPowrotu, CIASTECZKO, CIASTECZKO_UI } from '@/lib/sesja'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    const dane = await req.formData().catch(() => null)
    const h = new Headers({ Location: adresPowrotu(dane?.get('wroc')), 'Cache-Control': 'no-store' })
    h.append('Set-Cookie', `${CIASTECZKO}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`)
    h.append('Set-Cookie', `${CIASTECZKO_UI}=; Path=/; Max-Age=0; SameSite=Lax`)
    return new Response(null, { status: 303, headers: h })
}

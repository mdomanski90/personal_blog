import { cssAkcentu, wczytajAkcent } from '@/lib/panel/wyglad'
export const dynamic = 'force-dynamic'
export async function GET() {
    return new Response(cssAkcentu(await wczytajAkcent()), {
        headers: {
            'Content-Type': 'text/css; charset=utf-8',
            'Cache-Control': 'private, no-store, max-age=0',
            'X-Content-Type-Options': 'nosniff',
        },
    })
}

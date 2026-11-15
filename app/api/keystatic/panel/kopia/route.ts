import { Readable } from 'node:stream'
import { brakDostepu } from '@/lib/plany/dane'
import { commit } from '@/lib/panel/dane'
import { kopieNaSerwerze, ustawKatalog, utworzKopie, wczytajZnacznik, zapiszNaSerwerze } from '@/lib/panel/kopia'

// Etap 0A: kopia zapasowa z panelu.
// GET ?tryb=stan – znacznik i lista kopii na serwerze; GET ?tryb=pobierz – archiwum .tar.gz do przeglądarki (kopia poza serwerem).
// POST {akcja:'katalog', katalog} – ustawia katalog kopii na serwerze; POST {akcja:'serwer'} – zapisuje kopię w tym katalogu.
export const dynamic = 'force-dynamic'
export const maxDuration = 3600

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const tryb = new URL(req.url).searchParams.get('tryb')
    if (tryb === 'pobierz') {
        const s = await utworzKopie('komputer', { commit: await commit() })
        if (typeof s === 'string') return new Response(s, { status: 409 })
        void s.koniec // znacznik zapisuje się po zakończeniu tar
        return new Response(Readable.toWeb(s.strumien) as ReadableStream, {
            headers: {
                'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="${s.nazwa}"`,
                'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no',
            },
        })
    }
    const [znacznik, pliki] = await Promise.all([wczytajZnacznik(), kopieNaSerwerze()])
    return Response.json({ znacznik, pliki }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    if (req.headers.get('sec-fetch-site') === 'cross-site') return Response.json({ blad: 'Zabronione' }, { status: 403 })
    const d = (await req.json().catch(() => null)) as { akcja?: string; katalog?: string } | null
    if (d?.akcja === 'katalog') {
        const blad = await ustawKatalog(String(d.katalog ?? '').trim())
        return blad ? Response.json({ blad }, { status: 400 }) : Response.json({ ok: true })
    }
    if (d?.akcja === 'serwer') {
        const w = await zapiszNaSerwerze({ commit: await commit() })
        return typeof w === 'string' ? Response.json({ blad: w }, { status: 400 }) : Response.json(w)
    }
    return Response.json({ blad: 'nieznana akcja' }, { status: 400 })
}

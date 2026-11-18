import { brakDostepu } from '@/lib/plany/dane'
import { koszRodzaju, osHistorii, przywrocSprzedOperacji, przywrocWersje, relTresci, trescBiezaca } from '@/lib/panel/historia'
import { etykietyPol, kontrolaCzytnikiem, opisPlikuZTytulem, plikDlaAdresu } from '@/lib/panel/historia-adresy'
import { poZapisieTresci } from '@/lib/katalog/dane'

// P6a wg plansz (funkcja 4): szuflada „historia” w edycji wpisu.
// GET ?adres=/keystatic/collection/<k>/item/<slug> | ?plik=<ścieżka w content/> – oś historii (zapisy Keystatic i operacje,
// pole po polu) + kosz tego rodzaju treści; POST {plik, wersja} albo {plik, operacja} – „przywróć poprzednią” (operacja do cofnięcia).
export const dynamic = 'force-dynamic'
const BEZ_CACHE = { 'Cache-Control': 'private, no-store' }

function plikZ(q: URLSearchParams): string | null {
    const p = q.get('plik') ?? (q.get('adres') ? plikDlaAdresu(q.get('adres')!) : null)
    return p && relTresci(`content/${p}`) ? p : null
}

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const plik = plikZ(new URL(req.url).searchParams)
    if (!plik) return Response.json({ blad: 'Historia dotyczy wpisów i ustawień Keystatic.' }, { status: 404, headers: BEZ_CACHE })
    const [o, wpisy, kosz, teraz] = await Promise.all([opisPlikuZTytulem(process.cwd(), plik), osHistorii(plik, etykietyPol(plik)), koszRodzaju(plik), trescBiezaca(plik)])
    return Response.json({ plik, nazwa: o.nazwa, edycja: o.edycja, istnieje: teraz !== null, wpisy, kosz }, { headers: BEZ_CACHE })
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = (await req.json().catch(() => null)) as { plik?: unknown; wersja?: unknown; operacja?: unknown } | null
    if (typeof d?.plik !== 'string' || !relTresci(`content/${d.plik}`) || (typeof d.wersja !== 'string' && typeof d.operacja !== 'string'))
        return Response.json({ blad: 'złe dane' }, { status: 400, headers: BEZ_CACHE })
    try {
        const sprawdz = kontrolaCzytnikiem(process.cwd(), [d.plik])
        const w = typeof d.wersja === 'string' ? await przywrocWersje(d.plik, d.wersja, { sprawdz }) : await przywrocSprzedOperacji(d.plik, d.operacja as string, { sprawdz })
        await poZapisieTresci()
        return Response.json({ ok: true, operacja: w.id }, { headers: BEZ_CACHE })
    } catch (e) {
        return Response.json({ blad: e instanceof Error ? e.message : String(e) }, { status: 409, headers: BEZ_CACHE })
    }
}

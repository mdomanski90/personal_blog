import { brakDostepu } from '@/lib/plany/dane'
import { listaWersji, przywrocWersje, relTresci, roznica, trescBiezaca, trescWersji } from '@/lib/panel/historia'
import { kontrolaCzytnikiem, opisPlikuZTytulem, plikDlaAdresu } from '@/lib/panel/historia-adresy'
import { poZapisieTresci } from '@/lib/katalog/dane'

// P6a (PNL-10): historia wersji pliku treści.
// GET ?adres=/keystatic/collection/<k>/item/<slug> | ?plik=<ścieżka w content/> – lista wersji;
// GET …&wersja=<id> – co zmieni przywrócenie (różnica bieżąca → wersja); POST {plik, wersja} – przywróć (operacja do cofnięcia).
export const dynamic = 'force-dynamic'
const BEZ_CACHE = { 'Cache-Control': 'private, no-store' }

function plikZ(q: URLSearchParams): string | null {
    const p = q.get('plik') ?? (q.get('adres') ? plikDlaAdresu(q.get('adres')!) : null)
    return p && relTresci(`content/${p}`) ? p : null
}

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const q = new URL(req.url).searchParams
    const plik = plikZ(q)
    if (!plik) return Response.json({ blad: 'Ta strona panelu nie ma historii (historia dotyczy wpisów i ustawień Keystatic).' }, { status: 404, headers: BEZ_CACHE })
    const wersja = q.get('wersja')
    if (wersja) {
        const [stara, teraz] = await Promise.all([trescWersji(plik, wersja), trescBiezaca(plik)])
        if (stara === null) return Response.json({ blad: 'Nie ma takiej wersji.' }, { status: 404, headers: BEZ_CACHE })
        return Response.json({ roznica: roznica(teraz ?? '', stara), bezZmian: stara === teraz, usuniety: teraz === null }, { headers: BEZ_CACHE })
    }
    const o = await opisPlikuZTytulem(process.cwd(), plik)
    return Response.json({ plik, nazwa: o.nazwa, edycja: o.edycja, istnieje: (await trescBiezaca(plik)) !== null, wersje: await listaWersji(plik) }, { headers: BEZ_CACHE })
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = (await req.json().catch(() => null)) as { plik?: unknown; wersja?: unknown } | null
    if (typeof d?.plik !== 'string' || typeof d.wersja !== 'string' || !relTresci(`content/${d.plik}`)) return Response.json({ blad: 'złe dane' }, { status: 400, headers: BEZ_CACHE })
    try {
        const w = await przywrocWersje(d.plik, d.wersja, { sprawdz: kontrolaCzytnikiem(process.cwd(), [d.plik]) })
        await poZapisieTresci()
        return Response.json({ ok: true, operacja: w.id }, { headers: BEZ_CACHE })
    } catch (e) {
        return Response.json({ blad: e instanceof Error ? e.message : String(e) }, { status: 409, headers: BEZ_CACHE })
    }
}

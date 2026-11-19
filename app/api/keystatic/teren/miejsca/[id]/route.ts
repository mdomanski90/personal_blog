import { brakDostepu } from '@/lib/plany/dane'
import { brakUprawnienia } from '@/lib/konta/straz'
import type { MiejsceTerenu, StanMiejsca } from '@/lib/teren/miejsca'
import { osobaWTerenie, usunMiejsceTerenu, wczytajMiejsceTerenu, zapiszMiejsceTerenu } from '@/lib/teren/serwer'

// P7b (TER-01): redakcja skrzynki „z terenu” – opracowane (z dopiskiem, co powstało), odrzucone, z powrotem do nowych, usuń na stałe.
export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const b = brakDostepu(req); if (b) return b
    const o = osobaWTerenie(req), m = await wczytajMiejsceTerenu((await params).id)
    if (!o?.redakcja) return Response.json({ blad: 'Brak dostępu.' }, { status: 403 })
    if (!m) return Response.json({ blad: 'Nie ma takiego wpisu.' }, { status: 404 })
    const d = (await req.json().catch(() => ({}))) as { akcja?: string; opis?: string }
    if (d.akcja === 'usun') {
        const bu = brakUprawnienia(req, 'miejsca', 'usuwanie'); if (bu) return bu
        await usunMiejsceTerenu(m.id)
        return Response.json({ ok: true })
    }
    const stan: StanMiejsca | null = d.akcja === 'opracowane' ? 'opracowane' : d.akcja === 'odrzuc' ? 'odrzucone' : d.akcja === 'przywroc' ? 'nowe' : null
    if (!stan) return Response.json({ blad: 'Nieznana akcja.' }, { status: 400 })
    const opis = typeof d.opis === 'string' ? d.opis.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 300) : ''
    const { opis: _o, rozstrzygnal: _r, rozstrzygnieto: _c, ...reszta } = m
    const nowy: MiejsceTerenu = stan === 'nowe' ? { ...reszta, stan } : { ...reszta, stan, ...(opis ? { opis } : {}), rozstrzygnal: o.id || 'redakcja', rozstrzygnieto: new Date().toISOString() }
    await zapiszMiejsceTerenu(nowy)
    return Response.json({ miejsce: nowy })
}

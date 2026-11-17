import { NextResponse } from 'next/server'
import { poziomCzytelnika, szukaj, type RodzajWyniku } from '@/lib/archiwum'
import { LIMIT_PODPOWIEDZI, wybierzPodpowiedzi } from '@/lib/podpowiedzi'

// Podpowiedzi do wyszukiwarki w nagłówku (po 2 literach). SRCH-D-21 (P3): do 8 pozycji (klient podaje 5 na wąskim ekranie) –
// najpierw najwyżej 2 z rodzaju w stałej kolejności, potem dopełnienie (lib/podpowiedzi.ts). Te same zasady widoczności co na /szukaj.

export const dynamic = 'force-dynamic'

const KOLEJNOSC: RodzajWyniku[] = ['miejsce', 'osoba', 'wpis', 'materiał', 'publikacja', 'zbiór', 'księga', 'parafia' /* PACZKA5_2026 */, 'hasło', 'obiekt', 'temat', 'objaśnienie']

export async function GET(req: Request) {
    const u = new URL(req.url).searchParams
    const q = (u.get('q') ?? '').slice(0, 100).trim()
    if (q.length < 2) return NextResponse.json({ q, wyniki: [], razem: 0 })
    const wszystkie = await szukaj(q, await poziomCzytelnika())
    const wyniki = wybierzPodpowiedzi(wszystkie, KOLEJNOSC, LIMIT_PODPOWIEDZI(u.get('limit')))
        .map((w) => ({ rodzaj: w.rodzaj, etykieta: w.etykieta, tytul: w.tytul, adres: w.adres, ...(w.przez ? { dopisek: `powiązane z: ${w.przez}` } : {}) }))
    return NextResponse.json({ q, wyniki, razem: wszystkie.length }, { headers: { 'Cache-Control': 'private, max-age=30' } })
}

import { NextResponse } from 'next/server'
import { poziomCzytelnika, szukaj, type RodzajWyniku } from '@/lib/archiwum'

// Podpowiedzi do wyszukiwarki w nagłówku (po 2 literach): kilka najlepszych wyników, najwyżej 2 z jednego rodzaju,
// w stałej kolejności rodzajów. Te same zasady widoczności co na /szukaj (osoby tylko widoczne dla czytelnika).

export const dynamic = 'force-dynamic'

const KOLEJNOSC: RodzajWyniku[] = ['miejsce', 'osoba', 'wpis', 'materiał', 'obiekt', 'temat']
const NA_RODZAJ = 2
const RAZEM = 7

export async function GET(req: Request) {
    const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 100).trim()
    if (q.length < 2) return NextResponse.json({ q, wyniki: [], razem: 0 })
    const wszystkie = await szukaj(q, await poziomCzytelnika())
    const wyniki: { rodzaj: RodzajWyniku; etykieta: string; tytul: string; adres: string; dopisek?: string }[] = []
    for (const r of KOLEJNOSC) {
        for (const w of wszystkie.filter((x) => x.rodzaj === r).slice(0, NA_RODZAJ)) {
            if (wyniki.length < RAZEM) wyniki.push({ rodzaj: w.rodzaj, etykieta: w.etykieta, tytul: w.tytul, adres: w.adres, ...(w.przez ? { dopisek: `powiązane z: ${w.przez}` } : {}) })
        }
    }
    return NextResponse.json({ q, wyniki, razem: wszystkie.length }, { headers: { 'Cache-Control': 'private, max-age=30' } })
}

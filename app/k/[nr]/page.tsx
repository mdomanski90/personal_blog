import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { poziomCzytelnika } from '@/lib/archiwum'
import { parsujNr } from '@/lib/katalog/model'
import { adresNumeru } from '@/lib/katalog/widocznosc'

// KAT-03: krótki, stały adres /k/MA-0042 → 308 na adres kanoniczny (przeżywa zmianę sluga). Pozycja niewidoczna
// dla czytelnika albo nieznany numer – zwykłe 404 (bez zdradzania, że numer istnieje).
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false } }

export default async function KrotkiAdres({ params }: { params: Promise<{ nr: string }> }) {
    const nr = parsujNr(decodeURIComponent((await params).nr))
    if (!nr) notFound()
    const adres = await adresNumeru(nr, await poziomCzytelnika())
    if (!adres) notFound()
    permanentRedirect(adres)
}

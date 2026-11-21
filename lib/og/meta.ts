// Łatka 21.11 (podgląd linku): tytuł i opis karty dla komunikatorów (og:/twitter:) – opis z początku opisu karty (opisOg),
// bez opisu – zostaje zdanie o serwisie z app/layout.tsx. Obrazek dokłada konwencja plików opengraph-image.tsx.
import type { Metadata } from 'next'
import { opisOg } from './opis'

export function metaKarty(tytulStrony: string, nazwa: string, opis?: string | null): Metadata {
    const d = opisOg(opis)
    return {
        title: tytulStrony,
        ...(d ? { description: d } : {}),
        openGraph: { siteName: 'odniepamieci.pl', locale: 'pl_PL', type: 'article', title: nazwa, ...(d ? { description: d } : {}) },
        twitter: { card: 'summary_large_image', title: nazwa, ...(d ? { description: d } : {}) },
    }
}

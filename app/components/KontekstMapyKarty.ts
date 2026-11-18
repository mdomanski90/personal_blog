'use client'

// P4 (MAP-05): mała mapa w nagłówku karty (MapaKarty) udostępnia mapie przełącznik pełnego ekranu – mapa rysuje wtedy własną
// grupę „+ − ⤢” w prawym górnym rogu (zamiast osobnych kontrolek MapLibre i przycisku pod mapą).
import { createContext } from 'react'

export interface MapaKartyKontekst {
    pelny: boolean
    przelacz: () => void
}

export const KontekstMapyKarty = createContext<MapaKartyKontekst | null>(null)

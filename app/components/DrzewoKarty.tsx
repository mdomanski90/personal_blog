'use client'

// DRZ-01 (P3): drzewo w tabeli karty osoby. Przełącznik „pokolenia w górę” (1/2/3) to odnośnik ?wstecz=n – po nawigacji serwer wstawia
// nowe drzewo w to samo miejsce, a wspólna obsługa drzew (DrzewaLinie, raz na stronę) trzymała stary, odłączony element:
// „pełny ekran” przestawał działać. Tu każde nowe drzewo dostaje własną obsługę (przycisk w nagłówku tabeli wiązany od nowa).

import * as React from 'react'
import { przygotuj } from './DrzewaLinie'

export default function DrzewoKarty({ html }: { html: string }) {
    const ref = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
        const fig = ref.current?.querySelector<HTMLElement>('figure.drzewo')
        return fig ? przygotuj(fig) : undefined
    }, [html])
    return <div ref={ref} className="ot-drzewo" data-drzewo-wlasne="" dangerouslySetInnerHTML={{ __html: html }} />
}

'use client'

// Drzewo w tabeli karty osoby (DRZ-01, P3; VIEW-05, P4). Liczba pokoleń i rodzeństwo siedzą w adresie (?wstecz=&naprzod=&rodzenstwo=1):
// przyciski paska zmieniają adres bez przewijania strony, serwer wstawia nowe drzewo w to samo miejsce, a tu każde nowe drzewo
// dostaje własną obsługę (wspólna obsługa drzew – DrzewaLinie, raz na stronę – trzymałaby stary, odłączony element).

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { idCzesci } from '@/lib/spis-karty'
import { zastosujParametryDrzewa, type ParametryDrzewa } from '@/lib/osoby/drzewo-adres'
import { przygotuj } from './DrzewaLinie'

export default function DrzewoKarty({ html }: { html: string }) {
    const ref = React.useRef<HTMLDivElement>(null)
    const router = useRouter()
    React.useEffect(() => {
        const fig = ref.current?.querySelector<HTMLElement>('figure.drzewo')
        if (!fig) return undefined
        const zmien = (p: ParametryDrzewa) => {
            const q = zastosujParametryDrzewa(new URLSearchParams(window.location.search), p).toString()
            // link do karty z hasłem #drzewo otwiera stronę przy drzewie – adres można przesłać dalej
            router.replace(`${window.location.pathname}${q ? `?${q}` : ''}#${window.location.hash.slice(1) || idCzesci('drzewo')}`, { scroll: false })
        }
        return przygotuj(fig, { zmien })
    }, [html, router])
    return <div ref={ref} className="ot-drzewo" data-drzewo-wlasne="" dangerouslySetInnerHTML={{ __html: html }} />
}

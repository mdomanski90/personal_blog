'use client'

// Drzewo w tabeli karty osoby (DRZ-01, P3; VIEW-05, P4). Liczba pokoleń i rodzeństwo siedzą w adresie (?wstecz=&naprzod=&rodzenstwo=1):
// przyciski paska zmieniają adres bez przewijania strony, serwer wstawia nowe drzewo w to samo miejsce, a tu każde nowe drzewo
// dostaje własną obsługę (wspólna obsługa drzew – DrzewaLinie, raz na stronę – trzymałaby stary, odłączony element).

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTransitionRouter } from 'next-view-transitions'
import { idCzesci } from '@/lib/spis-karty'
import { DOMYSLNE_KARTY, zastosujParametryDrzewa, type DomyslnePokolenia, type ParametryDrzewa } from '@/lib/osoby/drzewo-adres'
import { przygotuj } from './DrzewaLinie'

// PK: kliknięcie osoby na drzewie otwiera jej kartę z przejściem strony (View Transitions jak inne odnośniki; przy
// prefers-reduced-motion bez animacji – globals.css). Strona „całe drzewo” ma inne wartości domyślne pokoleń.
export default function DrzewoKarty({ html, domyslne = DOMYSLNE_KARTY }: { html: string; domyslne?: DomyslnePokolenia }) {
    const ref = React.useRef<HTMLDivElement>(null)
    const router = useRouter()
    const przejscie = useTransitionRouter()
    React.useEffect(() => {
        const fig = ref.current?.querySelector<HTMLElement>('figure.drzewo')
        if (!fig) return undefined
        const zmien = (p: ParametryDrzewa) => {
            const q = zastosujParametryDrzewa(new URLSearchParams(window.location.search), p, domyslne).toString()
            // link do karty z hasłem #drzewo otwiera stronę przy drzewie – adres można przesłać dalej
            router.replace(`${window.location.pathname}${q ? `?${q}` : ''}#${window.location.hash.slice(1) || idCzesci('drzewo')}`, { scroll: false })
        }
        return przygotuj(fig, { zmien, otworz: (href) => przejscie.push(href) })
    }, [html, router, przejscie, domyslne])
    return <div ref={ref} className="ot-drzewo" data-drzewo-wlasne="" dangerouslySetInnerHTML={{ __html: html }} />
}

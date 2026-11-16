'use client'

// PH1 · jeden widok dokumentu: rekonstrukcja planu jako warstwa nad skanem w przeglądarce dokumentu (OpenSeadragon).
// Plan rysowany w pikselach strony skanu (odwrotność macierzy podkładu), nakładka OSD na granice obrazu – przesuwa się,
// przybliża i obraca razem ze skanem. Bez przechwytywania kliknięć (objaśnienia i pełny ekran działają jak dotąd).
import * as React from 'react'
import { createPortal } from 'react-dom'
import type OpenSeadragon from 'openseadragon'
import type { Plan } from '@/lib/plany/model'
import { jednostka } from '@/lib/plany/model'
import { katalog, type UstawieniaPlanow } from '@/lib/plany/typy'
import { odwrocMacierz, type PodkladWarstwy } from '@/lib/plany/rekonstrukcja'
import { RysunekPlanu, Wzory } from './Rysunek'

export type TrybWarstw = 'skan' | 'oba' | 'rekonstrukcja'
export interface DaneRekonstrukcji { plan: Plan; podklad: PodkladWarstwy; ustawienia: UstawieniaPlanow }

export default function WarstwaRekonstrukcji({ widz, osd, wersja, strona, dane, tryb, krycie }: {
    widz: React.RefObject<OpenSeadragon.Viewer | null>
    osd: React.RefObject<typeof OpenSeadragon | null>
    /** rośnie przy każdym otwarciu strony w OSD – nakładkę trzeba wtedy dodać od nowa */
    wersja: number
    strona: number
    dane: DaneRekonstrukcji
    tryb: TrybWarstw
    krycie: number
}) {
    const [kontener, ustawKontener] = React.useState<HTMLDivElement | null>(null)
    const naStronie = strona === dane.podklad.strona
    React.useEffect(() => {
        const v = widz.current
        const item = v?.world.getItemAt(0)
        if (!v || !osd.current || !item || !naStronie) return
        const el = document.createElement('div')
        el.className = 'rek-warstwa'
        el.setAttribute('aria-hidden', 'true')
        v.addOverlay({ element: el, location: item.getBounds() })
        ustawKontener(el)
        return () => { v.removeOverlay(el); ustawKontener(null) }
    }, [widz, osd, wersja, naStronie])
    React.useEffect(() => {
        if (!kontener) return
        kontener.classList.toggle('rek-ukryta', tryb === 'skan')
        kontener.style.opacity = tryb === 'oba' ? String(krycie) : '1'
    }, [kontener, tryb, krycie])
    const typy = React.useMemo(() => katalog(dane.ustawienia), [dane.ustawienia])
    if (!kontener) return null
    const { szer, wys } = dane.podklad, inv = odwrocMacierz(dane.podklad.macierz)
    if (!inv) return null
    const prefix = `rek-${dane.plan.slug}`
    return createPortal(
        <svg viewBox={`0 0 ${szer} ${wys}`} preserveAspectRatio="none" className="rek-svg">
            {tryb === 'rekonstrukcja' && <rect width={szer} height={wys} className="rek-tlo" />}
            <defs><Wzory prefix={prefix} u={jednostka(dane.plan)} /></defs>
            <g transform={`matrix(${inv.join(' ')})`}>
                <RysunekPlanu plan={dane.plan} o={{ prefix, typy, ukryteTypy: new Set(dane.ustawienia.ukryteTypy ?? []) }} />
            </g>
        </svg>,
        kontener,
    )
}

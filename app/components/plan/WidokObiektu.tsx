'use client'

// Plan obiektu (np. cmentarza) na całą szerokość kolumny, zakładki: plan · lista pochowanych · mapa;
// „pełny ekran”. Dane obiektu pod spodem. Lista renderuje się zawsze (ukryta), żeby trafiła do wyszukiwarek.

import * as React from 'react'
import type { Plan } from '@/lib/plany/model'
import type { UstawieniaPlanow } from '@/lib/plany/typy'
import type { OsobaNaPlanie } from '@/lib/plany/rodzina'
import PlanInteraktywny from './PlanInteraktywny'
import ListaPochowanych from './ListaPochowanych'

const przycisk = 'border border-[#d1d5db] dark:border-[#4b5563] bg-white dark:bg-[#111827] text-current rounded-[7px]'
type Zakladka = 'plan' | 'lista' | 'mapa'

export default function WidokObiektu({ info, plan, ustawienia, zalogowany, mapa, osoby }: {
    info?: React.ReactNode
    plan?: Plan | null
    ustawienia?: UstawieniaPlanow
    zalogowany: boolean
    mapa?: React.ReactNode
    osoby?: Record<string, OsobaNaPlanie>
}) {
    const [zakl, ustawZakl] = React.useState<Zakladka>(plan ? 'plan' : 'mapa')
    const [pelny, ustawPelny] = React.useState(false)
    const [pokazGrob, ustawPokazGrob] = React.useState<{ id: string; n: number } | null>(null)
    const ramka = React.useRef<HTMLDivElement>(null)

    const zamknijPelny = React.useCallback(() => {
        ustawPelny(false)
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }, [])
    const otworzPelny = () => {
        ustawPelny(true)
        ramka.current?.requestFullscreen?.().catch(() => {})
    }
    React.useEffect(() => {
        if (!pelny) return
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.plan-galeria')) zamknijPelny() }
        const wyjscie = () => { if (!document.fullscreenElement) ustawPelny(false) }
        document.addEventListener('keydown', esc)
        document.addEventListener('fullscreenchange', wyjscie)
        const przewijanie = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.removeEventListener('keydown', esc); document.removeEventListener('fullscreenchange', wyjscie); document.body.style.overflow = przewijanie }
    }, [pelny, zamknijPelny])

    if (!plan && !mapa) return info ? <div>{info}</div> : null
    const zakladki: [Zakladka, string][] = [...(plan ? [['plan', 'plan'], ['lista', 'lista pochowanych']] as [Zakladka, string][] : []), ...(mapa ? [['mapa', 'mapa']] as [Zakladka, string][] : [])]

    return (
        <div className="flex flex-col" style={{ gap: '1.5rem' }}>
            <div ref={ramka} className={`widok-wizual${pelny ? ' widok-pelny' : ''}`}>
                <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
                    {zakladki.length > 1 && (
                        <span className="inline-flex" role="tablist" aria-label="widok">
                            {zakladki.map(([t, nazwa], i) => (
                                <button key={t} type="button" role="tab" aria-selected={zakl === t} onClick={() => ustawZakl(t)} className={przycisk}
                                    style={{ height: 28, padding: '0 12px', fontSize: 13, borderRadius: i === 0 ? '7px 0 0 7px' : i === zakladki.length - 1 ? '0 7px 7px 0' : 0, marginLeft: i ? -1 : 0, ...(zakl === t ? { background: 'var(--foreground, #111)', color: 'var(--background, #fff)', borderColor: 'transparent' } : {}) }}>
                                    {nazwa}
                                </button>
                            ))}
                        </span>
                    )}
                    {pelny && plan && <b style={{ fontSize: 14 }}>{plan.tytul}</b>}
                    <span style={{ flex: 1 }} />
                    <button type="button" onClick={pelny ? zamknijPelny : otworzPelny} className={przycisk} style={{ height: 28, padding: '0 10px', fontSize: 13 }}>{pelny ? 'zamknij (Esc)' : 'pełny ekran'}</button>
                </div>
                {plan && ustawienia && (
                    <div hidden={zakl !== 'plan'}>
                        <PlanInteraktywny plan={plan} ustawienia={ustawienia} zalogowany={zalogowany} osoby={osoby} pokazGrob={pokazGrob}
                            wysokosc={pelny ? 'calc(100dvh - 170px)' : 'min(74vh, 700px)'} />
                    </div>
                )}
                {plan && ustawienia && (
                    <div hidden={zakl !== 'lista'}>
                        <ListaPochowanych plan={plan} ustawienia={ustawienia} osoby={osoby ?? {}} naPlanie={(id) => { ustawZakl('plan'); ustawPokazGrob((p) => ({ id, n: (p?.n ?? 0) + 1 })) }} />
                    </div>
                )}
                {mapa && zakl === 'mapa' && <div style={{ height: pelny ? 'calc(100dvh - 70px)' : 'min(70vh, 640px)' }}>{mapa}</div>}
            </div>
            {info && <div>{info}</div>}
        </div>
    )
}

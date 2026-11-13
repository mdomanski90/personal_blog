'use client'

// Strona obiektu z planem: plan zamiast punktu na mapie (mapa w drugiej zakładce),
// „szerzej” – plan na całą szerokość kolumny, dane obiektu zjeżdżają pod spód; „pełny ekran”.

import * as React from 'react'
import type { Plan } from '@/lib/plany/model'
import type { UstawieniaPlanow } from '@/lib/plany/typy'
import PlanInteraktywny from './PlanInteraktywny'

const przycisk = 'border border-[#d1d5db] dark:border-[#4b5563] bg-white dark:bg-[#111827] text-current rounded-[7px]'
const KLUCZ = 'obiekt-widok-szeroki'

export default function WidokObiektu({ info, plan, ustawienia, zalogowany, mapa }: {
    info: React.ReactNode
    plan?: Plan | null
    ustawienia?: UstawieniaPlanow
    zalogowany: boolean
    mapa?: React.ReactNode
}) {
    const [tryb, ustawTryb] = React.useState<'plan' | 'mapa'>(plan ? 'plan' : 'mapa')
    const [szeroki, ustawSzeroki] = React.useState(false)
    const [pelny, ustawPelny] = React.useState(false)
    const ramka = React.useRef<HTMLDivElement>(null)

    // zapamiętany wybór „szerzej” (tylko w tej przeglądarce)
    React.useEffect(() => { try { if (localStorage.getItem(KLUCZ) === '1') ustawSzeroki(true) } catch { /* brak dostępu */ } }, [])
    const przelaczSzeroki = () => {
        const n = !szeroki
        ustawSzeroki(n)
        try { localStorage.setItem(KLUCZ, n ? '1' : '0') } catch { /* brak dostępu */ }
    }

    // pełny ekran: okno przeglądarki (zawsze) + prawdziwy pełny ekran, gdy przeglądarka pozwala
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
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') zamknijPelny() }
        const wyjscie = () => { if (!document.fullscreenElement) ustawPelny(false) }
        document.addEventListener('keydown', esc)
        document.addEventListener('fullscreenchange', wyjscie)
        const przewijanie = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.removeEventListener('keydown', esc); document.removeEventListener('fullscreenchange', wyjscie); document.body.style.overflow = przewijanie }
    }, [pelny, zamknijPelny])

    const wysokoscPlanu = pelny ? 'calc(100dvh - 150px)' : szeroki ? 'min(72vh, 680px)' : 'min(60vh, 420px)'
    const wysokoscMapy = pelny ? 'calc(100dvh - 70px)' : szeroki ? 'min(72vh, 680px)' : '360px'
    const oba = !!plan && !!mapa

    if (!plan && !mapa) return <div>{info}</div>

    return (
        <div className={`widok-obiektu${szeroki ? ' widok-szeroki' : ''}`}>
            <div ref={ramka} className={`widok-wizual${pelny ? ' widok-pelny' : ''}`}>
                <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
                    {oba && (
                        <span className="inline-flex" role="group" aria-label="widok">
                            {(['plan', 'mapa'] as const).map((t, i) => (
                                <button key={t} type="button" aria-pressed={tryb === t} onClick={() => ustawTryb(t)} className={przycisk}
                                    style={{ height: 28, padding: '0 12px', fontSize: 13, borderRadius: i ? '0 7px 7px 0' : '7px 0 0 7px', marginLeft: i ? -1 : 0, ...(tryb === t ? { background: 'var(--foreground, #111)', color: 'var(--background, #fff)', borderColor: 'transparent' } : {}) }}>
                                    {t}
                                </button>
                            ))}
                        </span>
                    )}
                    {pelny && plan && <b style={{ fontSize: 14 }}>{plan.tytul}</b>}
                    <span style={{ flex: 1 }} />
                    {plan && tryb === 'plan' && <a href={`/plany/${plan.slug}`} style={{ fontSize: 13 }}>strona planu →</a>}
                    {!pelny && <button type="button" onClick={przelaczSzeroki} aria-pressed={szeroki} className={`${przycisk} widok-szerzej`} style={{ height: 28, padding: '0 10px', fontSize: 13 }} title={szeroki ? 'plan obok danych obiektu' : 'plan na całą szerokość, dane pod spodem'}>{szeroki ? 'węziej' : 'szerzej'}</button>}
                    <button type="button" onClick={pelny ? zamknijPelny : otworzPelny} className={przycisk} style={{ height: 28, padding: '0 10px', fontSize: 13 }}>{pelny ? 'zamknij (Esc)' : 'pełny ekran'}</button>
                </div>
                {tryb === 'plan' && plan && ustawienia && <PlanInteraktywny plan={plan} ustawienia={ustawienia} zalogowany={zalogowany} maly={!szeroki && !pelny} wysokosc={wysokoscPlanu} />}
                {tryb === 'mapa' && mapa && <div style={{ height: wysokoscMapy }}>{mapa}</div>}
            </div>
            <div className="widok-info">{info}</div>
        </div>
    )
}

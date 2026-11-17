'use client'

// Etap 3 · aplet przeglądarki planu (/plany/[slug]) – jedna ramka jak skan z tekstem (SkanZTekstem): nad mapą pasek
// .dok-pasek-karta (plan | lista pochowanych / lista obiektów · pobierz PNG · drukuj / PDF · ⤢), nad panelem pasek
// .szt-pasek z nazwą części panelu; oba 46 px × A±. Zastępuje WidokObiektu (karta obiektu nie osadza już planu – CEM-01).
// Lista renderuje się zawsze (ukryta w zakładce „plan”), żeby trafiła do wyszukiwarek i była tekstową alternatywą mapy (CEM-24).

import * as React from 'react'
import type { Plan } from '@/lib/plany/model'
import type { UstawieniaPlanow } from '@/lib/plany/typy'
import type { OsobaNaPlanie } from '@/lib/plany/rodzina'
import { interfejsPlanu } from '@/lib/plany/przegladarka'
import { ListaZakladek, atrybutyPanelu } from '../Zakladki'
import { useFokusPowrotu, useUwiezionyFokus } from '@/lib/ruch'
import PlanInteraktywny, { type NarzedziaPlanu } from './PlanInteraktywny'
import ListaPochowanych from './ListaPochowanych'
import ListaObiektowPlanu from './ListaObiektowPlanu'

type Zakladka = 'plan' | 'lista'

export default function PrzegladarkaPlanu({ plan, ustawienia, zalogowany, osoby, oPlanie }: {
    plan: Plan
    ustawienia: UstawieniaPlanow
    zalogowany: boolean
    osoby?: Record<string, OsobaNaPlanie>
    oPlanie?: React.ReactNode
}) {
    const interfejs = interfejsPlanu(plan)
    const [zakl, ustawZakl] = React.useState<Zakladka>('plan')
    const [pelny, ustawPelny] = React.useState(false)
    const [pokazGrob, ustawPokazGrob] = React.useState<{ id: string; n: number } | null>(null)
    const ramka = React.useRef<HTMLDivElement>(null)
    const narzedzia = React.useRef<NarzedziaPlanu>(null)
    const zakladki: { id: Zakladka; etykieta: string }[] = [{ id: 'plan', etykieta: 'plan' }, { id: 'lista', etykieta: interfejs.zakladkaListy }]
    const prefix = `aplet-${plan.slug}`

    // VIEW-03: po zamknięciu pełnego ekranu fokus wraca na przycisk, którym go otwarto
    useFokusPowrotu(pelny, {
        wejscie: () => ramka.current?.querySelector<HTMLElement>('button[aria-label="zamknij pełny ekran"]'),
        zapasowy: () => ramka.current?.querySelector<HTMLElement>('button[aria-label="pełny ekran"]'),
    })
    useUwiezionyFokus(pelny, ramka)
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

    const naPlanie = (id: string) => { ustawZakl('plan'); ustawPokazGrob((p) => ({ id, n: (p?.n ?? 0) + 1 })) }

    return (
        <div ref={ramka} className={`plan-aplet przegladarka-aplet plan-do-druku${zakl === 'lista' ? ' plan-aplet--lista' : ''}${pelny ? ' plan-aplet--pelny' : ''}`}
            role={pelny ? 'dialog' : undefined} aria-modal={pelny ? true : undefined} aria-label={pelny ? `${plan.tytul} – pełny ekran` : undefined}>
            <div className="plan-aplet-pasek">
                <div className="dok-pasek dok-pasek-karta" role="toolbar" aria-label="przeglądanie planu">
                    <span className="dok-pasek-lewa">
                        {pelny && <b className="dok-tytul">{plan.tytul}</b>}
                        <ListaZakladek prefix={prefix} etykieta="widok planu" zakladki={zakladki} aktywna={zakl} ustaw={ustawZakl} />
                    </span>
                    <span className="dok-pasek-prawa">
                        <span className="dok-grupa plan-pasek-eksport" role="group" aria-label="eksport">
                            <button type="button" onClick={() => narzedzia.current?.png()}>pobierz PNG</button>
                            <button type="button" onClick={() => narzedzia.current?.drukuj()}>drukuj / PDF</button>
                        </span>
                        <span className="dok-grupa">
                            {pelny
                                ? <button type="button" onClick={zamknijPelny} aria-label="zamknij pełny ekran" title="zamknij (Esc)"><span className="dok-etyk">zamknij </span>✕</button>
                                : <button type="button" onClick={otworzPelny} aria-label="pełny ekran" title="pełny ekran">⤢</button>}
                        </span>
                    </span>
                </div>
            </div>
            {/* obszar zakładki „plan” – display: contents (siatka apletu: pasek panelu, mapa, panel) */}
            <div {...atrybutyPanelu(prefix, 'plan')} className="plan-aplet-obszar">
                <PlanInteraktywny plan={plan} ustawienia={ustawienia} zalogowany={zalogowany} osoby={osoby} pokazGrob={pokazGrob} oPlanie={oPlanie} narzedzia={narzedzia} />
            </div>
            <div {...atrybutyPanelu(prefix, 'lista')} className="plan-aplet-lista">
                {interfejs.grobowy
                    ? <ListaPochowanych plan={plan} ustawienia={ustawienia} osoby={osoby ?? {}} naPlanie={naPlanie} />
                    : <ListaObiektowPlanu plan={plan} ustawienia={ustawienia} naPlanie={naPlanie} />}
            </div>
        </div>
    )
}

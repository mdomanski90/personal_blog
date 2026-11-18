'use client'

// Etap 3 · aplet przeglądarki planu (/plany/[slug]) – jedna ramka jak skan z tekstem (SkanZTekstem): nad mapą pasek
// .dok-pasek-karta (plan | lista pochowanych / lista obiektów · pobierz PNG · drukuj / PDF · ⤢), nad panelem pasek
// .szt-pasek z nazwą części panelu; oba 46 px × A±. Łatka po PK (18.11): pasek, pełny ekran, przybliżenie w pasku i
// chowanie panelu – wspólna rama z całym drzewem (app/components/aplet/RamaPrzegladarki.tsx). Zastępuje WidokObiektu (karta obiektu nie osadza już planu – CEM-01).
// Lista renderuje się zawsze (ukryta w zakładce „plan”), żeby trafiła do wyszukiwarek i była tekstową alternatywą mapy (CEM-24).

import * as React from 'react'
import type { Plan } from '@/lib/plany/model'
import type { UstawieniaPlanow } from '@/lib/plany/typy'
import type { OsobaNaPlanie } from '@/lib/plany/rodzina'
import { interfejsPlanu } from '@/lib/plany/przegladarka'
import RamaPrzegladarki from '../aplet/RamaPrzegladarki'
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
    const [pokazGrob, ustawPokazGrob] = React.useState<{ id: string; n: number } | null>(null)
    const narzedzia = React.useRef<NarzedziaPlanu>(null)
    const zakladki: { id: Zakladka; etykieta: string }[] = [{ id: 'plan', etykieta: 'plan' }, { id: 'lista', etykieta: interfejs.zakladkaListy }]
    const prefix = `aplet-${plan.slug}`
    const naPlanie = (id: string) => { ustawZakl('plan'); ustawPokazGrob((p) => ({ id, n: (p?.n ?? 0) + 1 })) }

    return (
        <RamaPrzegladarki prefix={prefix} etykietaPaska="przeglądanie planu" etykietaZakladek="widok planu" tytul={plan.tytul} klasa="plan-do-druku"
            zakladki={zakladki} aktywna={zakl} ustawZakladke={ustawZakl} kluczPanelu="plan-panel"
            escZamyka={() => !document.querySelector('.plan-galeria')}
            prawa={(
                <span className="dok-grupa plan-pasek-eksport" role="group" aria-label="eksport">
                    <button type="button" onClick={() => narzedzia.current?.png()}>pobierz PNG</button>
                    <button type="button" onClick={() => narzedzia.current?.drukuj()}>drukuj / PDF</button>
                </span>
            )}
            lista={interfejs.grobowy
                ? <ListaPochowanych plan={plan} ustawienia={ustawienia} osoby={osoby ?? {}} naPlanie={naPlanie} />
                : <ListaObiektowPlanu plan={plan} ustawienia={ustawienia} naPlanie={naPlanie} />}>
            <PlanInteraktywny plan={plan} ustawienia={ustawienia} zalogowany={zalogowany} osoby={osoby} pokazGrob={pokazGrob} oPlanie={oPlanie} narzedzia={narzedzia} />
        </RamaPrzegladarki>
    )
}

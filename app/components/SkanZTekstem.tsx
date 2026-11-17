'use client'

// Karta materiału: skan (OpenSeadragon – PrzegladarkaDokumentu, wariant „karta”) i tekst obok, w jednej ramce,
// tej samej wysokości; dłuższy tekst przewija się w środku. Zakładki: transkrypcja / oryginał / tłumaczenie
// (z opisu materiału, a gdy go nie ma – odczyty i tłumaczenia z objaśnień tej strony) i objaśnienia tej strony.
// Zmiana strony skanu przewija tekst do znacznika strony („[s. 2]”, „s. 2”, „k. 2” na początku akapitu);
// objaśnienie wybrane na skanie podświetla się w panelu i odwrotnie. Na telefonie tekst pod skanem.

import * as React from 'react'
import type { ObjasnienieWidoku } from '@/lib/objasnienia-widok'
import PrzegladarkaDokumentu, { obrazStrony, type StronaPodgladu } from './PrzegladarkaDokumentu'
import type { DaneRekonstrukcji } from './plan/WarstwaRekonstrukcji'
import { ListaObjasnien, TekstZrodla, type ObjasnienieNaStronie } from './ObjasnieniaSkanu'
import { przewin, przewinDo } from '@/lib/ruch'
import { KartaElementu, LegendaNumerowana } from './plan/PanelPlanu'
import { katalog } from '@/lib/plany/typy'
import { elementyLegendy } from '@/lib/plany/ph3'
import { znakObjasnienia } from '@/lib/plany/przegladarka'

// PH4: zakładka „plan” – obiekty rekonstrukcji (legenda numerowana) i wybrany obiekt, te same części co PanelPlanu
type Zakladka = 'transkrypcja' | 'oryginał' | 'tłumaczenie' | 'objaśnienia' | 'plan'

export default function SkanZTekstem({ strony, objasnienia, tytul, transkrypcja, oryginal, tlumaczenie, opracowal, rekonstrukcja, startowa = 0 }: {
    strony: StronaPodgladu[]
    objasnienia: ObjasnienieWidoku[]
    tytul: string
    transkrypcja: string
    oryginal: string
    tlumaczenie: string
    opracowal?: string
    /** PH1: warstwa rekonstrukcji planu nad skanem */
    rekonstrukcja?: DaneRekonstrukcji
    /** PD-07: strona widoczna na początku (indeks od 0) – z bloku „Materiał z archiwum” we wpisie */
    startowa?: number
}) {
    const [strona, ustawStrone] = React.useState(Math.max(0, Math.min(strony.length - 1, startowa)))
    const [aktywne, ustawAktywne] = React.useState<string | null>(null)
    const [wskazane, ustawWskazane] = React.useState<string | null>(null)
    const tekst = React.useRef<HTMLDivElement>(null)

    const [element, ustawElement] = React.useState<string | null>(null)
    const litery = !!rekonstrukcja?.plan.elementy.some((e) => e.nrLegendy)
    const naStronie: ObjasnienieNaStronie[] = React.useMemo(() => objasnienia.filter((o) => o.strona === strona).map((o, i) => ({ ...o, nr: znakObjasnienia(i, litery) })), [objasnienia, strona, litery])
    const typyRek = React.useMemo(() => (rekonstrukcja ? katalog(rekonstrukcja.ustawienia) : null), [rekonstrukcja])
    const legendaRek = React.useMemo(() => (rekonstrukcja && typyRek ? elementyLegendy(rekonstrukcja.plan.elementy.filter((e) => typyRek.has(e.typ))) : []), [rekonstrukcja, typyRek])
    const elRek = rekonstrukcja && element ? rekonstrukcja.plan.elementy.find((e) => e.id === element) : undefined
    const odczytySa = objasnienia.some((o) => o.rodzaj === 'odczyt')
    const tlumaczeniaSa = objasnienia.some((o) => o.rodzaj === 'tlumaczenie')
    const dostepne: Zakladka[] = [
        (transkrypcja || odczytySa) && 'transkrypcja',
        oryginal && 'oryginał',
        (tlumaczenie || tlumaczeniaSa) && 'tłumaczenie',
        objasnienia.length > 0 && 'objaśnienia',
        !!rekonstrukcja && 'plan',
    ].filter(Boolean) as Zakladka[]
    const [zakladka, ustawZakladke] = React.useState<Zakladka>(dostepne[0] ?? 'objaśnienia')

    const html = zakladka === 'transkrypcja' ? transkrypcja : zakladka === 'oryginał' ? oryginal : zakladka === 'tłumaczenie' ? tlumaczenie : ''
    // bez tekstu w opisie: odczyty / tłumaczenia z objaśnień tej strony
    const zObjasnien = !html && (zakladka === 'transkrypcja' || zakladka === 'tłumaczenie')
        ? naStronie.filter((o) => o.rodzaj === (zakladka === 'transkrypcja' ? 'odczyt' : 'tlumaczenie'))
        : []

    // zmiana strony: tekst z opisu przewija się do znacznika tej strony (jeśli jest), inaczej na początek
    React.useEffect(() => {
        const el = tekst.current
        if (!el) return
        if (!html) { el.scrollTop = 0; return }
        const nr = strona + 1
        const wzor = new RegExp(`^\\s*\\[?\\s*(s|str|strona|k|karta)\\.?\\s*${nr}\\b`, 'i')
        const cel = [...el.querySelectorAll<HTMLElement>('p, h2, h3, h4, li')].find((x) => wzor.test(x.textContent ?? ''))
        if (cel) przewin(el, { top: cel.offsetTop - 8 })
        else if (strona === 0) el.scrollTop = 0
    }, [strona, html])

    // objaśnienie wybrane na skanie: widoczne w panelu (zakładka „objaśnienia”, gdy w bieżącej go nie ma)
    const zSkanu = (id: string | null) => {
        ustawAktywne(id)
        if (!id) return
        const o = objasnienia.find((x) => x.id === id)
        const wBiezacej = zakladka === 'objaśnienia' || (!html && o && ((zakladka === 'transkrypcja' && o.rodzaj === 'odczyt') || (zakladka === 'tłumaczenie' && o.rodzaj === 'tlumaczenie')))
        if (!wBiezacej && dostepne.includes('objaśnienia')) ustawZakladke('objaśnienia')
    }
    React.useEffect(() => {
        if (!aktywne) return
        const t = window.setTimeout(() => { const x = tekst.current?.querySelector('.aktywna, [data-aktywne="1"]'); if (x) przewinDo(x, { block: 'nearest' }) }, 60)
        return () => window.clearTimeout(t)
    }, [aktywne, zakladka])

    const pasek = (
                <div className="szt-pasek">
                    {dostepne.length > 1 ? (
                        <span className="dok-grupa" role="tablist" aria-label="tekst">
                            {dostepne.map((z) => (
                                <button key={z} type="button" role="tab" aria-selected={zakladka === z} onClick={() => ustawZakladke(z)}>{z}</button>
                            ))}
                        </span>
                    ) : <b className="szt-jedna">{dostepne[0]}</b>}
                    <span className="szt-strona">{strony.length > 1 ? `strona ${strona + 1}` : ''}</span>
                </div>
    )
    const tresc = (
        <>
                    {zakladka === 'plan' && rekonstrukcja && typyRek ? (
                        <div className="osoba-tabela plan-panel-tabela szt-plan">
                            {elRek && <KartaElementu key={elRek.id} el={elRek} typ={typyRek.get(elRek.typ)} naPodstawe={(oid) => ustawAktywne(oid)} />}
                            <LegendaNumerowana elementy={legendaRek} typy={typyRek} pokaz={(e) => ustawElement(e.id)} wybrany={element} />
                            {!elRek && !legendaRek.length && <p className="szt-pusto szt-plan-pusto">Kliknij obiekt rekonstrukcji na skanie (warstwa „skan + plan” albo „plan”), żeby zobaczyć jego opis.</p>}
                        </div>
                    ) : html ? (
                        <>
                            {opracowal && zakladka !== 'oryginał' && <p className="szt-kto">{zakladka}: {opracowal}</p>}
                            <div className="post-content szt-html" dangerouslySetInnerHTML={{ __html: html }} />
                        </>
                    ) : zakladka === 'objaśnienia' ? (
                        naStronie.length
                            ? <ListaObjasnien lista={naStronie} aktywne={aktywne} wskazane={wskazane} onKlik={(id) => ustawAktywne(aktywne === id ? null : id)} ustawWskazane={ustawWskazane} />
                            : <p className="szt-pusto">Na tej stronie nie ma objaśnień.</p>
                    ) : zObjasnien.length ? (
                        <div className="szt-odczyty">
                            {zObjasnien.map((o) => (
                                <p key={o.id} data-aktywne={aktywne === o.id ? '1' : undefined} className={aktywne === o.id ? 'aktywny' : ''}>
                                    <button type="button" className="dok-obj-nr" onClick={() => ustawAktywne(aktywne === o.id ? null : o.id)} aria-label={`pokaż na skanie: objaśnienie ${o.nr}`}>{o.nr}</button>{' '}
                                    <TekstZrodla tekst={o.tekst} />
                                </p>
                            ))}
                        </div>
                    ) : (
                        <p className="szt-pusto">Na tej stronie nie ma jeszcze {zakladka === 'transkrypcja' ? 'odczytu' : 'tłumaczenia'}.</p>
                    )}
        </>
    )
    const opis = `${zakladka}${strony.length > 1 ? `, strona ${strona + 1}` : ''}`
    return (
        <section className="skan-z-tekstem" aria-label="skan i tekst">
            <div className="szt-skan">
                {/* P7E-2: na pełnym ekranie ten sam panel tekstu (transkrypcja / oryginał / tłumaczenie / objaśnienia) z boku skanu */}
                <PrzegladarkaDokumentu strony={strony} objasnienia={objasnienia} tytul={tytul} wariant="karta" wysokosc="calc(560px * var(--font-scale, 1))"
                    naZmianeStrony={ustawStrone} aktywneZ={aktywne} naAktywne={zSkanu} rekonstrukcja={rekonstrukcja}
                    elementZ={rekonstrukcja ? element : undefined} naElement={rekonstrukcja ? (id) => { ustawElement(id); if (id) ustawZakladke('plan') } : undefined}
                    panelTekstu={<div className="szt-tekst szt-tekst-pelny">{pasek}<div className="szt-tresc" tabIndex={0} role="tabpanel" aria-label={opis}>{tresc}</div></div>} />
            </div>
            <div className="szt-tekst">
                {pasek}
                <div ref={tekst} className="szt-tresc" tabIndex={0} role="tabpanel" aria-label={opis}>
                    {tresc}
                </div>
            </div>
            {/* JW-17: wydruk – skan (każda strona) na szerokość kartki, pod nim transkrypcja i tłumaczenie bez zakładek */}
            <div className="szt-druk druk-tylko" aria-hidden="true">
                {strony.map((s) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={s.adres} src={obrazStrony(s.adres, 1200)} alt="" className="szt-druk-skan" />
                ))}
                {transkrypcja && <div className="szt-druk-tekst"><h2 className="tytul-sekcji">transkrypcja{opracowal ? ` (${opracowal})` : ''}</h2><div className="post-content" dangerouslySetInnerHTML={{ __html: transkrypcja }} /></div>}
                {oryginal && <div className="szt-druk-tekst"><h2 className="tytul-sekcji">oryginał</h2><div className="post-content" dangerouslySetInnerHTML={{ __html: oryginal }} /></div>}
                {tlumaczenie && <div className="szt-druk-tekst"><h2 className="tytul-sekcji">tłumaczenie{opracowal ? ` (${opracowal})` : ''}</h2><div className="post-content" dangerouslySetInnerHTML={{ __html: tlumaczenie }} /></div>}
            </div>
        </section>
    )
}

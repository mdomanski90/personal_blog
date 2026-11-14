'use client'

// Karta materiału: skan (OpenSeadragon – PrzegladarkaDokumentu, wariant „karta”) i tekst obok, w jednej ramce,
// tej samej wysokości; dłuższy tekst przewija się w środku. Zakładki: transkrypcja / oryginał / tłumaczenie
// (z opisu materiału, a gdy go nie ma – odczyty i tłumaczenia z objaśnień tej strony) i objaśnienia tej strony.
// Zmiana strony skanu przewija tekst do znacznika strony („[s. 2]”, „s. 2”, „k. 2” na początku akapitu);
// objaśnienie wybrane na skanie podświetla się w panelu i odwrotnie. Na telefonie tekst pod skanem.

import * as React from 'react'
import type { ObjasnienieWidoku } from '@/lib/objasnienia-widok'
import PrzegladarkaDokumentu, { type StronaPodgladu } from './PrzegladarkaDokumentu'
import { ListaObjasnien, TekstZrodla, type ObjasnienieNaStronie } from './ObjasnieniaSkanu'

type Zakladka = 'transkrypcja' | 'oryginał' | 'tłumaczenie' | 'objaśnienia'

export default function SkanZTekstem({ strony, objasnienia, tytul, transkrypcja, oryginal, tlumaczenie, opracowal }: {
    strony: StronaPodgladu[]
    objasnienia: ObjasnienieWidoku[]
    tytul: string
    transkrypcja: string
    oryginal: string
    tlumaczenie: string
    opracowal?: string
}) {
    const [strona, ustawStrone] = React.useState(0)
    const [aktywne, ustawAktywne] = React.useState<string | null>(null)
    const [wskazane, ustawWskazane] = React.useState<string | null>(null)
    const tekst = React.useRef<HTMLDivElement>(null)

    const naStronie: ObjasnienieNaStronie[] = React.useMemo(() => objasnienia.filter((o) => o.strona === strona).map((o, i) => ({ ...o, nr: i + 1 })), [objasnienia, strona])
    const odczytySa = objasnienia.some((o) => o.rodzaj === 'odczyt')
    const tlumaczeniaSa = objasnienia.some((o) => o.rodzaj === 'tlumaczenie')
    const dostepne: Zakladka[] = [
        (transkrypcja || odczytySa) && 'transkrypcja',
        oryginal && 'oryginał',
        (tlumaczenie || tlumaczeniaSa) && 'tłumaczenie',
        objasnienia.length > 0 && 'objaśnienia',
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
        if (cel) el.scrollTo({ top: cel.offsetTop - 8, behavior: 'smooth' })
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
        const t = window.setTimeout(() => tekst.current?.querySelector('.aktywna, [data-aktywne="1"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60)
        return () => window.clearTimeout(t)
    }, [aktywne, zakladka])

    return (
        <section className="skan-z-tekstem" aria-label="skan i tekst">
            <div className="szt-skan">
                <PrzegladarkaDokumentu strony={strony} objasnienia={objasnienia} tytul={tytul} wariant="karta" wysokosc="calc(560px * var(--font-scale, 1))"
                    naZmianeStrony={ustawStrone} aktywneZ={aktywne} naAktywne={zSkanu} />
            </div>
            <div className="szt-tekst">
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
                <div ref={tekst} className="szt-tresc" tabIndex={0} role="tabpanel" aria-label={`${zakladka}${strony.length > 1 ? `, strona ${strona + 1}` : ''}`}>
                    {html ? (
                        <>
                            {opracowal && zakladka !== 'oryginał' && <p className="szt-kto">{zakladka}: {opracowal}</p>}
                            <div className="post-content" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }} dangerouslySetInnerHTML={{ __html: html }} />
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
                </div>
            </div>
        </section>
    )
}

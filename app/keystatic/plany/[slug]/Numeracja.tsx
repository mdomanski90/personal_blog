'use client'

// Numeracja grobów w edytorze (etap 2): ustawienia kwatery, „uzupełnij brakujące” / „przenumeruj kwaterę” z tabelą
// różnic przed zapisem, ręczna korekta numeru z kontrolą powtórzeń, stan numeracji planu.
// Logika: lib/plany/numeracja.ts. Zmiany numerów nie są danymi grobu – nie zmieniają etapu opracowania.

import * as React from 'react'
import { kwateraDla, srodek, type Element, type Oznaczenie, type Plan } from '@/lib/plany/model'
import {
    bladOznaczenia, NAZWY_POCZATKU, numerTekst, numeryPlanu, przenumeruj, stanNumeracji, uzupelnij, zajety,
    type Poczatek, type ZmianaNumeru,
} from '@/lib/plany/numeracja'
import type { TypElementu } from '@/lib/plany/typy'
import { odmiana } from '@/lib/tekst'

export interface Roznice { tytul: string; zmiany: ZmianaNumeru[] }

const nazwaKwatery = (plan: Plan, id?: string) => (id ? plan.elementy.find((e) => e.id === id)?.nazwa?.trim() || 'kwatera bez nazwy' : '')
const tekstOznaczenia = (plan: Plan, o?: Oznaczenie | null) => (o ? numerTekst({ kwatera: nazwaKwatery(plan, o.kwatera), rzad: o.rzad, miejsce: o.miejsce }) : 'bez numeru')
const ktoWGrobie = (e?: Element) => e?.osoby?.map((o) => o.nazwa).filter(Boolean).join(', ') || e?.nazwa || ''

/** Tabela różnic stary → nowy; zatwierdzenie = jedna zmiana planu (jeden krok cofania). */
export function TabelaRoznic({ plan, roznice, zatwierdz, anuluj, pokaz }: { plan: Plan; roznice: Roznice; zatwierdz: () => void; anuluj: () => void; pokaz: (id: string) => void }) {
    const { zmiany } = roznice
    const nowe = zmiany.filter((z) => !z.stare && z.nowe).length, tracone = zmiany.filter((z) => !z.nowe).length
    const el = new Map(plan.elementy.map((e) => [e.id, e]))
    // podgląd pojawia się na górze panelu – przewiń do niego i przenieś fokus (na wąskim ekranie panel jest przewijany)
    const ref = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => { ref.current?.scrollIntoView({ block: 'nearest' }); ref.current?.focus({ preventScroll: true }) }, [roznice])
    return (
        <div ref={ref} tabIndex={-1} className="ed-sekcja ed-ramka-sek" role="region" aria-label="podgląd zmian numeracji">
            <div className="ed-gt">{roznice.tytul} – podgląd</div>
            {zmiany.length === 0 ? <p className="ed-maly">Nic do zmiany – numery już są takie, jak wynika z położenia grobów.</p> : (
                <>
                    <p className="ed-maly">
                        {odmiana(zmiany.length, ['zmiana numeru', 'zmiany numerów', 'zmian numerów'])}
                        {nowe ? ` · ${odmiana(nowe, ['grób dostanie numer', 'groby dostaną numer', 'grobów dostanie numer'])}` : ''}
                        {tracone ? ` · ${odmiana(tracone, ['grób straci numer', 'groby stracą numer', 'grobów straci numer'])} (leży poza kwaterą – „uzupełnij brakujące” nada nowy)` : ''}
                    </p>
                    <ol className="ed-roznice">
                        {zmiany.map((z) => (
                            <li key={z.id}>
                                <button className="ed-link" onClick={() => pokaz(z.id)} title="pokaż na planie">{ktoWGrobie(el.get(z.id)) || 'grób'}</button>
                                <span className="ed-maly">{tekstOznaczenia(plan, z.stare)} → <b>{tekstOznaczenia(plan, z.nowe)}</b></span>
                            </li>
                        ))}
                    </ol>
                </>
            )}
            <div className="ed-rzad">
                {zmiany.length > 0 && <button className="ed-btn ed-btn-gl" onClick={zatwierdz}>zatwierdź</button>}
                <button className="ed-btn" onClick={anuluj}>{zmiany.length ? 'anuluj' : 'zamknij'}</button>
            </div>
        </div>
    )
}

/** Kwatera: rzędy liczbami albo literami, róg początku; „uzupełnij brakujące” i „przenumeruj kwaterę”. */
export function UstawieniaKwatery({ e, plan, typy, zmiana, podglad }: {
    e: Element; plan: Plan; typy: Map<string, TypElementu>; zmiana: (zm: Partial<Element>) => void; podglad: (r: Roznice) => void
}) {
    const n = e.numeracjaKwatery ?? {}
    const ustaw = (zm: Partial<NonNullable<Element['numeracjaKwatery']>>) => {
        const w = { ...n, ...zm }
        if (w.rzedy === 'liczby') delete w.rzedy
        if (w.poczatek === 'lg') delete w.poczatek
        zmiana({ numeracjaKwatery: Object.keys(w).length ? w : undefined })
    }
    const nazwa = e.nazwa?.trim() ? `kwatera ${e.nazwa.trim()}` : 'kwatera bez nazwy'
    return (
        <>
            <div className="ed-gt">numeracja grobów</div>
            <div className="ed-rzad">
                <span className="ed-maly">rzędy</span>
                <span className="ed-seg">
                    <button aria-pressed={n.rzedy !== 'litery'} onClick={() => ustaw({ rzedy: 'liczby' })}>1, 2, 3</button>
                    <button aria-pressed={n.rzedy === 'litery'} onClick={() => ustaw({ rzedy: 'litery' })}>A, B, C</button>
                </span>
            </div>
            <label className="ed-pole">
                <span>początek numeracji (względem kąta rzędów)</span>
                <select className="ed-in" value={n.poczatek ?? 'lg'} onChange={(x) => ustaw({ poczatek: x.target.value as Poczatek })}>
                    {(Object.keys(NAZWY_POCZATKU) as Poczatek[]).map((p) => <option key={p} value={p}>{NAZWY_POCZATKU[p]}</option>)}
                </select>
            </label>
            <div className="ed-rzad">
                <button className="ed-btn" onClick={() => podglad({ tytul: `uzupełnij brakujące: ${nazwa}`, zmiany: uzupelnij(plan, typy, e.id) })} title="numer tylko dla grobów bez numeru; istniejące zostają">uzupełnij brakujące</button>
                <button className="ed-btn" onClick={() => podglad({ tytul: `przenumeruj: ${nazwa}`, zmiany: przenumeruj(plan, typy, e.id) })} title="wszystkie groby kwatery według położenia, kierunku i liter rzędów">przenumeruj kwaterę…</button>
            </div>
            <span className="ed-maly">Ustawienia działają przy uzupełnianiu i przenumerowaniu; zapisane numery zmieniają się dopiero po zatwierdzeniu podglądu.</span>
        </>
    )
}

/** Grób: zapisany numer i ręczna korekta (kontrola powtórzeń w kwaterze). */
export function NumerGrobu({ e, plan, typy, zmiana, pokaz }: {
    e: Element; plan: Plan; typy: Map<string, TypElementu>; zmiana: (zm: Partial<Element>) => void; pokaz: (id: string) => void
}) {
    const kwatery = plan.elementy.filter((k) => k.typ === 'kwatera')
    const [x, y] = srodek(e.g), wKwaterze = kwateraDla(x, y, kwatery)?.id
    const o = e.oznaczenie
    const [kw, ustawKw] = React.useState(o?.kwatera ?? wKwaterze ?? '')
    const [rz, ustawRz] = React.useState(o?.rzad ?? '')
    const [m, ustawM] = React.useState(o?.miejsce ?? '')
    const [blad, ustawBlad] = React.useState<{ tekst: string; grob?: string } | null>(null)
    React.useEffect(() => { ustawKw(o?.kwatera ?? wKwaterze ?? ''); ustawRz(o?.rzad ?? ''); ustawM(o?.miejsce ?? ''); ustawBlad(null) }, [e.id, o?.kwatera, o?.rzad, o?.miejsce, wKwaterze])
    void typy
    const zmienione = (kw || undefined) !== o?.kwatera || rz !== (o?.rzad ?? '') || m !== (o?.miejsce ?? '')
    const zapisz = () => {
        const nowe: Oznaczenie = { ...(kw ? { kwatera: kw } : {}), rzad: rz.trim(), miejsce: m.trim() }
        const b = bladOznaczenia(nowe)
        if (b) { ustawBlad({ tekst: b }); return }
        const inny = zajety(plan, e.id, nowe)
        if (inny) { ustawBlad({ tekst: `Ten numer ma już inny grób${ktoWGrobie(inny) ? ` (${ktoWGrobie(inny)})` : ''}.`, grob: inny.id }); return }
        ustawBlad(null)
        zmiana({ oznaczenie: nowe })
    }
    const pozaKwatera = o && (o.kwatera ?? undefined) !== (wKwaterze ?? undefined)
    return (
        <>
            <div className="ed-gt">numer grobu</div>
            <div className="ed-rzad">
                <label className="ed-pole ed-pole--szer">
                    <span>kwatera</span>
                    <select className="ed-in" value={kw} onChange={(v) => ustawKw(v.target.value)}>
                        <option value="">poza kwaterami</option>
                        {kwatery.map((k) => <option key={k.id} value={k.id}>{k.nazwa?.trim() || 'kwatera bez nazwy'}</option>)}
                    </select>
                </label>
                <label className="ed-pole"><span>rząd</span><input className="ed-in" value={rz} maxLength={6} onChange={(v) => ustawRz(v.target.value)} onKeyDown={(v) => { if (v.key === 'Enter') zapisz() }} /></label>
                <label className="ed-pole"><span>miejsce</span><input className="ed-in" value={m} maxLength={6} onChange={(v) => ustawM(v.target.value)} onKeyDown={(v) => { if (v.key === 'Enter') zapisz() }} /></label>
            </div>
            <div className="ed-rzad">
                <button className="ed-btn" disabled={!zmienione} onClick={zapisz}>zapisz numer</button>
                {o && <button className="ed-btn" onClick={() => zmiana({ oznaczenie: undefined })}>usuń numer</button>}
            </div>
            {blad && <p className="ed-uwaga" role="alert">{blad.tekst}{blad.grob && <> <button className="ed-link" onClick={() => pokaz(blad.grob!)}>pokaż go</button></>}</p>}
            {!o && <span className="ed-maly">Grób nie ma numeru – wpisz go albo użyj „uzupełnij brakujące” w kwaterze lub w zakładce „plan”.</span>}
            {pozaKwatera && <span className="ed-uwaga">Grób leży {wKwaterze ? `w kwaterze ${nazwaKwatery(plan, wKwaterze)}` : 'poza kwaterami'}, a numer wskazuje {o?.kwatera ? `kwaterę ${nazwaKwatery(plan, o.kwatera)}` : '„poza kwaterami”'} – popraw numer albo przenumeruj kwaterę.</span>}
        </>
    )
}

/** Zakładka „plan”: stan numeracji i „uzupełnij brakujące” w całym planie. */
export function StanNumeracjiPlanu({ plan, typy, podglad, pokaz }: { plan: Plan; typy: Map<string, TypElementu>; podglad: (r: Roznice) => void; pokaz: (id: string) => void }) {
    const s = React.useMemo(() => stanNumeracji(plan, typy), [plan, typy])
    const zNumerem = numeryPlanu(plan).size
    const powt = [...s.powtorzone.values()]
    return (
        <>
            <div className="ed-gt">numeracja grobów</div>
            <div className="ed-wiersz"><span>z numerem</span><b>{zNumerem}</b></div>
            <div className="ed-wiersz"><span>bez numeru</span><b>{s.bezNumeru.length}</b></div>
            {s.bezNumeru.length > 0 && <button className="ed-btn" onClick={() => podglad({ tytul: 'uzupełnij brakujące w całym planie', zmiany: uzupelnij(plan, typy) })}>uzupełnij brakujące…</button>}
            {s.pozaKwatera.length > 0 && (
                <p className="ed-uwaga">{odmiana(s.pozaKwatera.length, ['grób leży', 'groby leżą', 'grobów leży'])} poza kwaterą ze swojego numeru: {s.pozaKwatera.slice(0, 8).map((e, i) => <React.Fragment key={e.id}>{i ? ', ' : ''}<button className="ed-link" onClick={() => pokaz(e.id)}>{numerTekst(numeryPlanu(plan).get(e.id))}</button></React.Fragment>)}{s.pozaKwatera.length > 8 ? '…' : ''}</p>
            )}
            {powt.length > 0 && (
                <p className="ed-uwaga">Powtórzone numery: {powt.slice(0, 8).map((ids, i) => <React.Fragment key={ids[0]}>{i ? ', ' : ''}<button className="ed-link" onClick={() => pokaz(ids[0])}>{numerTekst(numeryPlanu(plan).get(ids[0]))} ({ids.length})</button></React.Fragment>)} – popraw ręcznie albo przenumeruj kwaterę.</p>
            )}
            {s.nazwyKwater.length > 0 && <p className="ed-uwaga">Kilka kwater ma tę samą nazwę ({s.nazwyKwater.join(', ')}) – numery grobów wyglądałyby tak samo w dwóch miejscach. Zmień nazwę jednej z nich.</p>}
            <span className="ed-maly">Numer jest zapisany w grobie i taki sam dla każdego czytelnika; nowy grób nie ma numeru, dopóki go nie nadasz.</span>
        </>
    )
}

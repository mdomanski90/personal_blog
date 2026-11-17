'use client'

// Etap 3 · PanelPlanu (nowy komponent, zatwierdzony 17.11): panel przeglądarki planu = tabela karty (.osoba-tabela:
// części .ot-nagl, wiersze .ot-w) na wysokość mapy, przewijany wewnątrz. U góry PoleSzukania z podpowiedzią; pod nim
// stan pusty (liczby, kwatery, legenda, o planie – CEM-08/14), karta wybranego (grób / obiekt) albo wyniki szukania.
// Wspólny dla /plany/[slug] (PlanInteraktywny) i materiału z rekonstrukcją (PrzegladarkaDokumentu, PH4).
// Wygląd wyłącznie z klas i tokenów app/globals.css (zasada 5.1); nagłówek panelu (.szt-pasek) daje rama apletu.

import * as React from 'react'
import PoleSzukania from '../PoleSzukania'
import { PastylkaOsoby } from '../Wzorce'
import OpisElementu from './OpisElementu'
import { Probka } from './Probka'
import type { Element, Numer, Plan } from '@/lib/plany/model'
import { numerKrotki, numerTekst } from '@/lib/plany/numeracja'
import { typGrobu, type TypElementu } from '@/lib/plany/typy'
import type { KrewnyNaPlanie, OsobaNaPlanie } from '@/lib/plany/rodzina'
import { IDENTYFIKACJE } from '@/lib/plany/podstawa'
import { odmiana } from '@/lib/tekst'

// ---------- części tabeli (te same klasy co Czesc / W / WCaly w Karta.tsx – tamten plik jest serwerowy) ----------
export function CzescPanelu({ tytul, children }: { tytul: string; children?: React.ReactNode }) {
    return <div className="ot-nagl"><h2>{tytul}</h2>{children && <span className="ot-nagl-prawa">{children}</span>}</div>
}
export function WierszPanelu({ e, children }: { e: string; children: React.ReactNode }) {
    if (children === null || children === undefined || children === false || children === '') return null
    return <dl className="ot-w"><dt className="ot-e">{e}</dt><dd className="ot-t">{children}</dd></dl>
}
export function CalyPanelu({ children }: { children: React.ReactNode }) {
    return <div className="ot-cala">{children}</div>
}

/** Rama panelu: szukanie u góry, tabela pod spodem; na wąskim ekranie (≤900 px) nagłówek części wraca do panelu. */
export default function PanelPlanu({ tytul, zamknij, szukaj, ustawSzukaj, naSzukaj, podpowiedz, opisPodpowiedzi, etykieta, children }: {
    /** nazwa części panelu (ta sama co w pasku apletu) */
    tytul: string
    /** × – zamyka kartę wybranego / czyści wyniki */
    zamknij?: () => void
    szukaj: string
    ustawSzukaj: (v: string) => void
    naSzukaj?: () => void
    podpowiedz: string
    opisPodpowiedzi?: React.ReactNode
    etykieta: string
    children: React.ReactNode
}) {
    const esc = (e: React.KeyboardEvent) => {
        if (e.key !== 'Escape') return
        if (zamknij) { e.stopPropagation(); zamknij() }
    }
    return (
        <aside className="plan-panel plan-bez-druku" aria-label={etykieta} onKeyDown={esc}>
            <div className="plan-panel-glowa-tel">
                <b>{tytul}</b>
                {zamknij && <button type="button" className="plan-panel-x" onClick={zamknij} aria-label="zamknij">×</button>}
            </div>
            <div className="plan-panel-szukaj">
                <PoleSzukania value={szukaj} onChange={ustawSzukaj} onSubmit={() => naSzukaj?.()} placeholder={podpowiedz} etykieta="szukaj" obszar={`${etykieta} – szukaj`} />
                {opisPodpowiedzi && <p className="plan-panel-podpowiedz">{opisPodpowiedzi}</p>}
            </div>
            <div className="osoba-tabela plan-panel-tabela">{children}</div>
        </aside>
    )
}

// ---------- wyniki szukania (CEM-04) ----------
export function WynikiSzukania({ wyniki, wybrany, wybierz, opis, numery, pustoUwaga }: {
    wyniki: Element[]
    wybrany: string | null
    wybierz: (e: Element) => void
    opis: (e: Element) => string
    numery?: Map<string, Numer>
    /** gdy nic nie znaleziono – zdanie uczciwe wobec nieodczytanych napisów */
    pustoUwaga: string
}) {
    return (
        <>
            <CzescPanelu tytul="wyniki">{`znaleziono: ${wyniki.length} · Esc – wyczyść`}</CzescPanelu>
            {wyniki.length === 0 && <CalyPanelu><p className="plan-panel-pusto">{pustoUwaga}</p></CalyPanelu>}
            {wyniki.length > 0 && (
                <ul className="plan-panel-wyniki">
                    {wyniki.slice(0, 200).map((e) => (
                        <li key={e.id}>
                            <button type="button" className="plan-panel-wynik" aria-current={e.id === wybrany ? 'true' : undefined} onClick={() => wybierz(e)}>
                                <span>{opis(e)}</span>
                                {numery?.get(e.id) && <span className="plan-panel-wynik-nr">{numerKrotki(numery.get(e.id))}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {wyniki.length > 200 && <CalyPanelu><p className="plan-panel-pusto">{`i ${wyniki.length - 200} więcej – zawęź wyszukiwanie`}</p></CalyPanelu>}
        </>
    )
}

// ---------- legenda (przełączniki typów) i legenda numerowana (PH-08) ----------
export function LegendaTypow({ uzyte, prefix, wylaczone, przelacz, wszystkie, rodzina }: {
    uzyte: { t: TypElementu; n: number }[]; prefix: string; wylaczone: Set<string>; przelacz: (id: string) => void; wszystkie: () => void; rodzina?: boolean
}) {
    if (!uzyte.length) return null
    return (
        <>
            <CzescPanelu tytul="legenda">{wylaczone.size > 0 ? <button type="button" className="plan-panel-odn" onClick={wszystkie}>pokaż wszystko</button> : 'kliknij, żeby ukryć'}</CzescPanelu>
            <CalyPanelu>
                <ul className="plan-panel-legenda">
                    {uzyte.map(({ t, n }) => (
                        <li key={t.id}>
                            <button type="button" className="plan-panel-typ" onClick={() => przelacz(t.id)} aria-pressed={!wylaczone.has(t.id)}>
                                <Probka typ={t} prefix={prefix} />
                                <span>{t.nazwa.replace(/ \(.*\)$/, '')}{n > 1 && <span className="plan-panel-liczba"> · {n}</span>}</span>
                            </button>
                        </li>
                    ))}
                    {rodzina && <li className="plan-panel-typ"><span className="plan-rodzina-probka" aria-hidden="true" />grób rodziny</li>}
                </ul>
            </CalyPanelu>
        </>
    )
}

/** PH-08 / PH4: „obiekty na planie” – legenda numerowana z nazwą w źródle, identyfikacją i kartą; klik pokazuje obiekt. */
export function LegendaNumerowana({ elementy, typy, pokaz, wybrany }: { elementy: (Element & { nrLegendy: string })[]; typy: Map<string, TypElementu>; pokaz: (e: Element) => void; wybrany?: string | null }) {
    if (!elementy.length) return null
    return (
        <>
            <CzescPanelu tytul="obiekty na planie">{odmiana(elementy.length, ['obiekt', 'obiekty', 'obiektów'])}</CzescPanelu>
            <CalyPanelu>
                <div className="plan-legenda-numery w-karcie plan-panel-numery"><ol>
                    {elementy.map((e) => {
                        const nazwa = e.nazwa?.split('\n').join(' ') || e.nazwaZrodlowa || typy.get(e.typ)?.nazwa.replace(/ \(.*\)$/, '') || '—'
                        const niepewna = e.identyfikacja && e.identyfikacja !== 'pewna'
                        return (
                            <li key={e.id} aria-current={e.id === wybrany ? 'true' : undefined}>
                                <span className="plan-legenda-nr" aria-hidden="true">{e.nrLegendy}</span>
                                <span className="plan-legenda-poz">
                                    <span className="sr-only">{e.nrLegendy}. </span>
                                    {e.nieznanePolozenie ? <span>{nazwa} <span className="plan-legenda-uwaga">· położenie nieznane</span></span>
                                        : <button type="button" className="plan-legenda-element" onClick={() => pokaz(e)}>{nazwa}</button>}
                                    {e.nazwaZrodlowa && e.nazwaZrodlowa !== nazwa && <span className="plan-legenda-uwaga"> · w źródle: „{e.nazwaZrodlowa}”</span>}
                                    {niepewna && <span className="plan-legenda-uwaga"> · {IDENTYFIKACJE[e.identyfikacja!]}</span>}
                                    {(e.odnosniki ?? []).map((k) => <span key={k.adres}> · <a href={k.adres} className="odn">{k.nazwa}</a></span>)}
                                </span>
                            </li>
                        )
                    })}
                </ol></div>
            </CalyPanelu>
        </>
    )
}

// ---------- karta obiektu (plan bez grobów, rekonstrukcja – PH4) ----------
export function KartaElementu({ el, typ, numer, nazwyMaterialow, naPodstawe }: { el: Element; typ?: TypElementu; numer?: Numer; nazwyMaterialow?: Record<string, string>; naPodstawe?: (objasnienie: string) => void }) {
    return (
        <>
            <CzescPanelu tytul={el.nazwa || el.nazwaZrodlowa || typ?.nazwa || 'obiekt'}>{el.nrLegendy ? `nr ${el.nrLegendy}` : numer ? numerKrotki(numer) : null}</CzescPanelu>
            <WierszPanelu e="rodzaj">{typ?.nazwa.replace(/ \(.*\)$/, '')}</WierszPanelu>
            <WierszPanelu e="czas">{el.czas}</WierszPanelu>
            <WierszPanelu e="stan">{el.stan && el.stan !== 'istnieje' ? (el.stan === 'nie-istnieje' ? 'nie istnieje' : 'do sprawdzenia') : null}</WierszPanelu>
            {el.opis && <CalyPanelu><p className="plan-panel-tekst">{el.opis}</p></CalyPanelu>}
            {(el.nazwaZrodlowa || el.identyfikacja || el.odnosniki?.length || el.podstawa?.length) && (
                <CalyPanelu><OpisElementu e={el} nazwyMaterialow={nazwyMaterialow} naPodstawe={naPodstawe} /></CalyPanelu>
            )}
        </>
    )
}

// ---------- karta grobu ----------
export type Rodzina = { wlasne: OsobaNaPlanie[]; krewni: (KrewnyNaPlanie & { grob: Element | null; wzgledem: string })[] }

export function KartaGrobu({ el, plan, numer, numery, kolejno, osoby, zalogowany, idz, pokazRodzine, rodzinaIle, otworzFoto }: {
    el: Element; plan: Plan; numer?: Numer; numery: Map<string, Numer>; kolejno: Element[]; osoby: Record<string, OsobaNaPlanie>
    zalogowany: boolean; idz: (e: Element) => void; pokazRodzine: () => void; rodzinaIle: Rodzina; otworzFoto: (i: number) => void
}) {
    const [forma, ustawForme] = React.useState<null | 'informacja' | 'prosba'>(null)
    const [stanWysylki, ustawStanWysylki] = React.useState<'' | 'wyslana' | 'blad'>('')
    const [tresc, ustawTresc] = React.useState('')
    const [kontakt, ustawKontakt] = React.useState('')
    const [skopiowano, ustawSkopiowano] = React.useState(false)
    const wyslij = async () => {
        const r = await fetch('/api/plany/zgloszenie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: plan.slug, element: el.id, tresc, kontakt, rodzaj: forma }) }).catch(() => null)
        ustawStanWysylki(r?.ok ? 'wyslana' : 'blad')
        if (r?.ok) { ustawForme(null); ustawTresc(''); ustawKontakt('') }
    }
    const kopiuj = () => {
        const adres = `${location.origin}${location.pathname}?grob=${encodeURIComponent(el.id)}`
        navigator.clipboard?.writeText(adres).then(() => { ustawSkopiowano(true); setTimeout(() => ustawSkopiowano(false), 1500) }).catch(() => {})
    }
    const i = kolejno.findIndex((x) => x.id === el.id)
    const poprz = i > 0 ? kolejno[i - 1] : null, nast = i >= 0 && i < kolejno.length - 1 ? kolejno[i + 1] : null
    const etykietaSasiada = (x: Element | null) => {
        const n = x ? numery.get(x.id) : undefined
        if (!n || !numer) return ''
        return n.kwatera === numer.kwatera && n.rzad === numer.rzad ? `miejsce ${n.miejsce}` : `rząd ${n.rzad}${n.kwatera !== numer.kwatera ? ` (${n.kwatera || '—'})` : ''}`
    }
    const ileGrobowRodziny = rodzinaIle.krewni.filter((k) => k.grob).length
    const pochowani = (el.osoby ?? []).filter((o) => o.nazwa?.trim())

    return (
        <>
            <div className="plan-panel-nawig" role="group" aria-label="poprzedni i następny grób">
                <button type="button" className="k-btn k-btn--s" disabled={!poprz} onClick={() => poprz && idz(poprz)}>‹ {etykietaSasiada(poprz) || 'poprzedni'}</button>
                <button type="button" className="k-btn k-btn--s" disabled={!nast} onClick={() => nast && idz(nast)}>{etykietaSasiada(nast) || 'następny'} ›</button>
                <span className="plan-panel-odstep" />
                <button type="button" className="k-btn k-btn--s" onClick={kopiuj}>{skopiowano ? 'skopiowano' : 'kopiuj link'}</button>
            </div>
            {numer && <WierszPanelu e="miejsce">{numerTekst(numer)}</WierszPanelu>}
            {el.ograniczony ? (
                <CalyPanelu>
                    {/* decyzja 15.11: bez podawania powodu ograniczenia (CEM-10) */}
                    <p className="plan-panel-tekst">Opis niedostępny publicznie.{!zalogowany && <> <a href={`/zaloguj?wroc=${encodeURIComponent(`/plany/${plan.slug}?grob=${el.id}`)}`} className="odn">Zaloguj się</a>.</>}</p>
                </CalyPanelu>
            ) : (
                <>
                    {(pochowani.length > 0 || el.nazwa) && (
                        <>
                            <CzescPanelu tytul="pochowani">{rodzinaIle.krewni.length > 0 && <button type="button" onClick={pokazRodzine} className="plan-panel-odn">groby rodziny{ileGrobowRodziny ? ` (${ileGrobowRodziny})` : ''}</button>}</CzescPanelu>
                            <CalyPanelu>
                                <ul className="plan-panel-osoby">
                                    {pochowani.map((o, j) => {
                                        const z = o.id ? osoby[o.id] : undefined
                                        return (
                                            <li key={j} className="plan-panel-osoba">
                                                {z ? <PastylkaOsoby href={`/osoby/${o.id}`} plec={z.plec}>{o.nazwa}</PastylkaOsoby> : <b>{o.nazwa}</b>}
                                                {(o.ur || o.zm || z?.rodzina.length) && (
                                                    <span className="plan-panel-drobne">
                                                        {o.ur || o.zm ? `${o.ur ?? '?'} – ${o.zm ?? '?'}` : null}
                                                        {/* P7C-4: rodzice i małżonkowie jako odnośniki do kart osób */}
                                                        {z?.rodzina.map((c, ci) => (
                                                            <React.Fragment key={c.etykieta + ci}>
                                                                {(ci > 0 || o.ur || o.zm) && ' · '}{c.etykieta}:{' '}
                                                                {c.osoby.map((x, xi) => <React.Fragment key={x.id}>{xi > 0 && ' i '}<a href={`/osoby/${x.id}`} className="odn">{x.nazwa}</a></React.Fragment>)}
                                                            </React.Fragment>
                                                        ))}
                                                    </span>
                                                )}
                                            </li>
                                        )
                                    })}
                                    {!pochowani.length && el.nazwa && <li className="plan-panel-osoba"><b>{el.nazwa}</b></li>}
                                </ul>
                            </CalyPanelu>
                        </>
                    )}
                    <WierszPanelu e="czas">{el.czas}</WierszPanelu>
                    <WierszPanelu e="stan">{el.stan && el.stan !== 'istnieje' ? (el.stan === 'nie-istnieje' ? 'nie istnieje' : 'do sprawdzenia') : null}</WierszPanelu>
                    {el.napis && (
                        <>
                            <CzescPanelu tytul="napis na nagrobku">transkrypcja dosłowna</CzescPanelu>
                            <CalyPanelu><pre className="plan-napis">{el.napis}</pre></CalyPanelu>
                        </>
                    )}
                    {el.zrodla && (
                        <>
                            <CzescPanelu tytul="weryfikacja w źródłach" />
                            <CalyPanelu><p className="plan-panel-tekst plan-panel-zachowaj">{el.zrodla}</p></CalyPanelu>
                        </>
                    )}
                    {el.opis && <CalyPanelu><p className="plan-panel-tekst plan-panel-zachowaj">{el.opis}</p></CalyPanelu>}
                    {(el.nazwaZrodlowa || el.identyfikacja || el.odnosniki?.length || el.podstawa?.length) && <CalyPanelu><OpisElementu e={el} /></CalyPanelu>}
                    {!pochowani.length && !el.nazwa && !el.napis && <CalyPanelu><p className="plan-panel-pusto">Napis nie został jeszcze odczytany.</p></CalyPanelu>}
                    {el.zdjecia && el.zdjecia.length > 0 && (
                        <>
                            <CzescPanelu tytul="zdjęcia">{el.zdjecia.length}</CzescPanelu>
                            <CalyPanelu>
                                <div className="plan-panel-zdjecia">
                                    {el.zdjecia.map((z, j) => (
                                        <button key={z.plik} type="button" className="plan-panel-zdjecie" onClick={() => otworzFoto(j)} aria-label={`powiększ zdjęcie ${j + 1}`}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={`/plany/${plan.slug}/zdjecie/${z.plik}`} alt="" loading="lazy" />
                                        </button>
                                    ))}
                                </div>
                            </CalyPanelu>
                        </>
                    )}
                </>
            )}
            <CzescPanelu tytul="dodaj informację" />
            <CalyPanelu>
                <div className="plan-panel-zgloszenie">
                    {stanWysylki === 'wyslana' && <span className="plan-panel-drobne">Dziękuję – wiadomość trafiła do autora strony.</span>}
                    {stanWysylki === 'blad' && <span className="plan-panel-blad" role="alert">Nie udało się wysłać. Spróbuj za chwilę.</span>}
                    {forma === null && <>
                        <button type="button" onClick={() => { ustawForme('informacja'); ustawStanWysylki('') }} className="plan-panel-odn">znasz tę osobę albo masz zdjęcie? dodaj informację</button>
                        <button type="button" onClick={() => { ustawForme('prosba'); ustawStanWysylki('') }} className="plan-panel-odn plan-panel-odn-cichy">poproś o usunięcie albo poprawkę</button>
                    </>}
                    {forma !== null && (
                        <>
                            <textarea value={tresc} onChange={(e) => ustawTresc(e.target.value)} rows={4} maxLength={2000} className="plan-pole" aria-label="treść wiadomości"
                                placeholder={forma === 'informacja' ? 'Co wiesz o pochowanych? Daty, rodzina, poprawny odczyt napisu. Zdjęcie – napisz, jak możesz je przesłać.' : 'Czego dotyczy prośba? (np. jestem z rodziny i proszę o ukrycie napisu)'} />
                            <input value={kontakt} onChange={(e) => ustawKontakt(e.target.value)} maxLength={200} className="plan-pole" aria-label="kontakt do Ciebie" placeholder="kontakt do Ciebie (nieobowiązkowy, nie będzie pokazany)" />
                            <span className="plan-panel-przyciski">
                                <button type="button" onClick={wyslij} disabled={tresc.trim().length < 3} className="k-btn k-btn--s k-btn--glowny">wyślij</button>
                                <button type="button" onClick={() => ustawForme(null)} className="k-btn k-btn--s">anuluj</button>
                            </span>
                        </>
                    )}
                </div>
            </CalyPanelu>
        </>
    )
}

// ---------- groby rodziny ----------
export function PanelRodziny({ rodzina, numery, wybierz }: { rodzina: Rodzina; numery: Map<string, Numer>; wybierz: (e: Element) => void }) {
    const naPlanie = rodzina.krewni.filter((k) => k.grob), poza = rodzina.krewni.filter((k) => !k.grob)
    return (
        <>
            <CzescPanelu tytul={rodzina.wlasne.map((o) => o.nazwa).join(', ')}>wg drzewa</CzescPanelu>
            {naPlanie.length === 0 && <CalyPanelu><p className="plan-panel-pusto">Nikt z rodziny nie jest jeszcze połączony z grobem na tym planie.</p></CalyPanelu>}
            {naPlanie.length > 0 && (
                <ul className="plan-panel-wyniki">
                    {naPlanie.map((k) => (
                        <li key={k.id}>
                            <button type="button" className="plan-krewny" onClick={() => wybierz(k.grob!)}>
                                <span className="plan-rodzina-probka" aria-hidden="true" />
                                <span className="plan-krewny-opis"><b>{k.nazwa}</b><span className="plan-panel-drobne">{k.relacja}{k.lata ? ` · ${k.lata}` : ''}{rodzina.wlasne.length > 1 ? ` · (${k.wzgledem})` : ''}</span></span>
                                <span className="plan-panel-wynik-nr">{numerKrotki(numery.get(k.grob!.id))}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {poza.length > 0 && (
                <>
                    <CzescPanelu tytul="w drzewie, nie ma ich na tym planie" />
                    <CalyPanelu>
                        <ul className="plan-panel-osoby">
                            {poza.map((k) => <li key={k.id}><a href={`/osoby/${k.id}`} className="odn">{k.nazwa}</a> <span className="plan-panel-drobne">· {k.relacja}{k.lata ? ` · ${k.lata}` : ''}</span></li>)}
                        </ul>
                        <p className="plan-panel-drobne">Wiesz, gdzie są pochowani? Napisz przez „dodaj informację” przy grobie.</p>
                    </CalyPanelu>
                </>
            )}
        </>
    )
}

/** Krótki opis elementu (wyniki, podpowiedź po najechaniu): grób – pochowani albo napis; inny – nazwa. Bez treści ukrytej. */
export function opisElementu(e: Element, t: TypElementu | undefined, n?: Numer): string {
    if (typGrobu(t)) {
        const kto = e.ograniczony ? 'grób – opis niedostępny publicznie' : e.osoby?.map((o) => o.nazwa).filter(Boolean).join(', ') || e.nazwa || (e.napis ? e.napis.split('\n').find((l) => /\p{L}{3,}/u.test(l))?.trim() : '') || 'grób'
        return `${kto}${n ? ` · ${numerKrotki(n)}` : ''}`
    }
    return e.nazwa?.split('\n').join(' ') || e.nazwaZrodlowa || t?.nazwa.replace(/ \(.*\)$/, '') || ''
}

'use client'
// Zgłoszenia czytelników w jednej kolejce: ze stron (poprawki, nowe miejsca, materiały) i z planów (prośby do grobów).
// Nic nie trafia na stronę automatycznie; kontakt widać tylko w panelu.
import * as React from 'react'
import { kiedy, useDane, wyslijJson } from '../wspolne'

type Stan = 'nowe' | 'odlozone' | 'zalatwione' | 'odrzucone'
type Zgl = { id: string; zrodlo: 'strona' | 'plan'; rodzaj: string; tytul: string; adres: string | null; doPoprawy: string | null; tresc: string; kontakt: string; data: string; stan: Stan; notatka: string }

const STAN: Record<Stan, string> = { nowe: 'nowe', odlozone: 'odłożone', zalatwione: 'załatwione', odrzucone: 'odrzucone' }
const WIDOK = { czeka: 'czekają', zalatwione: 'załatwione', odrzucone: 'odrzucone' } as const
type Widok = keyof typeof WIDOK
const ZRODLO = { wszystkie: 'wszystkie', strona: 'ze stron', plan: 'z planów' } as const
type Zrodlo = keyof typeof ZRODLO

const pasuje = (z: Zgl, w: Widok) => (w === 'czeka' ? z.stan === 'nowe' || z.stan === 'odlozone' : z.stan === w)
const email = (k: string) => k.match(/[^\s<>()@,;:]+@[^\s<>()@,;:]+\.[a-z]{2,}/i)?.[0] ?? null

export default function Zgloszenia() {
    const { dane, blad, odswiez } = useDane<Zgl[]>('/api/keystatic/panel/zgloszenia')
    const [widok, ustawWidok] = React.useState<Widok>('czeka')
    const [zrodlo, ustawZrodlo] = React.useState<Zrodlo>('wszystkie')
    const [wybrane, ustawWybrane] = React.useState<string | null>(null)
    const [notatka, ustawNotatka] = React.useState('')
    const [kom, ustawKom] = React.useState('')
    const L = (dane ?? []).filter((z) => pasuje(z, widok) && (zrodlo === 'wszystkie' || z.zrodlo === zrodlo))
    const z = L.find((x) => `${x.zrodlo}/${x.id}` === wybrane) ?? L[0] ?? null
    React.useEffect(() => { ustawNotatka(z?.notatka ?? '') }, [z?.id, z?.notatka]) // eslint-disable-line react-hooks/exhaustive-deps
    const ile = (w: Widok) => (dane ?? []).filter((x) => pasuje(x, w)).length

    const zmien = async (zm: { stan?: Stan; notatka?: string }) => {
        if (!z) return
        const b = await wyslijJson('/api/keystatic/panel/zgloszenia', 'PATCH', { zrodlo: z.zrodlo, id: z.id, ...zm })
        ustawKom(b ?? (zm.stan ? `Oznaczono: ${STAN[zm.stan]}.` : 'Notatka zapisana.'))
        odswiez()
    }
    const usun = async () => {
        if (!z || !confirm('Usunąć to zgłoszenie na stałe – razem z danymi kontaktowymi?')) return
        const b = await wyslijJson(`/api/keystatic/panel/zgloszenia?zrodlo=${z.zrodlo}&id=${encodeURIComponent(z.id)}`, 'DELETE')
        ustawKom(b ?? 'Usunięto.'); ustawWybrane(null); odswiez()
    }
    const mail = z ? email(z.kontakt) : null

    return (
        <>
            <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <h1>zgłoszenia czytelników</h1>
                <span className="pn-szary" style={{ fontSize: 12.5 }}>nic nie trafia na stronę bez Twojej decyzji · dane kontaktowe widzisz tylko Ty</span>
            </header>
            {blad && <p className="pn-kom" style={{ margin: 0 }}>{blad}</p>}
            {kom && <p className="pn-info" style={{ margin: 0 }} role="status">{kom}</p>}

            <div className="pn-rzad" style={{ justifyContent: 'space-between' }}>
                <div className="pn-seg" role="group" aria-label="stan">
                    {(Object.keys(WIDOK) as Widok[]).map((w) => <button key={w} type="button" aria-pressed={widok === w} onClick={() => { ustawWidok(w); ustawWybrane(null) }}>{WIDOK[w]} {ile(w)}</button>)}
                </div>
                <div className="pn-seg" role="group" aria-label="skąd">
                    {(Object.keys(ZRODLO) as Zrodlo[]).map((w) => <button key={w} type="button" aria-pressed={zrodlo === w} onClick={() => { ustawZrodlo(w); ustawWybrane(null) }}>{ZRODLO[w]}</button>)}
                </div>
            </div>

            {dane && L.length === 0 && <p className="pn-szary" style={{ margin: 0 }}>{widok === 'czeka' ? 'Nic nie czeka – wszystkie zgłoszenia załatwione.' : 'Pusto.'}</p>}

            {L.length > 0 && (
                <div className="pn-rzad" style={{ alignItems: 'flex-start', gap: 16 }}>
                    <section aria-label="lista zgłoszeń" style={{ flex: '1 1 340px', minWidth: 0, border: '1px solid var(--linia)', borderRadius: 8, overflow: 'hidden' }}>
                        {L.map((x) => (
                            <button key={`${x.zrodlo}/${x.id}`} type="button" className="pn-zgl" aria-current={x === z} onClick={() => ustawWybrane(`${x.zrodlo}/${x.id}`)}>
                                <span className="pn-rzad" style={{ gap: 8 }}>
                                    <span className="pn-tag">{x.zrodlo === 'plan' ? 'grób' : x.rodzaj}</span>
                                    {x.stan === 'odlozone' && <span className="pn-tag">odłożone</span>}
                                    <span className="pn-maly" style={{ marginLeft: 'auto' }}>{kiedy(x.data)}</span>
                                </span>
                                <span className="pn-maly" style={{ overflowWrap: 'anywhere' }}>{x.tytul}</span>
                                <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{x.tresc}</span>
                            </button>
                        ))}
                    </section>

                    {z && (
                        <section className="pn-karta" aria-labelledby="zgl-t" style={{ flex: '1.3 1 400px' }}>
                            <div className="pn-rzad">
                                <span className="pn-tag">{z.rodzaj}</span>
                                <span className="pn-tag">{STAN[z.stan]}</span>
                            </div>
                            <h2 id="zgl-t" style={{ overflowWrap: 'anywhere' }}>{z.tytul}</h2>
                            <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{z.tresc}</p>
                            <dl className="pn-dl">
                                <dt>kontakt</dt><dd>{z.kontakt || <span className="pn-szary">nie podano</span>}</dd>
                                <dt>wysłano</dt><dd>{new Date(z.data).toLocaleString('pl-PL')}</dd>
                                {z.adres && <><dt>strona</dt><dd><a href={z.adres} target="_blank" rel="noreferrer">{z.adres} ↗</a></dd></>}
                            </dl>
                            <div className="pn-rzad">
                                {z.doPoprawy && <a className="pn-btn pn-btn-gl" href={z.doPoprawy} target="_blank" rel="noreferrer">otwórz do poprawy ↗</a>}
                                {mail && <a className="pn-btn" href={`mailto:${mail}?subject=${encodeURIComponent('odniepamieci.pl – Twoje zgłoszenie')}`}>odpowiedz e-mailem</a>}
                            </div>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span className="pn-etyk">notatka dla siebie</span>
                                <textarea className="pn-in" rows={3} value={notatka} onChange={(e) => ustawNotatka(e.target.value)} placeholder="np. sprawdzić w księdze przed zmianą" />
                            </label>
                            <div className="pn-rzad">
                                {notatka !== z.notatka && <button type="button" className="pn-btn" onClick={() => zmien({ notatka })}>zapisz notatkę</button>}
                                {z.stan !== 'zalatwione' && <button type="button" className="pn-btn" onClick={() => zmien({ stan: 'zalatwione', ...(notatka !== z.notatka ? { notatka } : {}) })}>załatwione ✓</button>}
                                {z.stan === 'nowe' && <button type="button" className="pn-btn" onClick={() => zmien({ stan: 'odlozone' })}>odłóż</button>}
                                {z.stan !== 'odrzucone' && <button type="button" className="pn-btn" onClick={() => zmien({ stan: 'odrzucone' })}>odrzuć</button>}
                                {(z.stan === 'zalatwione' || z.stan === 'odrzucone' || z.stan === 'odlozone') && <button type="button" className="pn-btn" onClick={() => zmien({ stan: 'nowe' })}>z powrotem do nowych</button>}
                                <button type="button" className="pn-btn" style={{ marginLeft: 'auto' }} onClick={usun}>usuń na stałe</button>
                            </div>
                            {(z.stan === 'zalatwione' || z.stan === 'odrzucone') && z.kontakt && <span className="pn-maly">Sprawa zamknięta – jeśli kontakt nie będzie już potrzebny, usuń zgłoszenie razem z danymi.</span>}
                        </section>
                    )}
                </div>
            )}
        </>
    )
}

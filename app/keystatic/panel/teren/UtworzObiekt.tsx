'use client'
// P7c (TER-04): „utwórz obiekt…” ze skrzynki „z terenu” – podgląd pól w oknie panelu, zapis jako operacja z „cofnij”.
// Obiekt powstaje z widocznością „tylko ja”; zdjęcia są kopiowane (wpis w skrzynce zostaje).
import * as React from 'react'
import { Okno } from '../okno'
import type { PolaObiektu } from '@/lib/teren/obiekt'
import type { MiejsceTerenu } from '@/lib/teren/miejsca'

type Podglad = { szkic: PolaObiektu; rodzaje: [string, string][]; miejsca: { id: string; nazwa: string }[]; slug: string; mozna: boolean; powod?: string }

export function UtworzObiekt({ wpis, onGotowe }: { wpis: MiejsceTerenu; onGotowe: (kom: string) => void }) {
    const [otwarte, ustawOtwarte] = React.useState(false)
    const [p, ustawP] = React.useState<Podglad | null>(null)
    const [pola, ustawPola] = React.useState<PolaObiektu | null>(null)
    const [blad, ustawBlad] = React.useState('')
    const [trwa, ustawTrwa] = React.useState(false)
    const id = React.useId()
    const otworz = async () => {
        ustawBlad(''); ustawP(null); ustawPola(null); ustawOtwarte(true)
        const r = await fetch(`/api/keystatic/teren/miejsca/${wpis.id}/obiekt`, { cache: 'no-store' }).catch(() => null)
        const j = await r?.json().catch(() => null)
        if (!r?.ok || !j) { ustawBlad(j?.blad ?? 'Nie udało się wczytać podglądu.'); return }
        ustawP(j); ustawPola(j.szkic)
    }
    const zmien = <K extends keyof PolaObiektu>(k: K, v: PolaObiektu[K]) => ustawPola((x) => (x ? { ...x, [k]: v } : x))
    const zapisz = async () => {
        if (!pola) return
        ustawTrwa(true); ustawBlad('')
        const r = await fetch(`/api/keystatic/teren/miejsca/${wpis.id}/obiekt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pola) }).catch(() => null)
        const j = await r?.json().catch(() => null)
        ustawTrwa(false)
        if (!r?.ok) { ustawBlad(j?.blad ?? 'Nie udało się zapisać.'); return }
        ustawOtwarte(false)
        onGotowe(`Obiekt „${j.nazwa}” utworzony jako „tylko ja”. Cofnięcie: panel → operacje.`)
    }
    const zamknij = React.useCallback(() => ustawOtwarte(false), [])
    return (
        <>
            <button type="button" className="pn-btn pn-btn-gl" onClick={otworz}>utwórz obiekt…</button>
            <Okno otwarte={otwarte} tytul="nowy obiekt z wpisu" onZamknij={zamknij} stopka={<>
                <button type="button" className="pn-btn" onClick={zamknij}>anuluj</button>
                <button type="button" className="pn-btn pn-btn-gl" disabled={!p?.mozna || !pola || trwa || !pola.nazwa.trim() || !pola.rodzaj} onClick={zapisz}>{trwa ? 'zapisuję…' : 'utwórz obiekt'}</button>
            </>}>
                {!p && !blad && <span className="pn-szary">Wczytuję…</span>}
                {p && pola && (
                    <div className="pn-form-kol">
                        <span className="pn-podp">Obiekt powstanie jako <strong>„tylko ja”</strong> – na stronie pojawi się dopiero, gdy zmienisz widoczność w jego karcie. Zdjęcia zostaną skopiowane, wpis w skrzynce zostaje. Identyfikator: <code>{p.slug}</code> (może się zmienić razem z nazwą).</span>
                        {!p.mozna && <p className="pn-ostrz pn-bez-marginesu" role="alert"><span>{p.powod}</span></p>}
                        <label className="pn-pole">nazwa<input className="pn-in" value={pola.nazwa} maxLength={120} onChange={(e) => zmien('nazwa', e.target.value)} /></label>
                        <label className="pn-pole">rodzaj obiektu
                            <select className="pn-in" value={pola.rodzaj} onChange={(e) => zmien('rodzaj', e.target.value)}>
                                {!pola.rodzaj && <option value="">– wybierz –</option>}
                                {p.rodzaje.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                            </select>
                            {!p.szkic.rodzaj && <span className="pn-podp">Z telefonu: „{wpis.rodzaj === 'cmentarz' ? 'cmentarz' : 'coś innego'}” – wybierz właściwy rodzaj.</span>}
                        </label>
                        <label className="pn-pole">miejscowość
                            <select className="pn-in" value={pola.miejsce} onChange={(e) => zmien('miejsce', e.target.value)}>
                                <option value="">– bez miejscowości –</option>
                                {p.miejsca.map((m) => <option key={m.id} value={m.id}>{m.nazwa}</option>)}
                            </select>
                        </label>
                        <label className="pn-pole">współrzędne<input className="pn-in" value={pola.wspolrzedne} placeholder="52.2116, 22.7185" onChange={(e) => zmien('wspolrzedne', e.target.value)} />
                            {wpis.dokl !== undefined && <span className="pn-podp">Z telefonu, dokładność ±{wpis.dokl} m.</span>}</label>
                        <label className="pn-rzad"><input type="checkbox" checked={pola.przyblizone} onChange={(e) => zmien('przyblizone', e.target.checked)} /> położenie przybliżone</label>
                        <label className="pn-rzad"><input type="checkbox" checked={pola.istnieje} onChange={(e) => zmien('istnieje', e.target.checked)} /> istnieje do dziś</label>
                        {wpis.zdjecia.length > 0 && (
                            <fieldset className="pn-kol pn-pole-zbior">
                                <legend className="pn-etyk" id={`${id}-zd`}>zdjęcia do obiektu ({pola.zdjecia.length} z {wpis.zdjecia.length})</legend>
                                <div className="tr-zdjecia">
                                    {wpis.zdjecia.map((f, i) => (
                                        <label key={f.plik} className="tr-zdjecie">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={`/api/keystatic/teren/miejsca/${wpis.id}/plik/${f.plik}`} alt="" loading="lazy" />
                                            <input type="checkbox" aria-label={`zdjęcie ${i + 1}`} checked={pola.zdjecia.includes(f.plik)}
                                                onChange={(e) => zmien('zdjecia', e.target.checked ? wpis.zdjecia.map((z) => z.plik).filter((x) => x === f.plik || pola.zdjecia.includes(x)) : pola.zdjecia.filter((x) => x !== f.plik))} />
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        )}
                        {pola.zdjecia.length > 0 && <label className="pn-pole">autor zdjęć<input className="pn-in" value={pola.autor} maxLength={120} onChange={(e) => zmien('autor', e.target.value)} />
                            <span className="pn-podp">Podpis przy zdjęciach na karcie obiektu. Puste – bez podpisu.</span></label>}
                    </div>
                )}
                {blad && <p className="pn-ostrz pn-bez-marginesu" role="alert"><span>{blad}</span></p>}
            </Okno>
        </>
    )
}

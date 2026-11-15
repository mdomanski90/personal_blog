'use client'
import * as React from 'react'

const PRESETY = [
    ['fiolet', '#4c3cc4'], ['granat', '#1e40af'], ['morski', '#155e75'],
    ['zieleń', '#166534'], ['burgund', '#7f1d1d'], ['brąz', '#92400e'],
] as const

type Stan = { wybrany: string; jasny: string; ciemny: string; kontrastJasny: number; kontrastCiemny: number; domyslny: string }
export default function Wyglad() {
    const [stan, ustawStan] = React.useState<Stan | null>(null)
    const [kolor, ustawKolor] = React.useState('#4c3cc4')
    const [kom, ustawKom] = React.useState('')
    const [trwa, ustawTrwa] = React.useState(false)
    React.useEffect(() => {
        fetch('/api/keystatic/panel/wyglad', { cache: 'no-store' })
            .then(async r => { if (!r.ok) throw new Error('Brak dostępu do ustawień.'); return r.json() })
            .then((d: Stan) => { ustawStan(d); ustawKolor(d.wybrany) })
            .catch((e: Error) => ustawKom(e.message))
    }, [])
    const valid = /^#[0-9a-fA-F]{6}$/.test(kolor)
    const zapisz = async (przywroc = false) => {
        ustawTrwa(true); ustawKom('')
        try {
            const r = await fetch('/api/keystatic/panel/wyglad', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(przywroc ? { przywroc: true } : { akcent: kolor }),
            })
            const d = await r.json()
            if (!r.ok) throw new Error(d.blad || 'Nie udało się zapisać koloru')
            ustawStan(d); ustawKolor(d.wybrany)
            ustawKom('Zapisano. Odśwież podgląd strony w drugiej karcie, aby zobaczyć nowy akcent.')
        } catch (e) { ustawKom(e instanceof Error ? e.message : 'Błąd zapisu') }
        finally { ustawTrwa(false) }
    }
    return <>
        <header className="pn-rzad" style={{ justifyContent: 'space-between' }}>
            <div><h1>wygląd strony</h1><p className="pn-maly">kolor akcentu · nie zmieniamy pozostałej stylistyki</p></div>
            <a className="pn-btn" href="/" target="_blank" rel="noreferrer">zobacz stronę ↗</a>
        </header>
        <section className="pn-karta" style={{ maxWidth: 720 }}>
            <h2>kolor akcentu</h2>
            <p className="pn-maly">Wybierz jeden z kolorów lub wpisz własny HEX. System dobierze jego jasną i ciemną odmianę zapewniającą kontrast tekstu co najmniej 4,5:1.</p>
            <div className="pn-rzad">{PRESETY.map(([nazwa, wartosc]) => <button key={wartosc} type="button" className="pn-btn" aria-pressed={kolor.toLowerCase() === wartosc}
                onClick={() => ustawKolor(wartosc)} style={{ borderColor: kolor.toLowerCase() === wartosc ? 'var(--tekst)' : undefined }}>
                <span style={{ width: 18, height: 18, borderRadius: 4, background: wartosc, border: '1px solid #888' }} />{nazwa}</button>)}</div>
            <label className="pn-rzad" style={{ gap: 12 }}>
                <span>wybrany:</span>
                <input type="color" aria-label="kolor akcentu" value={valid ? kolor : '#4c3cc4'} onChange={e => ustawKolor(e.target.value)} />
                <input className="pn-in" aria-label="wartość HEX" value={kolor} onChange={e => ustawKolor(e.target.value)} maxLength={7} style={{ width: 120 }} />
            </label>
            {stan && <div className="pn-rzad" style={{ alignItems: 'stretch', gap: 12 }}>
                {([['jasny', stan.jasny, '#fbfaf7', stan.kontrastJasny], ['ciemny', stan.ciemny, '#15171a', stan.kontrastCiemny]] as const).map(([n, akcent, tlo, kr]) =>
                    <div key={n} style={{ flex: '1 1 240px', padding: 16, background: tlo, color: n === 'jasny' ? '#1c1b18' : '#eee', border: '1px solid #888', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, marginBottom: 12 }}>{n} motyw · kontrast {kr.toFixed(2)}:1</div>
                        <div style={{ color: akcent, fontWeight: 700, textDecoration: 'underline' }}>przykładowy link</div>
                        <div style={{ marginTop: 10, border: `2px solid ${akcent}`, borderRadius: 6, padding: 8, color: akcent }}>aktywna zakładka</div>
                    </div>)}</div>}
            <span className="pn-maly">Podgląd powyżej pokazuje kolor ostatnio zapisany; nowy kolor zobaczysz po zapisaniu. Nie wpływa na kolory ostrzeżeń i typów obiektów.</span>
            <div className="pn-rzad">
                <button className="pn-btn pn-btn-gl" type="button" disabled={!valid || trwa} onClick={() => zapisz()}>zapisz kolor</button>
                <button className="pn-btn" type="button" disabled={trwa} onClick={() => zapisz(true)}>przywróć domyślny</button>
            </div>
            {kom && <p className="pn-info" role="status">{kom}</p>}
        </section>
        <section className="pn-karta" style={{ maxWidth: 720 }}>
            <h2>wstępy stron</h2>
            <p>Wstępy, tytuły i linki redakcyjne działów można edytować w Keystatic. Dopóki pole pozostaje puste, zachowana jest dotychczasowa treść strony.</p>
            <a href="/keystatic/singleton/wstepyDzialow" className="pn-btn">edytuj wstępy w Keystatic →</a>
        </section>
    </>
}

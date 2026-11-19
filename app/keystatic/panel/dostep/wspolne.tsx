'use client'
// P7a (KON-01): wspólne części ekranów „konta i dostęp” – typy odpowiedzi API, okno z linkiem i kodem QR, wybór zakresu.
import * as React from 'react'
import { Okno } from '../okno'

export type Uprawnienie = { klucz: string; nazwa: string; dzial?: boolean; pozniej?: boolean }
export type Rola = { klucz: string; nazwa: string; opis: string; uprawnienia: string[] }
export type Krag = { id: string; nazwa: string }
export type Zakres = { kregi: string[]; miejsca: string[] }
export type Zaproszenie = { imie: string; link: string; do: string; qr: { rozmiar: number; sciezka: string } }

export const dzien = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }) : '—')
export const nazwaUprawnienia = (u: Uprawnienie) => (u.pozniej ? `${u.nazwa} · od etapu „teren”` : u.nazwa)

export async function wyslij<T = { ok?: boolean }>(dane: unknown): Promise<{ wynik: T | null; blad: string | null }> {
    const r = await fetch('/api/keystatic/panel/konta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dane) }).catch(() => null)
    if (!r) return { wynik: null, blad: 'Brak połączenia z serwerem.' }
    const j = (await r.json().catch(() => ({}))) as T & { blad?: string }
    return r.ok ? { wynik: j, blad: null } : { wynik: null, blad: j.blad ?? `Błąd serwera ${r.status}` }
}

/** Link z zaproszenia: pole do skopiowania i kod QR (ciemny na jasnym także w motywie ciemnym – tak czytają go telefony). */
export function OknoLinku({ z, tytul, onZamknij, onKolejna }: { z: Zaproszenie | null; tytul: string; onZamknij: () => void; onKolejna?: () => void }) {
    const [skopiowano, ustawSkopiowano] = React.useState(false)
    React.useEffect(() => ustawSkopiowano(false), [z])
    return (
        <Okno otwarte={!!z} tytul={tytul} onZamknij={onZamknij} stopka={<>
            {onKolejna && <button type="button" className="pn-btn" onClick={onKolejna}>zaproś kolejną osobę</button>}
            <button type="button" className="pn-btn pn-btn-gl" onClick={onZamknij}>gotowe</button>
        </>}>
            {z && (
                <div className="pn-form-kol">
                    <span>Przekaż ten link osobie „{z.imie}” albo pokaż kod QR (SMS, Signal, na żywo). Link jest <b>jednorazowy</b> i ważny <b>do {dzien(z.do)}</b>. Strona sama niczego nie wysyła.</span>
                    <span className="pn-rzad">
                        <input className="pn-in pn-link-pole" readOnly value={z.link} aria-label="link z zaproszeniem" onFocus={(e) => e.currentTarget.select()} />
                        <button type="button" className="pn-btn" onClick={() => { navigator.clipboard?.writeText(z.link).then(() => ustawSkopiowano(true)) }}>{skopiowano ? 'skopiowano' : 'kopiuj'}</button>
                    </span>
                    <svg className="pn-qr" viewBox={`0 0 ${z.qr.rozmiar} ${z.qr.rozmiar}`} role="img" aria-label="kod QR z linkiem zaproszenia" shapeRendering="crispEdges"><path d={z.qr.sciezka} /></svg>
                    <span className="pn-maly">Po otwarciu linku osoba zobaczy, kto ją zaprasza i co będzie mogła robić, a potem połączy swój telefon albo komputer. Konto pojawi się na liście jako „aktywne”. Tego linku nie da się wyświetlić ponownie – w razie potrzeby utwórz nowy.</span>
                </div>
            )}
        </Okno>
    )
}

/** Zakres miejscowości: wszystkie albo wybrane kręgi i miejscowości (identyfikatory miejscowości z adresu strony, np. „testowo”). */
export function WyborZakresu({ zakres, kregi, onZmiana }: { zakres: Zakres; kregi: Krag[]; onZmiana: (z: Zakres) => void }) {
    const wszystkie = !zakres.kregi.length && !zakres.miejsca.length
    const [wybrane, ustawWybrane] = React.useState(zakres.miejsca.length > 0)
    const przelacz = (id: string) => onZmiana({ ...zakres, kregi: zakres.kregi.includes(id) ? zakres.kregi.filter((x) => x !== id) : [...zakres.kregi, id] })
    return (
        <div className="pn-form-kol">
            <div className="pn-pastylki" role="group" aria-label="zakres miejscowości">
                <button type="button" className="pn-pastylka" aria-pressed={wszystkie && !wybrane} onClick={() => { ustawWybrane(false); onZmiana({ kregi: [], miejsca: [] }) }}>wszystkie</button>
                {kregi.map((k) => <button key={k.id} type="button" className="pn-pastylka" aria-pressed={zakres.kregi.includes(k.id)} onClick={() => przelacz(k.id)}>{k.nazwa}</button>)}
                <button type="button" className="pn-pastylka" aria-pressed={wybrane} onClick={() => { if (wybrane) onZmiana({ ...zakres, miejsca: [] }); ustawWybrane(!wybrane) }}>wybrane…</button>
            </div>
            {wybrane && (
                <label className="pn-pole">miejscowości – identyfikatory z adresu strony, po przecinku (np. testowo, wola-przykladowa)
                    <input className="pn-in" value={zakres.miejsca.join(', ')} onChange={(e) => onZmiana({ ...zakres, miejsca: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
                </label>
            )}
            <span className="pn-maly">Zakres dotyczy treści z przypisaną miejscowością (miejsca, obiekty, wpisy, materiały archiwum). Treści bez miejscowości – według działów.</span>
        </div>
    )
}

'use client'
// Pole powiązań w panelu (osoby, miejsca, tematy, obiekty, wpisy, materiały – identyfikatory jak w [[…]]):
// znaczniki z nazwą i ✕, pole z podpowiedziami. Wspólne dla objaśnień skanu i elementów planu (PH2).
import * as React from 'react'

export type CelPowiazania = { id: string; nazwa: string; rodzaj: string }
export const RODZAJE_CELU: Record<string, string> = { miejsce: 'miejsce', temat: 'temat', obiekt: 'obiekt', wpis: 'wpis', material: 'materiał', osoba: 'osoba' }

export default function PolePowiazan({ wartosc, cele, zmien, etykieta = 'powiązania – osoby, miejsca, tematy, obiekty', idListy, klasaPola = 'pn-in', klasaZnacznika = 'pn-tag', klasaOpisu = 'pn-maly' }: {
    wartosc: string[]; cele: CelPowiazania[]; zmien: (v: string[]) => void; etykieta?: string; idListy: string
    /** klasy panelu, w którym pole stoi (panel materiałów: pn-…, edytor planów: ed-…) */
    klasaPola?: string; klasaZnacznika?: string; klasaOpisu?: string
}) {
    const nazwa = React.useMemo(() => new Map(cele.map((c) => [c.id, c])), [cele])
    return (
        <div className="pole-powiazan">
            <span className={klasaOpisu}>{etykieta}</span>
            {wartosc.length > 0 && (
                <span className="pole-powiazan-znaczniki">
                    {wartosc.map((p) => (
                        <span key={p} className={`${klasaZnacznika} pole-powiazan-znacznik`}>
                            {nazwa.get(p)?.nazwa ?? <s title="nie ma takiego identyfikatora">{p}</s>}
                            <button type="button" className="pole-powiazan-usun" onClick={() => zmien(wartosc.filter((x) => x !== p))} aria-label={`usuń ${p}`}>✕</button>
                        </span>
                    ))}
                </span>
            )}
            <input className={klasaPola} list={idListy} placeholder="zacznij pisać nazwę…" aria-label={etykieta} onChange={(e) => {
                const v = e.target.value
                if (nazwa.has(v) && !wartosc.includes(v)) { zmien([...wartosc, v]); e.target.value = '' }
            }} />
            <datalist id={idListy}>
                {cele.map((c) => <option key={`${c.rodzaj}:${c.id}`} value={c.id}>{`${c.nazwa} · ${RODZAJE_CELU[c.rodzaj] ?? c.rodzaj}`}</option>)}
            </datalist>
        </div>
    )
}

/** Style pola – wstawiane raz na stronę panelu (panel ma własne arkusze w komponentach). */
export const CSS_POLA_POWIAZAN = `.pole-powiazan{display:flex;flex-direction:column;gap:4px}.pole-powiazan-znaczniki{display:flex;flex-wrap:wrap;gap:4px}.pole-powiazan-znacznik{display:inline-flex;gap:4px;align-items:center}.pole-powiazan-usun{border:0;background:none;cursor:pointer;padding:0;color:inherit}`

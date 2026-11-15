'use client'
import * as React from 'react'
import { MIEJSCA, WZORCE, type Status } from '@/lib/szablony/rejestr'

const STATUSY: Record<Status, { nazwa: string; klasa: string }> = {
    'zgodne': { nazwa: 'zgodne', klasa: 'sz-ok' },
    'do-ujednolicenia': { nazwa: 'do ujednolicenia', klasa: 'sz-zle' },
    'swiadomie-inne': { nazwa: 'świadomie inne', klasa: 'sz-inne' },
}

/**
 * P7G: mapa szablonów – który rodzaj treści, gdzie i jakim wzorcem jest wyświetlany.
 * Dane: lib/szablony/rejestr.ts (pilnowane testem w npm test). Na razie tylko podgląd;
 * przełączniki zatwierdzonych wariantów – osobny etap.
 */
export default function MapaSzablonow() {
    const [byt, ustawByt] = React.useState('')
    const [status, ustawStatus] = React.useState<'' | Status>('')
    const byty = [...new Set(MIEJSCA.map((m) => m.byt))]
    const lista = MIEJSCA.filter((m) => (!byt || m.byt === byt) && (!status || m.status === status))
    const ile = (s: Status) => MIEJSCA.filter((m) => m.status === s).length
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <style>{`
.sz-ok{background:#e6f2ea;color:#1f5130;border-color:#a8cdb5}
.sz-zle{background:#fbe9e7;color:#8a1f12;border-color:#e3a99f}
.sz-inne{background:#eef0f6;color:#30395c;border-color:#b8bfd6}
.sz-tab{width:100%;border-collapse:collapse;font-size:13.5px}
.sz-tab th{text-align:left;font-weight:600;color:var(--szary);font-size:12px;padding:6px 8px;border-bottom:1px solid var(--linia)}
.sz-tab td{padding:8px;border-bottom:1px solid var(--linia);vertical-align:top}
.sz-tab code{font-size:12px;word-break:break-all}
.sz-wz{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:10px}
@media (max-width:760px){.sz-tab thead{display:none}.sz-tab tr{display:block;border-bottom:1px solid var(--linia);padding:6px 0}.sz-tab td{display:block;border:0;padding:3px 0}}
`}</style>
            <div>
                <h1 style={{ margin: 0 }}>mapa szablonów</h1>
                <p className="pn-szary" style={{ margin: '6px 0 0', maxWidth: '70ch' }}>
                    Gdzie i jakim wzorcem wyświetla się każdy rodzaj treści. Czerwone – miejsca, które mają własny układ zamiast wspólnego wzorca.
                    Mapa jest sprawdzana testem przy każdym buildzie: nowe miejsce z listą treści bez wpisu tutaj zatrzyma wdrożenie.
                    Zmiana wzorca z panelu – w kolejnym etapie (zatwierdzone warianty).
                </p>
            </div>
            <div className="pn-kafle">
                {(Object.keys(STATUSY) as Status[]).map((s) => (
                    <button key={s} type="button" className={`pn-kafel ${status === s ? STATUSY[s].klasa : ''}`} style={{ textAlign: 'left', cursor: 'pointer' }} aria-pressed={status === s} onClick={() => ustawStatus(status === s ? '' : s)}>
                        <span className="pn-liczba">{ile(s)}</span><br /><span className="pn-maly">{STATUSY[s].nazwa}</span>
                    </button>
                ))}
            </div>
            <div className="pn-rzad">
                <label className="pn-maly">rodzaj treści{' '}
                    <select className="pn-in" value={byt} onChange={(e) => ustawByt(e.target.value)}>
                        <option value="">wszystkie</option>{byty.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                </label>
                <span className="pn-maly">{lista.length} z {MIEJSCA.length} miejsc</span>
            </div>
            <table className="sz-tab">
                <thead><tr><th>rodzaj treści</th><th>gdzie</th><th>wzorzec</th><th>stan</th><th>uwagi</th><th>plik · przykład</th></tr></thead>
                <tbody>
                    {lista.map((m, i) => {
                        const w = WZORCE.find((x) => x.id === m.wzorzec)!
                        return (
                            <tr key={i}>
                                <td><b>{m.byt}</b></td>
                                <td>{m.gdzie}</td>
                                <td title={w.opis}>{w.nazwa}<br /><span className="pn-maly">{w.komponent}</span></td>
                                <td><span className={`pn-tag ${STATUSY[m.status].klasa}`}>{STATUSY[m.status].nazwa}</span></td>
                                <td className="pn-maly">{m.uwaga}</td>
                                <td><code>{m.plik}</code><br /><span className="pn-maly">{m.adres.includes('…') || m.adres.includes(' ') ? m.adres : <a href={m.adres} target="_blank" rel="noopener noreferrer">{m.adres} ↗</a>}</span></td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
            <section>
                <h2 style={{ fontSize: 16, margin: '8px 0' }}>wzorce języka wizualnego</h2>
                <div className="sz-wz">
                    {WZORCE.map((w) => (
                        <div key={w.id} className="pn-karta">
                            <b>{w.nazwa}</b> <span className="pn-maly">· {w.komponent}</span>
                            <p className="pn-maly" style={{ margin: '4px 0 0' }}>{w.opis}</p>
                            <p className="pn-maly" style={{ margin: '4px 0 0' }}>używany w: {MIEJSCA.filter((m) => m.wzorzec === w.id).length} miejscach</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}

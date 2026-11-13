'use client'
// Materiały archiwum – wejście do stron skanów (wiele plików na raz, kolejność).
import * as React from 'react'
import { useDane, odmiana } from '../wspolne'

type M = { id: string; nazwa: string; rodzaj: string; czas: string; widocznosc: string; plik: string | null; strony: number }

export default function MaterialyPanel() {
    const { dane, blad } = useDane<M[]>('/api/keystatic/materialy')
    const [q, ustawQ] = React.useState('')
    const L = (dane ?? []).filter((m) => !q || m.nazwa.toLowerCase().includes(q.toLowerCase()))
    return (
        <>
            <div className="pn-rzad" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <h1>materiały – strony skanów</h1>
                    <span className="pn-maly">Opis, sygnaturę i transkrypcję wpisujesz w Keystatic; tu wgrywasz skany stron (kilka naraz) i ustalasz ich kolejność.</span>
                </div>
                <a className="pn-btn" href="/keystatic/collection/materialy/create">+ nowy materiał w Keystatic</a>
            </div>
            {blad && <div className="pn-kom">{blad}</div>}
            <input className="pn-in" placeholder="szukaj materiału…" value={q} onChange={(e) => ustawQ(e.target.value)} style={{ maxWidth: 400 }} />
            <section className="pn-karta">
                {!dane && !blad && <span className="pn-szary">wczytuję…</span>}
                {dane && L.length === 0 && <span className="pn-szary">Brak materiałów. Załóż pierwszy w Keystatic („Materiały (archiwum)”), zapisz go i wróć tutaj.</span>}
                <ul className="pn-lista">
                    {L.map((m) => (
                        <li key={m.id} style={{ alignItems: 'center' }}>
                            <span><a href={`/keystatic/panel/materialy/${m.id}`}><b>{m.nazwa}</b></a> <span className="pn-szary">· {m.rodzaj}{m.czas ? ` · ${m.czas}` : ''}{m.widocznosc !== 'publiczne' ? ` · ${m.widocznosc === 'bliscy' ? 'dla bliskich' : 'tylko ja'}` : ''}</span></span>
                            <span className="pn-rzad" style={{ gap: 8 }}>
                                <span className="pn-tag">{m.strony ? odmiana(m.strony, ['strona', 'strony', 'stron']) : m.plik ? 'jeden plik' : 'bez skanu'}</span>
                                <a className="pn-btn" href={`/keystatic/panel/materialy/${m.id}`}>strony →</a>
                            </span>
                        </li>
                    ))}
                </ul>
            </section>
        </>
    )
}

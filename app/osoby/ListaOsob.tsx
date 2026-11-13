'use client'

// Lista osób z wyszukiwaniem na żywo: każdy wpisany znak zawęża listę, litery z wynikami same się rozwijają.
// Adres strony (?q=…) aktualizowany bez przeładowania – link do wyników da się skopiować.

import * as React from 'react'
import { Link } from 'next-view-transitions'
import PoleSzukania from '../components/PoleSzukania'
import { normalizuj, odmiana } from '@/lib/tekst'

// (jak RAMKA w Uklad.tsx – tamten plik ciągnie komponenty serwerowe)
const RAMKA = 'border border-[#d6d1c6] dark:border-[#4b5563]'

export interface OsobaNaLiscie { id: string; nazwa: string; plec: string; opis: string; biogram?: string; litera: string; szukaj: string }
export interface KragNaLiscie { id: string; nazwa: string; opis: string; ile: number }

export default function ListaOsob({ osoby, kregi, krag, poczatek }: { osoby: OsobaNaLiscie[]; kregi: KragNaLiscie[]; krag: string; poczatek: string }) {
    const [q, ustawQ] = React.useState(poczatek)
    const slowa = normalizuj(q).split(' ').filter(Boolean)
    const szuka = slowa.length > 0
    const lista = szuka ? osoby.filter((o) => slowa.every((s) => o.szukaj.includes(s))) : osoby
    const grupy = new Map<string, OsobaNaLiscie[]>()
    for (const o of lista) grupy.set(o.litera, [...(grupy.get(o.litera) ?? []), o])

    React.useEffect(() => {
        const u = new URL(window.location.href)
        if (q.trim()) u.searchParams.set('q', q.trim())
        else u.searchParams.delete('q')
        window.history.replaceState(window.history.state, '', u.pathname + u.search)
    }, [q])

    const adres = (k: string) => `/osoby?krag=${k}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`
    return (
        <>
            <div className="flex flex-col" style={{ gap: 10 }}>
                <div className="flex flex-wrap items-center" style={{ gap: 8 }} role="group" aria-label="krąg miejscowości">
                    {kregi.map((k) => (
                        <Link key={k.id} href={adres(k.id)} aria-current={krag === k.id ? 'true' : undefined} className={`osoby-krag ${RAMKA}`} title={k.opis}>
                            <b>{k.nazwa}</b> <span className="text-gray-600 dark:text-gray-400">· {k.opis} · {k.ile}</span>
                        </Link>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <PoleSzukania value={q} onChange={ustawQ} onSubmit={ustawQ} placeholder="nazwisko, imię, wieś, rok…" style={{ flex: '1 1 16rem', maxWidth: 480 }} />
                    {szuka && <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: 13 }} aria-live="polite">{odmiana(lista.length, ['wynik', 'wyniki', 'wyników'])}</span>}
                    {szuka && <button type="button" className={`osoby-krag ${RAMKA}`} onClick={() => ustawQ('')}>wyczyść</button>}
                </div>
            </div>
            {osoby.length > 0 && lista.length === 0 && <p className="text-gray-600 dark:text-gray-400">Nikogo tu nie ma{szuka ? ' dla tego wyszukiwania' : ''} – spróbuj „wszyscy”.</p>}
            <div className="osoby-litery">
                {[...grupy].map(([litera, os], i) => (
                    // przy wyszukiwaniu wszystkie litery z wynikami otwarte; bez – pierwsza
                    <details key={`${litera}-${szuka ? 's' : 'n'}`} className="osoba-litera" open={szuka || i === 0}>
                        <summary><b>{litera}</b> <span className="text-gray-600 dark:text-gray-400">· {odmiana(os.length, ['osoba', 'osoby', 'osób'])}</span></summary>
                        <ul className="osoby-lista">
                            {os.map((o) => (
                                <li key={o.id}>
                                    <Link href={`/osoby/${o.id}`} className={`osoba-link osoba-${o.plec}`}>{o.nazwa}</Link>
                                    <span className="text-gray-600 dark:text-gray-400"> {o.opis}</span>
                                    {o.biogram !== undefined && <span className="osoba-biogram"> · {o.biogram || 'biogram'}</span>}
                                </li>
                            ))}
                        </ul>
                    </details>
                ))}
            </div>
        </>
    )
}

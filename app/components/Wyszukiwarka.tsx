'use client'

// Wyszukiwarka w nagłówku z podpowiedziami: po 2 literach lista najlepszych wyników (miejscowości, osoby, wpisy,
// materiały…), pasujący fragment wyróżniony. Strzałki ↑/↓ wybierają, Enter otwiera, Esc zamyka; bez wyboru
// Enter przechodzi na pełne wyniki (/szukaj). Bez JavaScriptu działa jak zwykły formularz GET.
// Wariant „duzy” – na stronie głównej, na całą szerokość; „maly” – na podstronach, obok „← wróć”.

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link } from 'next-view-transitions'

interface Podpowiedz { rodzaj: string; etykieta: string; tytul: string; adres: string; dopisek?: string }

// litera po literze bez znaków diakrytycznych (ł → l), żeby pozycje w tekście się zgadzały
const zwykla = (c: string) => (c === 'ł' || c === 'Ł' ? 'l' : c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().charAt(0) || c)

/** Tytuł z wyróżnionym fragmentem, który pasuje do pierwszego słowa zapytania. */
function Wyrozniony({ tekst, q }: { tekst: string; q: string }) {
    const slowo = q.trim().split(/\s+/)[0] ?? ''
    if (slowo.length < 2) return <>{tekst}</>
    const t = [...tekst].map(zwykla).join('')
    const s = [...slowo].map(zwykla).join('')
    // najpierw początek słowa, potem gdziekolwiek
    let i = t.search(new RegExp(`(^|[^\\p{L}])${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u'))
    if (i >= 0 && !t.startsWith(s, i)) i += 1
    if (i < 0) i = t.indexOf(s)
    if (i < 0) return <>{tekst}</>
    const znaki = [...tekst]
    return <>{znaki.slice(0, i).join('')}<b className="wysz-traf">{znaki.slice(i, i + s.length).join('')}</b>{znaki.slice(i + s.length).join('')}</>
}

export default function Wyszukiwarka({ wariant = 'maly' }: { wariant?: 'duzy' | 'maly' }) {
    const params = useSearchParams()
    const router = useRouter()
    const [q, ustawQ] = React.useState(params?.get('q') ?? '')
    const [lista, ustawListe] = React.useState<{ q: string; wyniki: Podpowiedz[]; razem: number } | null>(null)
    const [otwarta, ustawOtwarta] = React.useState(false)
    const [wybrana, ustawWybrana] = React.useState(-1)
    const id = React.useId()
    const pudelko = React.useRef<HTMLDivElement>(null)

    // pobieranie z opóźnieniem 180 ms; poprzednie zapytanie przerywane
    React.useEffect(() => {
        const z = q.trim()
        if (z.length < 2) { ustawListe(null); return }
        const ac = new AbortController()
        const t = window.setTimeout(() => {
            fetch(`/api/podpowiedzi?q=${encodeURIComponent(z)}`, { signal: ac.signal })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (d) { ustawListe(d); ustawWybrana(-1) } })
                .catch(() => { /* przerwane albo brak sieci – bez podpowiedzi */ })
        }, 180)
        return () => { window.clearTimeout(t); ac.abort() }
    }, [q])

    // klik poza wyszukiwarką zamyka listę
    React.useEffect(() => {
        const klik = (e: MouseEvent) => { if (!pudelko.current?.contains(e.target as Node)) ustawOtwarta(false) }
        document.addEventListener('mousedown', klik)
        return () => document.removeEventListener('mousedown', klik)
    }, [])

    const wyniki = lista && lista.q === q.trim() ? lista.wyniki : []
    const widac = otwarta && q.trim().length >= 2 && !!lista
    const pelne = `/szukaj?q=${encodeURIComponent(q.trim())}`

    const klawisz = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') { if (widac) { e.preventDefault(); ustawOtwarta(false) } return }
        if (!widac || !wyniki.length) { if (e.key === 'ArrowDown') ustawOtwarta(true); return }
        if (e.key === 'ArrowDown') { e.preventDefault(); ustawWybrana((w) => (w + 1) % wyniki.length) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); ustawWybrana((w) => (w <= 0 ? wyniki.length - 1 : w - 1)) }
        else if (e.key === 'Enter' && wybrana >= 0) { e.preventDefault(); ustawOtwarta(false); router.push(wyniki[wybrana].adres) }
    }

    return (
        <div ref={pudelko} className={`wysz wysz-${wariant}`}>
            <form action="/szukaj" method="get" role="search" className="wysz-pole" onSubmit={() => ustawOtwarta(false)}>
                <svg className="wysz-lupa" width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" /><path d="M13 13l5 5" /></svg>
                <input
                    id="szukaj-q"
                    name="q"
                    type="search"
                    role="combobox"
                    aria-label="szukaj na stronie"
                    aria-autocomplete="list"
                    aria-expanded={widac}
                    aria-controls={`${id}-lista`}
                    aria-activedescendant={widac && wybrana >= 0 ? `${id}-${wybrana}` : undefined}
                    autoComplete="off"
                    value={q}
                    onChange={(e) => { ustawQ(e.target.value); ustawOtwarta(true) }}
                    onFocus={() => ustawOtwarta(true)}
                    onKeyDown={klawisz}
                    placeholder={wariant === 'duzy' ? 'wieś, nazwisko, temat…' : 'np. Olszanka, bieżeństwo'}
                />
                <button type="submit">szukaj</button>
            </form>
            {widac && (
                <div className="wysz-lista">
                    {wyniki.length > 0 ? (
                        <ul id={`${id}-lista`} role="listbox" aria-label="podpowiedzi">
                            {wyniki.map((w, i) => (
                                <li key={`${w.rodzaj}:${w.adres}`} id={`${id}-${i}`} role="option" aria-selected={i === wybrana} onMouseEnter={() => ustawWybrana(i)}>
                                    <Link href={w.adres} tabIndex={-1} onClick={() => ustawOtwarta(false)}>
                                        <span className="wysz-rodzaj">{w.etykieta}</span>
                                        <span className="wysz-tytul"><Wyrozniony tekst={w.tytul} q={q} />{w.dopisek && <span className="wysz-dopisek"> · {w.dopisek}</span>}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p id={`${id}-lista`} className="wysz-pusto">nic nie pasuje do „{q.trim()}” – spróbuj innej formy albo krótszego słowa</p>
                    )}
                    <div className="wysz-stopka">
                        <Link href={pelne} onClick={() => ustawOtwarta(false)}>{lista && lista.razem > wyniki.length ? `wszystkie wyniki (${lista.razem})` : 'pełne wyniki'} dla „{q.trim()}” →</Link>
                        <span aria-hidden="true">Enter</span>
                    </div>
                </div>
            )}
        </div>
    )
}

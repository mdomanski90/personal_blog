'use client'

// „← wróć” na każdej podstronie: wraca do poprzedniej strony w obrębie serwisu (historia przeglądarki –
// z zachowanym widokiem mapy i miejscem na stronie). Gdy wejście było z zewnątrz (link, wyszukiwarka),
// prowadzi do działu, z którego pochodzi strona (np. osoba → osoby, obiekt → mapa miejsc).

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Link } from 'next-view-transitions'

const KLUCZ = 'odp-sciezki'
const DZIALY: Record<string, string> = { miejsca: '/miejsca', obiekty: '/miejsca', plany: '/miejsca', osoby: '/osoby', wpisy: '/wpisy', tematy: '/tematy', archiwum: '/archiwum', biblioteka: '/biblioteka', szukaj: '/' }
const styl: React.CSSProperties = { fontSize: 'calc(14px * var(--font-scale, 1))', minHeight: 'calc(28px * var(--font-scale, 1))', padding: '0 10px', borderRadius: '7px', fontFamily: 'inherit' }
const klasy = 'border border-[#d6d1c6] dark:border-[#4b5563] lowercase whitespace-nowrap !no-underline text-current hover:bg-muted transition-colors inline-flex items-center bg-transparent cursor-pointer'

function czytaj(): string[] {
    try { return JSON.parse(sessionStorage.getItem(KLUCZ) ?? '[]') } catch { return [] }
}

export default function Wroc() {
    const sciezka = usePathname()
    const router = useRouter()
    const [jestPoprzednia, ustawJestPoprzednia] = React.useState(false)
    React.useEffect(() => {
        if (!sciezka) return
        let l = czytaj()
        if (l[l.length - 2] === sciezka) l = l.slice(0, -1) // powrót – zdejmujemy stronę, z której wróciliśmy
        else if (l[l.length - 1] !== sciezka) l = [...l, sciezka].slice(-40)
        try { sessionStorage.setItem(KLUCZ, JSON.stringify(l)) } catch { /* brak dostępu */ }
        ustawJestPoprzednia(l.length > 1)
    }, [sciezka])
    if (!sciezka || sciezka === '/') return null
    const segmenty = sciezka.split('/').filter(Boolean)
    const dzial = segmenty.length > 1 ? (DZIALY[segmenty[0]] ?? '/') : '/'
    if (jestPoprzednia) return <button type="button" onClick={() => router.back()} className={klasy} style={styl} title="poprzednia strona">← wróć</button>
    return <Link href={dzial} className={klasy} style={styl} title="do działu">← wróć</Link>
}

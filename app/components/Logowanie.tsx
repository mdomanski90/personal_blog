'use client'

import { useEffect, useState } from 'react'
import { Link } from 'next-view-transitions'
import { usePathname } from 'next/navigation'

// „zaloguj” / „wyloguj” w nagłówku. Stan z ciasteczka pomocniczego (nic nie odblokowuje –
// dostęp sprawdza serwer na podstawie ciasteczka HttpOnly).

const styl = {
    fontSize: '14px',
    height: '28px',
    padding: '0 10px',
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '7px',
}
const KLASY = 'border border-[#d6d1c6] dark:border-[#4b5563] lowercase whitespace-nowrap !no-underline text-current hover:bg-muted transition-colors bg-transparent cursor-pointer'

export default function Logowanie() {
    const sciezka = usePathname() ?? '/'
    const [zalogowany, setZalogowany] = useState(false)
    useEffect(() => setZalogowany(/(?:^|;\s*)odp_zalogowany=1/.test(document.cookie)), [sciezka])

    if (zalogowany) {
        return (
            <form method="post" action="/api/wyloguj" className="inline-flex">
                <input type="hidden" name="wroc" value={sciezka} />
                <button type="submit" className={KLASY} style={styl} title="zalogowano jako bliski – wyloguj">wyloguj</button>
            </form>
        )
    }
    if (sciezka === '/zaloguj') return null
    return (
        <Link href={`/zaloguj?wroc=${encodeURIComponent(sciezka)}`} className={KLASY} style={styl} title="dla bliskich">
            zaloguj
        </Link>
    )
}

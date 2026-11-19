'use client'

import { useEffect, useState } from 'react'
import { Link } from 'next-view-transitions'
import { usePathname } from 'next/navigation'
import { adresEdycji } from '@/lib/panel/menu'

// „zaloguj” / „wyloguj” w nagłówku. Stan z ciasteczka pomocniczego (nic nie odblokowuje –
// dostęp sprawdza serwer na podstawie ciasteczka HttpOnly).
// P7a (KON-01, D-PA-08): po zalogowaniu kontem – imię i rola, „edytuj tę stronę” (dla osób z dostępem do panelu), „wyloguj”.

const KLASY = 'k-btn k-btn--s lowercase'
type Ja = { zalogowany: boolean; imie?: string; rola?: string; panel?: boolean }

export default function Logowanie() {
    const sciezka = usePathname() ?? '/'
    const [zalogowany, setZalogowany] = useState(false)
    const [ja, setJa] = useState<Ja | null>(null)
    useEffect(() => {
        const jest = /(?:^|;\s*)odp_zalogowany=1/.test(document.cookie)
        setZalogowany(jest)
        if (!jest) { setJa(null); return }
        let zywy = true
        fetch('/api/konto/ja', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j: Ja | null) => { if (zywy) setJa(j?.zalogowany ? j : null) }).catch(() => {})
        return () => { zywy = false }
    }, [sciezka])

    if (zalogowany) {
        const edycja = ja?.panel ? adresEdycji(sciezka) : null
        return (
            <>
                {ja?.imie && <a href="/moje-konto" className="naglowek-konto" title="moje konto">{ja.imie.split(' ')[0]} · {ja.rola}</a>}
                {edycja && <a href={edycja} className={`${KLASY} naglowek-edytuj`} aria-label="edytuj tę stronę w panelu"><span aria-hidden="true" className="naglowek-dlugi">edytuj tę stronę </span><span aria-hidden="true">✎</span></a>}
                <form method="post" action="/api/wyloguj" className="inline-flex">
                    <input type="hidden" name="wroc" value={sciezka} />
                    <button type="submit" className={KLASY} title={ja?.imie ? `zalogowano jako ${ja.imie} – wyloguj` : 'zalogowano jako bliski – wyloguj'}>wyloguj</button>
                </form>
            </>
        )
    }
    if (sciezka === '/zaloguj') return null
    return (
        <Link href={`/zaloguj?wroc=${encodeURIComponent(sciezka)}`} className={KLASY} title="konto albo hasło dla bliskich">
            zaloguj
        </Link>
    )
}

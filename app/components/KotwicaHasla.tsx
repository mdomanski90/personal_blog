'use client'

// SLW-03 (P3, zasada 2.1): stare adresy haseł – lista słownika z kotwicą „#<id>” (hasło = kotwica) – prowadzą na stronę hasła.
// Część po „#” nie dociera do serwera, więc przekierowuje przeglądarka – tylko dla identyfikatorów haseł widocznych dla czytelnika.

import * as React from 'react'
import { adresHasla } from '@/lib/slownik'

export default function KotwicaHasla({ ids }: { ids: string[] }) {
    React.useEffect(() => {
        let id = ''
        try { id = decodeURIComponent(window.location.hash.slice(1)) } catch { return }
        if (id && ids.includes(id)) window.location.replace(adresHasla(id))
    }, [ids])
    return null
}

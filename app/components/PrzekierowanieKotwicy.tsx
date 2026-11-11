'use client'

import { useEffect } from 'react'

/**
 * Dawniej wszystkie wpisy były na stronie głównej, a linki prowadziły do kotwic („/#niepamiec”).
 * Teraz każda opowieść ma własny adres – stare linki przekierowujemy na „/opowiesci/niepamiec”.
 */
export default function PrzekierowanieKotwicy({ identyfikatory }: { identyfikatory: string[] }) {
    useEffect(() => {
        const kotwica = decodeURIComponent(window.location.hash.replace(/^#/, ''))
        if (kotwica && identyfikatory.includes(kotwica)) {
            window.location.replace(`/opowiesci/${kotwica}`)
        }
    }, [identyfikatory])
    return null
}

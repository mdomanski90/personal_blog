'use client'

// Dokumenty wstawione we wpisy (blok „Materiał z archiwum”): kliknięcie w skan albo „przeglądaj” otwiera
// przeglądarkę dokumentu na pełnym ekranie, bez wychodzenia ze strony.

import * as React from 'react'
import { createPortal } from 'react-dom'
import PrzegladarkaDokumentu, { type StronaPodgladu } from './PrzegladarkaDokumentu'

export default function DokumentyWTresci() {
    const [otwarty, ustawOtwarty] = React.useState<{ tytul: string; strony: StronaPodgladu[] } | null>(null)
    React.useEffect(() => {
        const klik = (e: MouseEvent) => {
            const cel = e.target as HTMLElement | null
            if (!cel?.closest('[data-dokument-img], .dok-otworz')) return
            const fig = cel.closest<HTMLElement>('figure[data-dokument]')
            if (!fig) return
            e.preventDefault()
            try { ustawOtwarty(JSON.parse(fig.dataset.dokument ?? '')) } catch { /* uszkodzone dane – nic */ }
        }
        document.addEventListener('click', klik)
        return () => document.removeEventListener('click', klik)
    }, [])
    if (!otwarty) return null
    return createPortal(<PrzegladarkaDokumentu strony={otwarty.strony} tytul={otwarty.tytul} pelnyNaStart onZamknij={() => ustawOtwarty(null)} />, document.body)
}

'use client'

// Dokumenty wstawione we wpisy (blok „Materiał z archiwum”): kliknięcie w skan albo „przeglądaj” otwiera
// przeglądarkę dokumentu na pełnym ekranie, bez wychodzenia ze strony.

import * as React from 'react'
import { createPortal } from 'react-dom'
import PrzegladarkaDokumentu, { type StronaPodgladu } from './PrzegladarkaDokumentu'
import type { ObjasnienieWidoku } from '@/lib/objasnienia-widok'

export default function DokumentyWTresci() {
    const [otwarty, ustawOtwarty] = React.useState<{ tytul: string; strony: StronaPodgladu[]; objasnienia?: ObjasnienieWidoku[] } | null>(null)
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
        // kadr wysokich skanów: cieniowanie i „obejrzyj cały dokument” tylko wtedy, gdy obraz wystaje poza kadr
        const sprawdz = () => document.querySelectorAll<HTMLElement>('.dok-kadr').forEach((k) => {
            const img = k.querySelector('img')
            k.classList.toggle('przyciety', !!img && img.getBoundingClientRect().height > k.clientHeight + 2)
        })
        const obrazy = [...document.querySelectorAll<HTMLImageElement>('.dok-kadr img')]
        obrazy.forEach((img) => img.addEventListener('load', sprawdz))
        sprawdz()
        window.addEventListener('resize', sprawdz)
        return () => {
            document.removeEventListener('click', klik)
            obrazy.forEach((img) => img.removeEventListener('load', sprawdz))
            window.removeEventListener('resize', sprawdz)
        }
    }, [])
    if (!otwarty) return null
    return createPortal(<PrzegladarkaDokumentu strony={otwarty.strony} objasnienia={otwarty.objasnienia} tytul={otwarty.tytul} pelnyNaStart onZamknij={() => ustawOtwarty(null)} />, document.body)
}

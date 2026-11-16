'use client'

// Dokumenty wstawione we wpisy (blok „Materiał z archiwum”): kliknięcie w skan albo „przeglądaj” otwiera
// przeglądarkę dokumentu na pełnym ekranie, bez wychodzenia ze strony.

import * as React from 'react'
import { createPortal } from 'react-dom'
import PrzegladarkaDokumentu, { type StronaPodgladu } from './PrzegladarkaDokumentu'
import type { ObjasnienieWidoku } from '@/lib/objasnienia-widok'
import { useFokusPowrotu } from '@/lib/ruch'

export default function DokumentyWTresci() {
    const [otwarty, ustawOtwarty] = React.useState<{ tytul: string; strony: StronaPodgladu[]; objasnienia?: ObjasnienieWidoku[]; transkrypcja?: string } | null>(null)
    // 5A (scena 4, zasada 5.3): po zamknięciu fokus wraca na „przeglądaj” / „powiększ skan” tej wstawki
    // (kliknięcie w sam skan nie daje fokusu)
    const wstawka = React.useRef<HTMLElement | null>(null)
    useFokusPowrotu(!!otwarty, { zapasowy: () => wstawka.current?.querySelector<HTMLElement>('figcaption .dok-otworz') })
    React.useEffect(() => {
        const klik = (e: MouseEvent) => {
            const cel = e.target as HTMLElement | null
            if (!cel?.closest('[data-dokument-img], .dok-otworz')) return
            const fig = cel.closest<HTMLElement>('figure[data-dokument]')
            if (!fig) return
            e.preventDefault()
            wstawka.current = fig
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
    return createPortal(<PrzegladarkaDokumentu strony={otwarty.strony} objasnienia={otwarty.objasnienia} tytul={otwarty.tytul} pelnyNaStart onZamknij={() => ustawOtwarty(null)}
        panelTekstu={otwarty.transkrypcja ? <div className="szt-tekst szt-tekst-pelny"><div className="szt-pasek"><b className="szt-jedna">transkrypcja</b></div><div className="szt-tresc" tabIndex={0} role="region" aria-label="transkrypcja"><div className="post-content" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }} dangerouslySetInnerHTML={{ __html: otwarty.transkrypcja }} /></div></div> : undefined} />, document.body)
}

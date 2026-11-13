'use client'

// Drzewa osób (HTML z lib/osoby/drzewo.ts – układ i linie liczone na serwerze). Tu tylko obsługa w przeglądarce:
// przesuwanie myszą, wyśrodkowanie na osobie i „pełny ekran” (Esc / ✕ zamyka).
// Przycisk pełnego ekranu: własny pasek nad drzewem albo – na karcie osoby – przycisk w nagłówku tabeli
// (button[data-drzewo-pelny="<id figury>"]).

import * as React from 'react'

function wysrodkuj(przew: HTMLElement) {
    const glowna = przew.querySelector('.dr-glowna')
    if (!glowna) return
    const a = glowna.getBoundingClientRect(), b = przew.getBoundingClientRect()
    przew.scrollLeft += a.left + a.width / 2 - (b.left + b.width / 2)
}

function przygotuj(fig: HTMLElement): () => void {
    const przew = fig.querySelector<HTMLElement>(':scope > .dr-przewijanie')
    if (!przew || fig.dataset.drzewoGotowe) return () => {}
    fig.dataset.drzewoGotowe = '1'
    const zewn = fig.id ? document.querySelector<HTMLButtonElement>(`button[data-drzewo-pelny="${CSS.escape(fig.id)}"]`) : null
    let pasek: HTMLDivElement | null = null
    let przycisk = zewn
    if (!przycisk) {
        pasek = document.createElement('div')
        pasek.className = 'dr-narzedzia'
        przycisk = document.createElement('button')
        przycisk.type = 'button'
        pasek.appendChild(przycisk)
        fig.insertBefore(pasek, przew)
    }
    const btn = przycisk
    const napis = btn.textContent || 'pełny ekran ⤢'
    btn.textContent = napis
    const zamknij = () => {
        fig.classList.remove('drzewo-pelne')
        btn.textContent = napis
        if (zewn) { pasek?.remove(); pasek = null }
        document.body.style.overflow = ''
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        requestAnimationFrame(() => wysrodkuj(przew))
    }
    // na pełnym ekranie przycisk z nagłówka tabeli jest niewidoczny – „zamknij ✕” w pasku nad drzewem
    const otworz = () => {
        fig.classList.add('drzewo-pelne')
        if (zewn) {
            pasek = document.createElement('div')
            pasek.className = 'dr-narzedzia'
            const z = document.createElement('button')
            z.type = 'button'
            z.textContent = 'zamknij ✕'
            z.addEventListener('click', zamknij)
            pasek.appendChild(z)
            fig.insertBefore(pasek, przew)
        } else btn.textContent = 'zamknij ✕'
        document.body.style.overflow = 'hidden'
        fig.requestFullscreen?.().catch(() => {})
        requestAnimationFrame(() => wysrodkuj(przew))
    }
    const klik = () => (fig.classList.contains('drzewo-pelne') ? zamknij() : otworz())
    btn.addEventListener('click', klik)
    const klawisz = (e: KeyboardEvent) => { if (e.key === 'Escape' && fig.classList.contains('drzewo-pelne')) zamknij() }
    const zmianaFs = () => { if (!document.fullscreenElement && fig.classList.contains('drzewo-pelne')) zamknij() }
    document.addEventListener('keydown', klawisz)
    document.addEventListener('fullscreenchange', zmianaFs)
    // przesuwanie myszą (poza kartami-odnośnikami)
    let start: { x: number; y: number; l: number; t: number } | null = null
    const dol = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || e.button !== 0 || (e.target as Element).closest('a')) return
        start = { x: e.clientX, y: e.clientY, l: przew.scrollLeft, t: przew.scrollTop }
        przew.classList.add('ciagnie')
    }
    const ruch = (e: PointerEvent) => { if (!start) return; przew.scrollLeft = start.l - (e.clientX - start.x); przew.scrollTop = start.t - (e.clientY - start.y) }
    const gora = () => { start = null; przew.classList.remove('ciagnie') }
    przew.addEventListener('pointerdown', dol)
    window.addEventListener('pointermove', ruch)
    window.addEventListener('pointerup', gora)
    wysrodkuj(przew)
    document.fonts?.ready.then(() => wysrodkuj(przew)).catch(() => {})
    return () => {
        btn.removeEventListener('click', klik)
        document.removeEventListener('keydown', klawisz)
        document.removeEventListener('fullscreenchange', zmianaFs)
        window.removeEventListener('pointermove', ruch)
        window.removeEventListener('pointerup', gora)
        przew.removeEventListener('pointerdown', dol)
        pasek?.remove()
        delete fig.dataset.drzewoGotowe
        document.body.style.overflow = ''
    }
}

export default function DrzewaLinie() {
    React.useEffect(() => {
        const sprzatanie = [...document.querySelectorAll<HTMLElement>('figure.drzewo')].map(przygotuj)
        return () => sprzatanie.forEach((f) => f())
    }, [])
    return null
}

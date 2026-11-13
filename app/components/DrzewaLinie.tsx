'use client'

// Drzewa osób (HTML z lib/osoby/drzewo.ts – układ i linie liczone na serwerze). Tu tylko obsługa w przeglądarce:
// przesuwanie myszą, wyśrodkowanie na osobie, „pełny ekran” (Esc / ✕ zamyka), a na pełnym ekranie
// doczytywanie kolejnych pokoleń przodków i potomków (po 3, ile razy się chce; /api/drzewo/<osoba>).
// Przycisk pełnego ekranu: w pasku nad drzewem albo – na karcie osoby – w nagłówku tabeli
// (button[data-drzewo-pelny="<id figury>"]).

import * as React from 'react'

const KROK = 3

function wysrodkuj(przew: HTMLElement) {
    const glowna = przew.querySelector('.dr-glowna')
    if (!glowna) return
    const a = glowna.getBoundingClientRect(), b = przew.getBoundingClientRect()
    przew.scrollLeft += a.left + a.width / 2 - (b.left + b.width / 2)
    przew.scrollTop += a.top + a.height / 2 - (b.top + b.height / 2)
}

function przycisk(tekst: string, klasa = ''): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = tekst
    if (klasa) b.className = klasa
    return b
}

function przygotuj(fig: HTMLElement): () => void {
    const przew = fig.querySelector<HTMLElement>(':scope > .dr-przewijanie')
    if (!przew || fig.dataset.drzewoGotowe) return () => {}
    fig.dataset.drzewoGotowe = '1'
    const zewn = fig.id ? document.querySelector<HTMLButtonElement>(`button[data-drzewo-pelny="${CSS.escape(fig.id)}"]`) : null
    // pasek nad drzewem: doczytywanie (widać tylko na pełnym ekranie) i pełny ekran / zamknij
    const pasek = document.createElement('div')
    pasek.className = 'dr-narzedzia'
    const wGore = przycisk(`↑ wczytaj ${KROK} pokolenia przodków`, 'dr-doczytaj')
    const wDol = przycisk(`↓ wczytaj ${KROK} pokolenia potomków`, 'dr-doczytaj')
    const glowny = przycisk('pełny ekran ⤢')
    pasek.append(wGore, wDol, glowny)
    fig.insertBefore(pasek, przew)
    const stanPrzyciskow = () => {
        wGore.disabled = fig.dataset.wiecejWstecz !== '1'
        wDol.disabled = fig.dataset.wiecejNaprzod !== '1'
        wGore.title = wGore.disabled ? 'w drzewie nie ma dalszych przodków' : ''
        wDol.title = wDol.disabled ? 'w drzewie nie ma dalszych potomków' : ''
    }
    stanPrzyciskow()

    const zamknij = () => {
        fig.classList.remove('drzewo-pelne')
        glowny.textContent = 'pełny ekran ⤢'
        document.body.style.overflow = ''
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        requestAnimationFrame(() => wysrodkuj(przew))
    }
    const otworz = () => {
        fig.classList.add('drzewo-pelne')
        glowny.textContent = 'zamknij ✕'
        document.body.style.overflow = 'hidden'
        fig.requestFullscreen?.().catch(() => {})
        requestAnimationFrame(() => wysrodkuj(przew))
    }
    const przelacz = () => (fig.classList.contains('drzewo-pelne') ? zamknij() : otworz())
    glowny.addEventListener('click', przelacz)
    zewn?.addEventListener('click', przelacz)

    // doczytanie: nowe drzewo z serwera (z większą liczbą pokoleń) w miejsce obecnego
    let wczytuje = false
    const doczytaj = async (dw: number, dn: number, b: HTMLButtonElement) => {
        if (wczytuje || !fig.dataset.osoba) return
        wczytuje = true
        const napis = b.textContent
        b.textContent = 'wczytuję…'
        const q = new URLSearchParams({
            wstecz: String(Number(fig.dataset.wstecz ?? 0) + dw),
            naprzod: String(Number(fig.dataset.naprzod ?? 0) + dn),
            zakres: fig.dataset.zakres ?? 'malzonkowie',
            ...(fig.classList.contains('dr-w-tabeli') ? { tabela: '1' } : {}),
        })
        try {
            const r = await fetch(`/api/drzewo/${encodeURIComponent(fig.dataset.osoba)}?${q}`, { cache: 'no-store' })
            if (!r.ok) throw new Error(String(r.status))
            const t = document.createElement('template')
            t.innerHTML = await r.text()
            const nowa = t.content.querySelector<HTMLElement>('figure.drzewo')
            const nowyPrzew = nowa?.querySelector(':scope > .dr-przewijanie')
            if (!nowa || !nowyPrzew) throw new Error('brak drzewa')
            przew.replaceChildren(...nowyPrzew.childNodes)
            const tekst = nowa.querySelector(':scope > .dr-tekst')
            if (tekst) fig.querySelector(':scope > .dr-tekst')?.replaceWith(tekst)
            for (const k of ['wstecz', 'naprzod', 'wiecejWstecz', 'wiecejNaprzod'] as const) fig.dataset[k] = nowa.dataset[k] ?? ''
            requestAnimationFrame(() => wysrodkuj(przew))
        } catch {
            b.textContent = 'nie udało się – spróbuj jeszcze raz'
            window.setTimeout(() => { b.textContent = napis; stanPrzyciskow() }, 2500)
            wczytuje = false
            return
        }
        b.textContent = napis
        stanPrzyciskow()
        wczytuje = false
    }
    wGore.addEventListener('click', () => doczytaj(KROK, 0, wGore))
    wDol.addEventListener('click', () => doczytaj(0, KROK, wDol))

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
        zewn?.removeEventListener('click', przelacz)
        document.removeEventListener('keydown', klawisz)
        document.removeEventListener('fullscreenchange', zmianaFs)
        window.removeEventListener('pointermove', ruch)
        window.removeEventListener('pointerup', gora)
        przew.removeEventListener('pointerdown', dol)
        pasek.remove()
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

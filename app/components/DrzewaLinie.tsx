'use client'

// Drzewa osób (HTML z lib/osoby/drzewo.ts – układ i linie liczone na serwerze). Tu tylko obsługa w przeglądarce:
// przesuwanie myszą, wyśrodkowanie na osobie i „pełny ekran” (Esc / ✕ zamyka).
// Na pełnym ekranie u góry pasek jak nagłówek okna: nazwa drzewa, doczytywanie pokoleń przodków i potomków (po 3),
// rodzeństwo osoby, powiększanie i zmniejszanie (dla słabiej widzących; zapamiętane w przeglądarce), zamknij.
// Przycisk pełnego ekranu: w pasku nad drzewem albo – na karcie osoby – w nagłówku tabeli
// (button[data-drzewo-pelny="<id figury>"]).

import * as React from 'react'

const KROK = 3
const SKALE = [0.6, 0.7, 0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2]
const KLUCZ_SKALI = 'drzewo-skala'

function wysrodkuj(przew: HTMLElement) {
    const glowna = przew.querySelector('.dr-glowna')
    if (!glowna) return
    const a = glowna.getBoundingClientRect(), b = przew.getBoundingClientRect()
    przew.scrollLeft += a.left + a.width / 2 - (b.left + b.width / 2)
    przew.scrollTop += a.top + a.height / 2 - (b.top + b.height / 2)
}

function przycisk(tekst: string, opis?: string): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = tekst
    if (opis) { b.title = opis; b.setAttribute('aria-label', opis) }
    return b
}
function grupa(nazwa: string, ...el: HTMLElement[]): HTMLElement {
    const g = document.createElement('span')
    g.className = 'dr-pasek-grupa dr-tylko-pelny'
    g.setAttribute('role', 'group')
    g.setAttribute('aria-label', nazwa)
    g.append(...el)
    return g
}

function przygotuj(fig: HTMLElement): () => void {
    const przew = fig.querySelector<HTMLElement>(':scope > .dr-przewijanie')
    if (!przew || fig.dataset.drzewoGotowe) return () => {}
    fig.dataset.drzewoGotowe = '1'
    const zewn = fig.id ? document.querySelector<HTMLButtonElement>(`button[data-drzewo-pelny="${CSS.escape(fig.id)}"]`) : null

    // pasek: poza pełnym ekranem tylko „pełny ekran ⤢” (we wpisach); na pełnym ekranie – wszystkie sterowania
    const pasek = document.createElement('div')
    pasek.className = 'dr-narzedzia'
    const tytul = document.createElement('b')
    tytul.className = 'dr-pasek-tytul dr-tylko-pelny'
    tytul.textContent = przew.getAttribute('aria-label') ?? 'drzewo'
    const wGore = przycisk(`↑ ${KROK} pokolenia przodków`, `wczytaj ${KROK} kolejne pokolenia przodków`)
    const wDol = przycisk(`↓ ${KROK} pokolenia potomków`, `wczytaj ${KROK} kolejne pokolenia potomków`)
    const rodz = przycisk('rodzeństwo')
    const mniej = przycisk('−', 'zmniejsz drzewo')
    const skalaTxt = document.createElement('span')
    skalaTxt.className = 'dr-skala'
    skalaTxt.setAttribute('aria-live', 'polite')
    const wiecej = przycisk('+', 'powiększ drzewo')
    const glowny = przycisk('pełny ekran ⤢')
    glowny.classList.add('dr-glowny')
    pasek.append(tytul, grupa('pokolenia', wGore, wDol), grupa('rodzina', rodz), grupa('wielkość drzewa', mniej, skalaTxt, wiecej), glowny)
    fig.insertBefore(pasek, przew)

    const stanPrzyciskow = () => {
        wGore.disabled = fig.dataset.wiecejWstecz !== '1'
        wDol.disabled = fig.dataset.wiecejNaprzod !== '1'
        if (wGore.disabled) wGore.title = 'w drzewie nie ma dalszych przodków'
        if (wDol.disabled) wDol.title = 'w drzewie nie ma dalszych potomków'
        const ileR = Number(fig.dataset.rodzenstwo ?? 0)
        const pokazane = fig.dataset.zakres === 'rodzenstwo'
        rodz.parentElement!.hidden = ileR === 0
        rodz.setAttribute('aria-pressed', String(pokazane))
        rodz.textContent = pokazane ? `ukryj rodzeństwo` : `pokaż rodzeństwo (${ileR})`
    }
    stanPrzyciskow()

    // wielkość drzewa (tylko na pełnym ekranie; A−/A+ strony działa niezależnie)
    let skala = 1
    try { const z = Number(localStorage.getItem(KLUCZ_SKALI)); if (SKALE.includes(z)) skala = z } catch { /* bez pamięci */ }
    const ustawSkale = (s: number, zapisz = true) => {
        skala = s
        fig.style.setProperty('--dr-skala', String(s))
        skalaTxt.textContent = `${Math.round(s * 100)}%`
        mniej.disabled = s <= SKALE[0]
        wiecej.disabled = s >= SKALE[SKALE.length - 1]
        if (zapisz) { try { localStorage.setItem(KLUCZ_SKALI, String(s)) } catch { /* bez pamięci */ } }
        if (fig.classList.contains('drzewo-pelne')) requestAnimationFrame(() => wysrodkuj(przew))
    }
    const krokSkali = (d: number) => {
        const i = SKALE.findIndex((x) => x >= skala - 0.001)
        ustawSkale(SKALE[Math.max(0, Math.min(SKALE.length - 1, (i < 0 ? 4 : i) + d))])
    }
    ustawSkale(skala, false)
    mniej.addEventListener('click', () => krokSkali(-1))
    wiecej.addEventListener('click', () => krokSkali(1))

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
        requestAnimationFrame(() => { wysrodkuj(przew); glowny.focus() })
    }
    const przelacz = () => (fig.classList.contains('drzewo-pelne') ? zamknij() : otworz())
    glowny.addEventListener('click', przelacz)
    zewn?.addEventListener('click', przelacz)

    // nowe drzewo z serwera (więcej pokoleń, z rodzeństwem albo bez) w miejsce obecnego
    let wczytuje = false
    const wczytaj = async (zmiany: { wstecz?: number; naprzod?: number; zakres?: string }, b: HTMLButtonElement) => {
        if (wczytuje || !fig.dataset.osoba) return
        wczytuje = true
        const napis = b.textContent
        b.textContent = 'wczytuję…'
        const q = new URLSearchParams({
            wstecz: String(zmiany.wstecz ?? Number(fig.dataset.wstecz ?? 0)),
            naprzod: String(zmiany.naprzod ?? Number(fig.dataset.naprzod ?? 0)),
            zakres: zmiany.zakres ?? fig.dataset.zakres ?? 'malzonkowie',
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
            for (const k of ['wstecz', 'naprzod', 'zakres', 'wiecejWstecz', 'wiecejNaprzod', 'rodzenstwo'] as const) fig.dataset[k] = nowa.dataset[k] ?? ''
            requestAnimationFrame(() => wysrodkuj(przew))
            b.textContent = napis
        } catch {
            b.textContent = 'nie udało się – spróbuj jeszcze raz'
            await new Promise((ok) => window.setTimeout(ok, 2500))
            b.textContent = napis
        }
        stanPrzyciskow()
        wczytuje = false
    }
    wGore.addEventListener('click', () => wczytaj({ wstecz: Number(fig.dataset.wstecz ?? 0) + KROK }, wGore))
    wDol.addEventListener('click', () => wczytaj({ naprzod: Number(fig.dataset.naprzod ?? 0) + KROK }, wDol))
    rodz.addEventListener('click', () => wczytaj({ zakres: fig.dataset.zakres === 'rodzenstwo' ? 'malzonkowie' : 'rodzenstwo' }, rodz))

    const klawisz = (e: KeyboardEvent) => {
        if (!fig.classList.contains('drzewo-pelne')) return
        if (e.key === 'Escape') zamknij()
        else if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === '+' || e.key === '=')) krokSkali(1)
        else if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === '-' || e.key === '_')) krokSkali(-1)
    }
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

'use client'

// Drzewa osób (HTML z lib/osoby/drzewo.ts) – dorysowanie w przeglądarce:
// • linii pokrewieństwa pod kątem prostym: rodzice → dziecko (przodkowie), osoba → małżonek → dzieci (potomkowie),
// • delikatnych, przerywanych granic pokoleń,
// • przesuwania drzewa myszą, wyśrodkowania na osobie i „pełnego ekranu” (Esc / ✕ zamyka).

import * as React from 'react'

const NS = 'http://www.w3.org/2000/svg'

function bezposrednie(el: Element, klasa: string): HTMLElement[] {
    return [...el.children].filter((c) => c.classList.contains(klasa)) as HTMLElement[]
}
const kartaGaleziGora = (g: Element) => bezposrednie(g, 'dr-karta').at(-1)
const kartaGaleziDol = (g: Element) => bezposrednie(g, 'dr-karta')[0]

function rysuj(klepsydra: HTMLElement) {
    klepsydra.querySelector(':scope > svg.dr-linie')?.remove()
    const baza = klepsydra.getBoundingClientRect()
    const p = (el: Element) => {
        const r = el.getBoundingClientRect()
        return { x: r.left - baza.left + r.width / 2, g: r.top - baza.top, d: r.bottom - baza.top, l: r.left - baza.left, w: r.width }
    }
    const linie: string[] = []
    // pionowa – pozioma – pionowa: z dołu „od” do góry każdego z „do”, poziomka w połowie odstępu
    const widelec = (od: Element, doList: Element[]) => {
        if (!doList.length) return
        const a = p(od)
        const cele = doList.map(p)
        // jedna karta tuż pod spodem (np. małżonek) – prosta pionowa kreska, bez schodka
        if (cele.length === 1 && cele[0].x > a.l + 8 && cele[0].x < a.l + a.w - 8) {
            linie.push(`M${cele[0].x} ${a.d}V${cele[0].g}`)
            return
        }
        const y = Math.round((a.d + Math.min(...cele.map((c) => c.g))) / 2) + 0.5
        const xs = [a.x, ...cele.map((c) => c.x)]
        linie.push(`M${a.x} ${a.d}V${y}`, `M${Math.min(...xs)} ${y}H${Math.max(...xs)}`)
        for (const c of cele) linie.push(`M${c.x} ${y}V${c.g}`)
    }
    // przodkowie: rodzice (dwie karty) → dziecko pod nimi
    for (const g of klepsydra.querySelectorAll('.dr-gora')) {
        const pok = bezposrednie(g, 'dr-pokolenie')[0]
        const dziecko = kartaGaleziGora(g)
        if (!pok || !dziecko) continue
        const rodzice = bezposrednie(pok, 'dr-galaz').map(kartaGaleziGora).filter(Boolean) as HTMLElement[]
        if (!rodzice.length) continue
        const c = p(dziecko), r = rodzice.map(p)
        const y = Math.round((Math.max(...r.map((x) => x.d)) + c.g) / 2) + 0.5
        for (const x of r) linie.push(`M${x.x} ${x.d}V${y}`)
        const xs = [c.x, ...r.map((x) => x.x)]
        linie.push(`M${Math.min(...xs)} ${y}H${Math.max(...xs)}`, `M${c.x} ${y}V${c.g}`)
    }
    // potomkowie: osoba → (małżonek) → dzieci
    for (const pot of klepsydra.querySelectorAll('.dr-potomni')) {
        let prev = pot.previousElementSibling
        if (prev?.classList.contains('dr-rodzenstwo')) prev = prev.previousElementSibling
        const rodzic = prev?.classList.contains('dr-karta') ? prev : prev?.classList.contains('dr-gora') ? kartaGaleziGora(prev) : undefined
        if (!rodzic) continue
        const rodziny = bezposrednie(pot, 'dr-rodzina')
        const pierwsze: Element[] = []
        const dalej: [Element, Element[]][] = []
        for (const f of rodziny) {
            const malz = bezposrednie(f, 'dr-malzonek')[0]
            const zon = malz ? bezposrednie(malz, 'dr-karta')[0] : undefined
            const pok = bezposrednie(f, 'dr-pokolenie')[0]
            const dzieci = pok ? (bezposrednie(pok, 'dr-galaz').map(kartaGaleziDol).filter(Boolean) as HTMLElement[]) : []
            if (zon) { pierwsze.push(zon); if (dzieci.length) dalej.push([zon, dzieci]) }
            else pierwsze.push(...dzieci)
        }
        widelec(rodzic, pierwsze)
        for (const [od, dzieci] of dalej) widelec(od, dzieci)
    }
    // granice pokoleń: rzędy kart (wg górnej krawędzi), przerywana linia w połowie odstępu między rzędami
    // (rząd samych małżonków należy do pokolenia powyżej – bez granicy przed nim)
    const gory = [...klepsydra.querySelectorAll('.dr-karta')].map((k) => ({ ...p(k), malz: !!k.parentElement?.classList.contains('dr-malzonek') })).sort((a, b) => a.g - b.g)
    const rzedy: { g: number; d: number; malz: boolean }[] = []
    for (const k of gory) {
        const ost = rzedy.at(-1)
        if (ost && k.g - ost.g < 14) { ost.d = Math.max(ost.d, k.d); ost.malz &&= k.malz }
        else rzedy.push({ g: k.g, d: k.d, malz: k.malz })
    }
    const granice: string[] = []
    for (let i = 1; i < rzedy.length; i++) {
        if (rzedy[i].malz) continue
        const y = Math.round(rzedy[i - 1].d + (rzedy[i].g - rzedy[i - 1].d) * 0.22) + 0.5
        granice.push(`M0 ${y}H${klepsydra.scrollWidth}`)
    }
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('class', 'dr-linie')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('width', String(klepsydra.scrollWidth))
    svg.setAttribute('height', String(klepsydra.scrollHeight))
    const sciezka = (d: string, klasa?: string) => {
        const e = document.createElementNS(NS, 'path')
        e.setAttribute('d', d)
        if (klasa) e.setAttribute('class', klasa)
        svg.appendChild(e)
    }
    if (granice.length) sciezka(granice.join(''), 'dr-granica')
    if (linie.length) sciezka(linie.join(''))
    klepsydra.prepend(svg)
}

function wysrodkuj(przew: HTMLElement) {
    const glowna = przew.querySelector('.dr-glowna')
    if (!glowna) return
    const a = glowna.getBoundingClientRect(), b = przew.getBoundingClientRect()
    przew.scrollLeft += a.left + a.width / 2 - (b.left + b.width / 2)
}

function przygotuj(fig: HTMLElement): () => void {
    const przew = fig.querySelector<HTMLElement>(':scope > .dr-przewijanie')
    const klep = przew?.querySelector<HTMLElement>(':scope > .dr-klepsydra')
    if (!przew || !klep || fig.dataset.drzewoGotowe) return () => {}
    fig.dataset.drzewoGotowe = '1'
    // pasek: pełny ekran
    const pasek = document.createElement('div')
    pasek.className = 'dr-narzedzia'
    const przycisk = document.createElement('button')
    przycisk.type = 'button'
    przycisk.textContent = 'pełny ekran ⤢'
    pasek.appendChild(przycisk)
    fig.insertBefore(pasek, przew)
    const zamknij = () => {
        fig.classList.remove('drzewo-pelne')
        przycisk.textContent = 'pełny ekran ⤢'
        document.body.style.overflow = ''
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        requestAnimationFrame(() => { rysuj(klep); wysrodkuj(przew) })
    }
    const klawisz = (e: KeyboardEvent) => { if (e.key === 'Escape' && fig.classList.contains('drzewo-pelne')) zamknij() }
    const zmianaFs = () => { if (!document.fullscreenElement && fig.classList.contains('drzewo-pelne')) zamknij() }
    przycisk.addEventListener('click', () => {
        if (fig.classList.contains('drzewo-pelne')) return zamknij()
        fig.classList.add('drzewo-pelne')
        przycisk.textContent = 'zamknij ✕'
        document.body.style.overflow = 'hidden'
        fig.requestFullscreen?.().catch(() => {})
        requestAnimationFrame(() => { rysuj(klep); wysrodkuj(przew) })
    })
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
    // linie po każdej zmianie rozmiaru (czcionka A−/A+, okno, pełny ekran)
    let klatka = 0
    const odswiez = () => { cancelAnimationFrame(klatka); klatka = requestAnimationFrame(() => rysuj(klep)) }
    const ro = new ResizeObserver(odswiez)
    ro.observe(klep)
    ro.observe(przew)
    rysuj(klep)
    wysrodkuj(przew)
    document.fonts?.ready.then(() => { rysuj(klep); wysrodkuj(przew) }).catch(() => {})
    return () => {
        ro.disconnect()
        cancelAnimationFrame(klatka)
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

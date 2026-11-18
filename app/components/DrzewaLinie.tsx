'use client'

// Drzewa osób (HTML z lib/osoby/drzewo.ts – układ i linie liczone na serwerze). Tu tylko obsługa w przeglądarce:
// pasek nad drzewem, przesuwanie myszą, wyśrodkowanie na osobie, strzałki między kartami i „pełny ekran” (Esc / ✕ zamyka).
// P4 (makieta, plansza 5): pasek „przodkowie [−] N [+]”, „potomkowie [−] N [+]”, „rodzeństwo”, „A− A+”, „pełny ekran ⤢”.
//  - krok = 1 pokolenie, N = pokolenia faktycznie pokazane, „+” szary, gdy dalej nikogo nie ma (VIEW-05);
//  - na karcie osoby krok zmienia adres (?wstecz=&naprzod=&rodzenstwo=1 – link pamięta ustawienie), a drzewo rysuje serwer
//    (`zmien` z DrzewoKarty); na pełnym ekranie – osobne oglądanie, doczytywane tu (DRZ-01), po zamknięciu wraca drzewo z adresu;
//  - A−/A+ = wielkość samego drzewa (--dr-skala, pamiętana), także na karcie; A± strony działa niezależnie;
//  - strzałki: rodzice, dzieci, rodzeństwo i małżonek (VIEW-06, lib/osoby/drzewo-nawigacja.ts), Tab wchodzi na drzewo jednym przystankiem.

import * as React from 'react'
import { przewinO, przywrocFokus } from '@/lib/ruch'
import { odmiana } from '@/lib/tekst'
import { DOMYSLNE_NAPRZOD, DOMYSLNE_WSTECZ, krokPokolen, type ParametryDrzewa } from '@/lib/osoby/drzewo-adres'
import { nastepnaKarta, type KartaNaw, type KlawiszStrzalki } from '@/lib/osoby/drzewo-nawigacja'

const SKALE = [0.6, 0.7, 0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2]
const KLUCZ_SKALI = 'drzewo-skala'
const STRZALKI: readonly string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
const FORMY_POKOLEN: [string, string, string] = ['pokolenie', 'pokolenia', 'pokoleń']

export interface OpcjeObslugiDrzewa {
    /** karta osoby: zmiana liczby pokoleń / rodzeństwa = nowy adres strony (serwer rysuje drzewo od nowa) */
    zmien?: (p: ParametryDrzewa) => void
    /** PK: otwarcie karty osoby z drzewa z przejściem strony (bez – zwykłe przejście odnośnika) */
    otworz?: (href: string) => void
}

/** Po zmianie adresu drzewo na karcie powstaje od nowa – fokus wraca na ten sam przycisk paska. */
let fokusPo: { figura: string; akcja: string; czas: number } | null = null
const ZAPASOWE: Record<string, string> = { 'wstecz+': 'wstecz-', 'wstecz-': 'wstecz+', 'naprzod+': 'naprzod-', 'naprzod-': 'naprzod+' }

/** Wyśrodkowanie na osobie. 5A (jak przewijanie, scena 10): po zmianie wielkości i doczytaniu pokoleń – płynnie
 *  (przy ograniczeniu ruchu skok); przy wejściu na stronę, otwarciu i zamknięciu pełnego ekranu – od razu. */
function wysrodkuj(przew: HTMLElement, plynnie = false) {
    const glowna = przew.querySelector('.dr-glowna')
    if (!glowna) return
    const a = glowna.getBoundingClientRect(), b = przew.getBoundingClientRect()
    const left = a.left + a.width / 2 - (b.left + b.width / 2), top = a.top + a.height / 2 - (b.top + b.height / 2)
    if (plynnie) { przewinO(przew, { left, top }); return }
    przew.scrollLeft += left
    przew.scrollTop += top
}

function przycisk(tekst: string, opis?: string, klasa = ''): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = tekst
    if (klasa) b.className = klasa
    if (opis) { b.title = opis; b.setAttribute('aria-label', opis) }
    return b
}
function grupa(nazwa: string, klasa: string, ...el: HTMLElement[]): HTMLElement {
    const g = document.createElement('span')
    g.className = `dr-pasek-grupa ${klasa}`.trim()
    g.setAttribute('role', 'group')
    g.setAttribute('aria-label', nazwa)
    g.append(...el)
    return g
}

/** „przodkowie [−] N [+]”: nazwa i krok o jedno pokolenie; N = pokolenia faktycznie pokazane. */
function krok(nazwa: string, akcja: 'wstecz' | 'naprzod', rodzaj: string) {
    const mniej = przycisk('−', `${nazwa}: o jedno pokolenie mniej`)
    mniej.dataset.akcja = `${akcja}-`
    const licz = document.createElement('output')
    licz.className = 'dr-krok-liczba'
    const wiecej = przycisk('+', `${nazwa}: o jedno pokolenie więcej`)
    wiecej.dataset.akcja = `${akcja}+`
    const ramka = document.createElement('span')
    ramka.className = 'k-grupa'
    ramka.append(mniej, licz, wiecej)
    const et = document.createElement('span')
    et.className = 'dr-krok-nazwa'
    et.textContent = nazwa
    const el = document.createElement('span')
    el.className = 'dr-krok'
    el.setAttribute('role', 'group')
    el.setAttribute('aria-label', `${nazwa}, pokolenia`)
    el.append(et, ramka)
    const ustaw = (n: number, jestWiecej: boolean, zajety: boolean) => {
        licz.replaceChildren(String(n))
        const sr = document.createElement('span')
        sr.className = 'dr-sr'
        sr.textContent = ` ${rodzaj}: ${odmiana(n, FORMY_POKOLEN).replace(/^\d+ /, '')}`
        licz.append(sr)
        mniej.disabled = zajety || n <= 0
        wiecej.disabled = zajety || !jestWiecej
        mniej.title = n <= 0 ? `${nazwa}: nie ma mniej` : `${nazwa}: o jedno pokolenie mniej`
        wiecej.title = jestWiecej ? `${nazwa}: o jedno pokolenie więcej` : `${nazwa}: w drzewie nie ma dalszych pokoleń`
    }
    return { el, mniej, wiecej, ustaw }
}

/** Obsługa jednego drzewa. Eksport (DRZ-01, P3): karta osoby wywołuje ją sama przy każdym nowym drzewie (DrzewoKarty) –
 *  po zmianie liczby pokoleń drzewo jest wstawiane od nowa, a efekt strony uruchamia się tylko raz. */
export function przygotuj(fig: HTMLElement, opcje: OpcjeObslugiDrzewa = {}): () => void {
    const przewOrg = fig.querySelector<HTMLElement>(':scope > .dr-przewijanie')
    if (!przewOrg || fig.dataset.drzewoGotowe) return () => {}
    const przew: HTMLElement = przewOrg
    fig.dataset.drzewoGotowe = '1'
    const wTabeli = fig.classList.contains('dr-w-tabeli')
    // poza pełnym ekranem: na karcie osoby cały pasek, we wpisach tylko „pełny ekran ⤢”
    const tylkoPelny = wTabeli ? '' : 'dr-tylko-pelny'

    const pasek = document.createElement('div')
    pasek.className = 'dr-narzedzia'
    const tytul = document.createElement('b')
    tytul.className = 'dr-pasek-tytul dr-tylko-pelny'
    tytul.textContent = przew.getAttribute('aria-label') ?? 'drzewo'
    const przodkowie = krok('przodkowie', 'wstecz', 'przodkowie')
    const potomkowie = krok('potomkowie', 'naprzod', 'potomkowie')
    const rodz = przycisk('rodzeństwo', undefined, 'k-btn k-btn--s dr-przelacznik')
    rodz.dataset.akcja = 'rodzenstwo'
    // nazwa dostępna zaczyna się od widocznego napisu (WCAG 2.5.3, axe label-content-name-mismatch)
    const mniej = przycisk('A−', 'A−: zmniejsz drzewo')
    mniej.dataset.akcja = 'skala-'
    const wiecej = przycisk('A+', 'A+: powiększ drzewo')
    wiecej.dataset.akcja = 'skala+'
    const skalaTxt = document.createElement('span')
    skalaTxt.className = 'dr-sr'
    skalaTxt.setAttribute('aria-live', 'polite')
    const skalaGrupa = document.createElement('span')
    skalaGrupa.className = 'k-grupa'
    skalaGrupa.append(mniej, wiecej)
    const komunikat = document.createElement('span')
    komunikat.className = 'dr-komunikat'
    komunikat.setAttribute('role', 'status')
    const glowny = przycisk('pełny ekran ⤢', undefined, 'k-btn k-btn--s dr-glowny')
    pasek.append(
        tytul,
        grupa('pokolenia', tylkoPelny, przodkowie.el, potomkowie.el),
        grupa('rodzina', tylkoPelny, rodz),
        grupa('wielkość drzewa', `${tylkoPelny} dr-grupa-skala`.trim(), skalaGrupa, skalaTxt),
        komunikat,
        glowny,
    )
    fig.insertBefore(pasek, przew)

    // podpis pod drzewem na karcie: klawiatura i lista dla czytnika ekranu (na telefonie lista jest zawsze widoczna)
    let podpis: HTMLElement | null = null
    if (wTabeli) {
        podpis = document.createElement('p')
        podpis.className = 'dr-podpis'
        const lista = przycisk('lista pokoleń dla czytnika ekranu', undefined, 'dr-lista-przycisk')
        lista.setAttribute('aria-expanded', 'false')
        lista.addEventListener('click', () => {
            const otwarta = fig.classList.toggle('dr-lista-otwarta')
            lista.setAttribute('aria-expanded', String(otwarta))
        })
        podpis.append('osoba w środku · Tab – na drzewo · strzałki – rodzice, dzieci, rodzeństwo · Enter – karta osoby · ', lista)
        przew.after(podpis)
    }

    let zajety = false
    const naKarcie = () => !!opcje.zmien && wTabeli && !fig.classList.contains('drzewo-pelne')
    const stanPrzyciskow = () => {
        przodkowie.ustaw(Number(fig.dataset.pokolenWstecz ?? 0), fig.dataset.wiecejWstecz === '1', zajety)
        potomkowie.ustaw(Number(fig.dataset.pokolenNaprzod ?? 0), fig.dataset.wiecejNaprzod === '1', zajety)
        const ileR = Number(fig.dataset.rodzenstwo ?? 0)
        const pokazane = fig.dataset.zakres === 'rodzenstwo'
        rodz.parentElement!.hidden = ileR === 0
        rodz.setAttribute('aria-pressed', String(pokazane))
        rodz.title = pokazane ? `ukryj rodzeństwo (${ileR})` : `pokaż rodzeństwo (${ileR})`
        rodz.disabled = zajety
        fig.toggleAttribute('aria-busy', zajety)
    }

    // DRZ-01 (P3, decyzja 17.11): drzewo w tabeli karty osoby ma liczbę pokoleń z adresu. To, co doczytano na pełnym ekranie,
    // jest osobnym oglądaniem – po zamknięciu wraca drzewo z adresu.
    const KLUCZE = ['wstecz', 'naprzod', 'zakres', 'wiecejWstecz', 'wiecejNaprzod', 'rodzenstwo', 'pokolenWstecz', 'pokolenNaprzod'] as const
    const poczatek = wTabeli ? { html: przew.innerHTML, tekst: fig.querySelector(':scope > .dr-tekst')?.outerHTML ?? null, dane: Object.fromEntries(KLUCZE.map((k) => [k, fig.dataset[k] ?? ''])) } : null
    const przywrocPoczatek = () => {
        if (!poczatek || KLUCZE.every((k) => (fig.dataset[k] ?? '') === poczatek.dane[k])) return
        przew.innerHTML = poczatek.html
        const t = fig.querySelector(':scope > .dr-tekst')
        if (t && poczatek.tekst) t.outerHTML = poczatek.tekst
        for (const k of KLUCZE) fig.dataset[k] = poczatek.dane[k]
        stanPrzyciskow()
        ustawKarty()
    }

    // wielkość samego drzewa (A−/A+ w pasku; A± strony działa niezależnie); na karcie i na pełnym ekranie
    let skala = 1
    try { const z = Number(localStorage.getItem(KLUCZ_SKALI)); if (SKALE.includes(z)) skala = z } catch { /* bez pamięci */ }
    const ustawSkale = (s: number, zapisz = true) => {
        skala = s
        fig.style.setProperty('--dr-skala', String(s))
        skalaTxt.textContent = `wielkość drzewa ${Math.round(s * 100)}%`
        mniej.disabled = s <= SKALE[0]
        wiecej.disabled = s >= SKALE[SKALE.length - 1]
        if (zapisz) { try { localStorage.setItem(KLUCZ_SKALI, String(s)) } catch { /* bez pamięci */ } }
        if (wTabeli || fig.classList.contains('drzewo-pelne')) requestAnimationFrame(() => wysrodkuj(przew, true))
    }
    const krokSkali = (d: number) => {
        const i = SKALE.findIndex((x) => x >= skala - 0.001)
        ustawSkale(SKALE[Math.max(0, Math.min(SKALE.length - 1, (i < 0 ? 4 : i) + d))])
    }
    ustawSkale(skala, false)
    mniej.addEventListener('click', () => krokSkali(-1))
    wiecej.addEventListener('click', () => krokSkali(1))

    // 5A (scena 4, zasada 5.3): pełny ekran wchodzi wygaszeniem (globals.css), po zamknięciu fokus wraca na przycisk,
    // którym go otwarto
    let otwierajacy: HTMLElement | null = null
    const zamknij = () => {
        if (!fig.classList.contains('drzewo-pelne')) return
        fig.classList.remove('drzewo-pelne')
        glowny.textContent = 'pełny ekran ⤢'
        document.body.style.overflow = ''
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        przywrocPoczatek()
        requestAnimationFrame(() => { wysrodkuj(przew); przywrocFokus(otwierajacy); otwierajacy = null })
    }
    const otworz = () => {
        otwierajacy = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : glowny
        fig.classList.add('drzewo-pelne')
        glowny.textContent = 'zamknij ✕'
        document.body.style.overflow = 'hidden'
        fig.requestFullscreen?.().catch(() => {})
        requestAnimationFrame(() => { wysrodkuj(przew); glowny.focus() })
    }
    const przelacz = () => (fig.classList.contains('drzewo-pelne') ? zamknij() : otworz())
    glowny.addEventListener('click', przelacz)

    const pokazKomunikat = (tekst: string) => {
        komunikat.textContent = tekst
        window.setTimeout(() => { if (komunikat.textContent === tekst) komunikat.textContent = '' }, 3000)
    }

    // nowe drzewo z serwera na pełnym ekranie (krok 1, rodzeństwo) w miejsce obecnego
    const wczytaj = async (p: ParametryDrzewa) => {
        if (zajety || !fig.dataset.osoba) return
        zajety = true
        stanPrzyciskow()
        const q = new URLSearchParams({ wstecz: String(p.wstecz), naprzod: String(p.naprzod), zakres: p.zakres, ...(wTabeli ? { tabela: '1' } : {}) })
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
            for (const k of KLUCZE) fig.dataset[k] = nowa.dataset[k] ?? ''
            ustawKarty()
            requestAnimationFrame(() => wysrodkuj(przew, true))
        } catch {
            pokazKomunikat('nie udało się wczytać – spróbuj jeszcze raz')
        }
        zajety = false
        stanPrzyciskow()
    }

    const biezace = (): ParametryDrzewa => ({
        wstecz: Number(fig.dataset.wstecz ?? DOMYSLNE_WSTECZ),
        naprzod: Number(fig.dataset.naprzod ?? DOMYSLNE_NAPRZOD),
        zakres: fig.dataset.zakres === 'rodzenstwo' ? 'rodzenstwo' : 'malzonkowie',
    })
    const akcja = (nazwa: string) => {
        if (zajety) return
        const pokW = Number(fig.dataset.pokolenWstecz ?? 0), pokN = Number(fig.dataset.pokolenNaprzod ?? 0)
        const p = biezace()
        if (nazwa === 'wstecz+' || nazwa === 'wstecz-') p.wstecz = krokPokolen(pokW, nazwa === 'wstecz+' ? 1 : -1)
        else if (nazwa === 'naprzod+' || nazwa === 'naprzod-') p.naprzod = krokPokolen(pokN, nazwa === 'naprzod+' ? 1 : -1)
        else p.zakres = p.zakres === 'rodzenstwo' ? 'malzonkowie' : 'rodzenstwo'
        if (naKarcie()) {
            fokusPo = { figura: fig.id, akcja: nazwa, czas: Date.now() }
            zajety = true
            stanPrzyciskow()
            opcje.zmien!(p)
            // gdyby adres się nie zmienił (błąd sieci) – przyciski nie mogą zostać zablokowane
            window.setTimeout(() => { if (fig.isConnected && zajety) { zajety = false; stanPrzyciskow() } }, 6000)
        } else void wczytaj(p)
    }
    for (const b of [przodkowie.mniej, przodkowie.wiecej, potomkowie.mniej, potomkowie.wiecej, rodz]) b.addEventListener('click', () => akcja(b.dataset.akcja!))
    stanPrzyciskow()
    if (fokusPo && fokusPo.figura === fig.id && Date.now() - fokusPo.czas < 8000) {
        const szukaj = (a: string) => pasek.querySelector<HTMLButtonElement>(`button[data-akcja="${a}"]:not(:disabled)`)
        const cel = szukaj(fokusPo.akcja) ?? (ZAPASOWE[fokusPo.akcja] ? szukaj(ZAPASOWE[fokusPo.akcja]) : null)
        cel?.focus()
        fokusPo = null
    }

    // VIEW-06: Tab wchodzi na drzewo jednym przystankiem (osoba w środku), dalej strzałki; Enter otwiera kartę osoby
    const karty = () => [...przew.querySelectorAll<HTMLElement>('.dr-karta[data-id]')]
    const aktywna = (el: HTMLElement | null) => { for (const k of karty()) k.tabIndex = k === el ? 0 : -1 }
    function ustawKarty() { aktywna(przew.querySelector<HTMLElement>('.dr-glowna')) }
    const opisKart = (): KartaNaw[] => karty().map((el) => ({
        id: el.dataset.id!, rzad: Number(el.dataset.rzad), x: Number(el.dataset.x),
        rodzice: (el.dataset.rodzice ?? '').split(' ').filter(Boolean), rodzina: el.dataset.rodzina ?? '', partner: el.dataset.partner ?? '',
    }))
    const pokazKarte = (el: HTMLElement) => {
        const a = el.getBoundingClientRect(), b = przew.getBoundingClientRect()
        const etykieta = przew.querySelector('.dr-pokol')?.getBoundingClientRect().width ?? 0
        const lewa = b.left + etykieta + 8
        if (a.left < lewa) przew.scrollLeft -= lewa - a.left
        else if (a.right > b.right - 8) przew.scrollLeft += a.right - (b.right - 8)
        if (a.top < b.top + 8) przew.scrollTop -= b.top + 8 - a.top
        else if (a.bottom > b.bottom - 8) przew.scrollTop += a.bottom - (b.bottom - 8)
    }
    const naStrzalke = (e: KeyboardEvent) => {
        if (!STRZALKI.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
        const z = (e.target as Element).closest<HTMLElement>('.dr-karta[data-id]')
        if (!z) return
        const cel = nastepnaKarta(opisKart(), z.dataset.id!, e.key as KlawiszStrzalki)
        const el = cel && karty().find((k) => k.dataset.id === cel.id)
        if (!el) return
        e.preventDefault()
        aktywna(el)
        el.focus({ preventScroll: true })
        pokazKarte(el)
    }
    const naFokus = (e: FocusEvent) => {
        const z = (e.target as Element).closest<HTMLElement>('.dr-karta[data-id]')
        if (z && z.tabIndex !== 0) aktywna(z)
    }
    // PK: klik albo Enter na osobie – karta osoby z przejściem strony (z Ctrl/⌘/Shift/środkowym przyciskiem – jak zwykły odnośnik)
    const naKlik = (e: MouseEvent) => {
        if (!opcje.otworz || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
        const a = (e.target as Element).closest<HTMLAnchorElement>('a.dr-karta[href]')
        if (!a || !przew.contains(a)) return
        e.preventDefault()
        if (fig.classList.contains('drzewo-pelne')) zamknij()
        opcje.otworz(a.getAttribute('href')!)
    }
    przew.addEventListener('keydown', naStrzalke)
    przew.addEventListener('focusin', naFokus)
    przew.addEventListener('click', naKlik)
    ustawKarty()

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
        document.removeEventListener('keydown', klawisz)
        document.removeEventListener('fullscreenchange', zmianaFs)
        window.removeEventListener('pointermove', ruch)
        window.removeEventListener('pointerup', gora)
        przew.removeEventListener('pointerdown', dol)
        przew.removeEventListener('keydown', naStrzalke)
        przew.removeEventListener('focusin', naFokus)
        przew.removeEventListener('click', naKlik)
        pasek.remove()
        podpis?.remove()
        delete fig.dataset.drzewoGotowe
        document.body.style.overflow = ''
    }
}

export default function DrzewaLinie() {
    React.useEffect(() => {
        // drzewa z własną obsługą (karta osoby – DrzewoKarty) pomijamy
        const sprzatanie = [...document.querySelectorAll<HTMLElement>('figure.drzewo')].filter((f) => !f.closest('[data-drzewo-wlasne]')).map((f) => przygotuj(f))
        return () => sprzatanie.forEach((f) => f())
    }, [])
    return null
}

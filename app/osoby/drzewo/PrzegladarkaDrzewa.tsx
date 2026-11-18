'use client'

// PK (decyzje właściciela 18.11): całe drzewo jako aplet przeglądarki. Łatka po PK: rama (pasek, pełny ekran, przybliżenie
// w pasku, chowanie panelu, pasek panelu, kółko) wspólna z planem – app/components/aplet/RamaPrzegladarki.tsx.
// Drzewo: suwaki w obu osiach, przeciąganie (łapka), płynne przybliżanie (− N% + i „całe drzewo w oknie” w pasku, kółko myszy, klawisze + − 0).
// Kliknięcie osoby otwiera jej kartę w panelu (jak grób na planie) – środek drzewa zostaje. Panel: szukanie u góry, karta
// wybranej osoby (podstawy: lata, urodzenie, zgon, rodzice, małżonek, dzieci, rodzeństwo); domyślnie otwarty, można schować.

import * as React from 'react'
import { Link, useTransitionRouter } from 'next-view-transitions'
import { normalizuj, odmiana } from '@/lib/tekst'
import { animuj, przewinO } from '@/lib/ruch'
import { SKALA_START, dopasowana, ogranicz, przewiniecie } from '@/lib/osoby/drzewo-zoom'
import { KLAWISZE_PRZYBLIZENIA, KROK_PRZYCISKU, klawiszPrzyblizenia, wskazowkaPrzyblizenia } from '@/lib/przyblizenie'
import RamaPrzegladarki, { PasekPanelu, useKolkoPrzyblizenia, useRama } from '@/app/components/aplet/RamaPrzegladarki'
import PanelPlanu, { CalyPanelu, CzescPanelu, WierszPanelu } from '@/app/components/plan/PanelPlanu'
import { przygotuj } from '@/app/components/DrzewaLinie'

export interface OsobaPanelu {
    id: string; nazwa: string; katalog: string; plec: string; lata: string; ur: string; zm: string
    rodzice: string[]; malzonkowie: string[]; dzieci: string[]; rodzenstwo: string[]; szukaj: string
}
type Zakladka = 'drzewo' | 'lista'

function czesciDrzewa(kontener: HTMLElement | null) {
    const fig = kontener?.querySelector<HTMLElement>('figure.drzewo') ?? null
    return { fig, przew: fig?.querySelector<HTMLElement>(':scope > .dr-przewijanie') ?? null, plansza: fig?.querySelector<HTMLElement>('.dr-plansza') ?? null }
}
/** widoczna część okna drzewa – bez przyklejonej kolumny nazw pokoleń po lewej */
function widoczne(przew: HTMLElement) {
    const a = przew.getBoundingClientRect()
    const lewa = Math.max(a.left, przew.querySelector('.dr-pokol')?.getBoundingClientRect().right ?? a.left)
    return { left: lewa, right: a.left + przew.clientWidth, top: a.top, bottom: a.top + przew.clientHeight }
}
/** karta na środku widocznej części okna drzewa (przewinięcie tylko okna drzewa, nie strony) */
function naSrodek(przew: HTMLElement, k: HTMLElement, gladko: boolean) {
    const a = widoczne(przew), b = k.getBoundingClientRect()
    const o = { left: b.left + b.width / 2 - (a.left + a.right) / 2, top: b.top + b.height / 2 - (a.top + a.bottom) / 2 }
    if (gladko) przewinO(przew, o)
    else przew.scrollBy(o)
}

interface Pokolenia { w: number; n: number; ileR: number; wiecejW: boolean; wiecejN: boolean }
interface Wlasciwosci {
    html: string; osoby: OsobaPanelu[]; od: string; rody: { id: string; nazwa: string; osob: number }[]
    wstecz: number; naprzod: number; boczni: boolean; rodzenstwo: boolean
}

function useIdz() {
    const router = useTransitionRouter()
    return React.useCallback((zm: Record<string, string | null>) => {
        const u = new URLSearchParams(window.location.search)
        for (const [k, v] of Object.entries(zm)) { if (v === null) u.delete(k); else u.set(k, v) }
        router.push(`/osoby/drzewo?${u.toString()}`, { scroll: false } as never)
    }, [router])
}

export default function PrzegladarkaDrzewa(w: Wlasciwosci) {
    const { boczni, rodzenstwo } = w
    const idz = useIdz()
    const [zakl, ustawZakl] = React.useState<Zakladka>('drzewo')
    const [pokolenia, ustawPokolenia] = React.useState<Pokolenia>({ w: w.wstecz, n: w.naprzod, ileR: 0, wiecejW: false, wiecejN: false })
    return (
        <RamaPrzegladarki prefix="aplet-drzewo" etykietaPaska="przeglądanie drzewa" etykietaZakladek="widok drzewa" tytul="całe drzewo" klasa="drzewo-aplet"
            zakladki={[{ id: 'drzewo', etykieta: 'drzewo' }, { id: 'lista', etykieta: 'lista pokoleń' }]} aktywna={zakl} ustawZakladke={ustawZakl} kluczPanelu="drzewo-panel"
            lewa={(
                <>
                    <span className="dok-grupa drzewo-krok" role="group" aria-label="przodkowie">
                        <button type="button" aria-label="mniej pokoleń przodków" disabled={pokolenia.w <= 0} onClick={() => idz({ wstecz: String(Math.max(0, pokolenia.w - 1)) })}>−</button>
                        <span className="drzewo-krok-txt" title="pokolenia przodków">↑ {pokolenia.w}</span>
                        <button type="button" aria-label="więcej pokoleń przodków" disabled={!pokolenia.wiecejW} onClick={() => idz({ wstecz: String(pokolenia.w + 1) })}>+</button>
                    </span>
                    <span className="dok-grupa drzewo-krok" role="group" aria-label="potomkowie">
                        <button type="button" aria-label="mniej pokoleń potomków" disabled={pokolenia.n <= 0} onClick={() => idz({ naprzod: String(Math.max(0, pokolenia.n - 1)) })}>−</button>
                        <span className="drzewo-krok-txt" title="pokolenia potomków">↓ {pokolenia.n}</span>
                        <button type="button" aria-label="więcej pokoleń potomków" disabled={!pokolenia.wiecejN} onClick={() => idz({ naprzod: String(pokolenia.n + 1) })}>+</button>
                    </span>
                    <span className="dok-grupa" role="group" aria-label="krewni w widoku">
                        <button type="button" aria-pressed={boczni} onClick={() => idz({ boczni: boczni ? '0' : null })}>rodziny rodziców</button>
                        {pokolenia.ileR > 0 && <button type="button" aria-pressed={rodzenstwo} onClick={() => idz({ rodzenstwo: rodzenstwo ? '0' : null })}>rodzeństwo</button>}
                    </span>
                </>
            )}>
            <WidokDrzewa {...w} ustawPokolenia={ustawPokolenia} />
        </RamaPrzegladarki>
    )
}

function WidokDrzewa({ html, osoby, od, rody, ustawPokolenia }: Wlasciwosci & { ustawPokolenia: (p: Pokolenia) => void }) {
    const idz = useIdz()
    const { przelaczPanel, panel, zglosPrzyblizenie } = useRama()
    const mapa = React.useMemo(() => new Map(osoby.map((o) => [o.id, o])), [osoby])
    const [wybrana, ustawWybrana] = React.useState(od)
    const [szukaj, ustawSzukaj] = React.useState('')
    const drzewoRef = React.useRef<HTMLDivElement>(null)
    const skala = React.useRef(SKALA_START)
    const [procent, ustawProcent] = React.useState(Math.round(SKALA_START * 100))
    const przerwij = React.useRef<() => void>(() => {})
    const [naDrzewie, ustawNaDrzewie] = React.useState<Set<string>>(new Set())

    const elementy = () => czesciDrzewa(drzewoRef.current)
    // skala widoku: --dr-skala (CSS zoom planszy), punkt (cx, cy) okna drzewa zostaje na miejscu
    const ustawSkale = React.useCallback((s1: number, cx?: number, cy?: number) => {
        const { fig, przew } = elementy()
        if (!fig || !przew) return
        const s0 = skala.current
        const x = cx ?? przew.clientWidth / 2, y = cy ?? przew.clientHeight / 2
        const l = przewiniecie(przew.scrollLeft, x, s0, s1), t = przewiniecie(przew.scrollTop, y, s0, s1)
        skala.current = s1
        ustawProcent(Math.round(s1 * 100))
        fig.style.setProperty('--dr-skala', String(s1))
        przew.scrollLeft = l
        przew.scrollTop = t
    }, [])
    const plynnie = React.useCallback((cel: number, cx?: number, cy?: number) => {
        przerwij.current()
        const s0 = skala.current, s1 = ogranicz(cel)
        przerwij.current = animuj('szybki', (p) => ustawSkale(s0 + (s1 - s0) * p, cx, cy))
    }, [ustawSkale])
    const caleWOknie = React.useCallback(() => {
        const { fig, przew, plansza } = elementy()
        if (!fig || !przew || !plansza) return
        const fs = Number.parseFloat(getComputedStyle(fig).getPropertyValue('--font-scale')) || 1
        plynnie(dopasowana(przew.clientWidth, przew.clientHeight, Number.parseFloat(plansza.style.width) * fs, Number.parseFloat(plansza.style.height) * fs), 0, 0)
    }, [plynnie])

    // drzewo z serwera: wspólna obsługa (strzałki, przeciąganie), własny pasek apletu zamiast paska drzewa
    React.useEffect(() => {
        const { fig, przew } = elementy()
        if (!fig || !przew) return undefined
        const sprzataj = przygotuj(fig)
        skala.current = SKALA_START
        ustawProcent(Math.round(SKALA_START * 100))
        fig.style.setProperty('--dr-skala', String(SKALA_START))
        const glowna = przew.querySelector<HTMLElement>('.dr-glowna')
        if (glowna) requestAnimationFrame(() => naSrodek(przew, glowna, false))
        ustawNaDrzewie(new Set([...fig.querySelectorAll<HTMLElement>('.dr-karta[data-id]')].map((k) => k.dataset.id!)))
        ustawPokolenia({ w: Number(fig.dataset.pokolenWstecz ?? 0), n: Number(fig.dataset.pokolenNaprzod ?? 0), ileR: Number(fig.dataset.rodzenstwo ?? 0), wiecejW: fig.dataset.wiecejWstecz === '1', wiecejN: fig.dataset.wiecejNaprzod === '1' })
        const klik = (e: MouseEvent) => {
            const k = (e.target as Element).closest<HTMLElement>('.dr-karta[data-id]')
            if (!k || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return
            e.preventDefault()
            ustawWybrana(k.dataset.id!)
            ustawSzukaj('')
            przelaczPanel(true)
        }
        fig.addEventListener('click', klik, true)
        return () => { fig.removeEventListener('click', klik, true); przerwij.current(); sprzataj() }
    }, [html, przelaczPanel, ustawSkale, ustawPokolenia])

    // kółko – wspólna obsługa z planem: przybliża przy kursorze; Shift + kółko – przeglądarka przewija w bok sama
    useKolkoPrzyblizenia(() => elementy().przew, [html], (czynnik, x, y) => {
        przerwij.current()
        ustawSkale(ogranicz(skala.current * czynnik), x, y)
    })

    // wybrana osoba obwiedziona na drzewie i przewinięta do widoku, gdy jest poza oknem (bez przewijania strony)
    React.useEffect(() => {
        const { przew } = elementy()
        if (!przew) return
        przew.querySelectorAll('.dr-wybrana').forEach((k) => k.classList.remove('dr-wybrana'))
        const k = przew.querySelector<HTMLElement>(`.dr-karta[data-id="${CSS.escape(wybrana)}"]`)
        if (!k) return
        k.classList.add('dr-wybrana')
        const a = widoczne(przew), b = k.getBoundingClientRect()
        if (b.left < a.left + 20 || b.right > a.right - 20 || b.top < a.top + 20 || b.bottom > a.bottom - 20) naSrodek(przew, k, true)
    }, [wybrana, panel])

    // klawisze na drzewie: + − przybliżenie, 0 – całe drzewo w oknie (jak na planie)
    const klawisz = (e: React.KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return
        const a = klawiszPrzyblizenia(e.key)
        if (!a) return
        e.preventDefault()
        if (a === 'przybliz') plynnie(skala.current * KROK_PRZYCISKU)
        else if (a === 'oddal') plynnie(skala.current / KROK_PRZYCISKU)
        else caleWOknie()
    }

    // przybliżenie w pasku ramy (− N% + i „całe drzewo w oknie”)
    React.useEffect(() => {
        zglosPrzyblizenie({
            procent,
            przybliz: () => plynnie(skala.current * KROK_PRZYCISKU),
            oddal: () => plynnie(skala.current / KROK_PRZYCISKU),
            calosc: caleWOknie,
            etykietaCalosci: 'całe drzewo w oknie',
        })
    }, [procent, plynnie, caleWOknie, zglosPrzyblizenie])
    React.useEffect(() => () => zglosPrzyblizenie(null), [zglosPrzyblizenie])
    const doSrodka = (id: string) => idz({ od: id })

    const sl = normalizuj(szukaj.trim()).split(/\s+/).filter(Boolean)
    const wyniki = sl.length ? osoby.filter((o) => sl.every((s) => o.szukaj.includes(s))).slice(0, 30) : []
    const wybierzWynik = (id: string) => { if (naDrzewie.has(id)) { ustawWybrana(id); ustawSzukaj('') } else doSrodka(id) }
    const os = mapa.get(wybrana)
    const pastylki = (ids: string[]) => ids.length ? (
        <span className="plan-panel-przyciski">
            {ids.map((x) => {
                const p = mapa.get(x)!
                return <button key={x} type="button" className={`osoba-link osoba-${p.plec === 'K' || p.plec === 'M' ? p.plec : 'U'} drzewo-pastylka${naDrzewie.has(x) ? '' : ' drzewo-pastylka-poza'}`}
                    title={naDrzewie.has(x) ? `${p.nazwa} – pokaż na drzewie` : `${p.nazwa} – poza widokiem drzewa`} onClick={() => ustawWybrana(x)}>{p.nazwa}</button>
            })}
        </span>
    ) : null
    const tytulCzesci = sl.length ? 'wyniki szukania' : os ? (os.id === od ? 'osoba w środku drzewa' : 'wybrana osoba') : 'osoba'

    const tresc = sl.length ? (
        wyniki.length ? (
            <ul className="plan-panel-wyniki">
                {wyniki.map((o) => (
                    <li key={o.id}>
                        <button type="button" className="plan-panel-wynik" onClick={() => wybierzWynik(o.id)}>
                            <span>{o.katalog}</span>
                            <span className="plan-panel-wynik-nr">{o.lata}{naDrzewie.has(o.id) ? ' · na drzewie' : ' · ustaw w środku →'}</span>
                        </button>
                    </li>
                ))}
            </ul>
        ) : <CalyPanelu><p className="plan-panel-pusto">Nikogo nie znaleziono.</p></CalyPanelu>
    ) : os ? (
        <>
            <CzescPanelu tytul={os.nazwa}><Link href={`/osoby/${os.id}`} className="odn">karta osoby →</Link></CzescPanelu>
            <WierszPanelu e="lata życia">{os.lata}</WierszPanelu>
            <WierszPanelu e="urodzenie">{os.ur}</WierszPanelu>
            <WierszPanelu e="zgon">{os.zm}</WierszPanelu>
            <WierszPanelu e="rodzice">{pastylki(os.rodzice)}</WierszPanelu>
            <WierszPanelu e={os.malzonkowie.length > 1 ? 'małżonkowie' : os.plec === 'K' ? 'mąż' : os.plec === 'M' ? 'żona' : 'małżonek'}>{pastylki(os.malzonkowie)}</WierszPanelu>
            <WierszPanelu e="dzieci">{pastylki(os.dzieci)}</WierszPanelu>
            <WierszPanelu e="rodzeństwo">{pastylki(os.rodzenstwo)}</WierszPanelu>
            <CalyPanelu>
                <span className="plan-panel-przyciski">
                    {os.id !== od && <button type="button" className="k-btn k-btn--s" onClick={() => doSrodka(os.id)}>ustaw w środku drzewa</button>}
                    <Link href={`/osoby/${os.id}`} className="k-btn k-btn--s">karta osoby →</Link>
                </span>
                {!naDrzewie.has(os.id) && <p className="plan-panel-drobne">Tej osoby nie ma w obecnym widoku drzewa – „ustaw w środku” pokaże jej rodzinę.</p>}
            </CalyPanelu>
            {rody.length > 0 && (
                <>
                    <CzescPanelu tytul="inne części drzewa" />
                    <CalyPanelu>
                        <p className="plan-panel-drobne">Rody, które nie łączą się z tym drzewem żadną rodziną:</p>
                        <span className="plan-panel-przyciski">{rody.map((r) => <button key={r.id} type="button" className="k-btn k-btn--s" onClick={() => doSrodka(r.id)}>{r.nazwa} · {r.osob}</button>)}</span>
                    </CalyPanelu>
                </>
            )}
            <WierszPanelu e="klawiatura">Tab – na drzewo · strzałki – rodzice, dzieci, rodzeństwo · Enter – karta w panelu · {KLAWISZE_PRZYBLIZENIA}</WierszPanelu>
        </>
    ) : null

    return (
        <>
            <PasekPanelu tytul={tytulCzesci} />
            <div className="plan-aplet-mapa drzewo-aplet-obszar" onKeyDown={klawisz}>
                <div ref={drzewoRef} className="ot-drzewo drzewo-aplet-drzewo" data-drzewo-wlasne="" dangerouslySetInnerHTML={{ __html: html }} />
                <div className="plan-wskazowka">{wskazowkaPrzyblizenia('kliknij – karta w panelu')}</div>
            </div>
            <div className="plan-aplet-panel">
                <PanelPlanu tytul={tytulCzesci} szukaj={szukaj} ustawSzukaj={ustawSzukaj} naSzukaj={() => { if (wyniki[0]) wybierzWynik(wyniki[0].id) }}
                    podpowiedz="szukaj osoby: nazwisko, imię, rok…" etykieta="panel drzewa: osoby"
                    opisPodpowiedzi={sl.length ? `${odmiana(wyniki.length, ['osoba', 'osoby', 'osób'])} – osoba z drzewa pokaże się w panelu, spoza drzewa stanie w środku` : undefined}>
                    {tresc}
                </PanelPlanu>
            </div>
        </>
    )
}

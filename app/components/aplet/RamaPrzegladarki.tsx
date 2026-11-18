'use client'

// Łatka po PK (decyzja właściciela 18.11: „podobne elementy w podobnych narzędziach mają działać tak samo”, wspólny
// mechanizm): jedna rama przeglądarki dla planu cmentarza / planów (PrzegladarkaPlanu) i całego drzewa
// (PrzegladarkaDrzewa). Rama ma: pasek nad widokiem (zakładki, dodatki narzędzia, przybliżenie − N% + i „całość”,
// „panel ◂”, pełny ekran), pełny ekran (fokus uwięziony, Esc, powrót fokusu, wyjście z trybu przeglądarki), chowanie
// panelu (zapamiętane w przeglądarce) i pasek panelu (PasekPanelu: tytuł części, ×, ▸). Widok i panel dostarcza narzędzie
// (plan – SVG, drzewo – karty HTML) i zgłasza ramie swoje przybliżenie przez useRama().zglosPrzyblizenie.
// Siatka i klasy: .plan-aplet (globals.css). Zachowanie przybliżania: lib/przyblizenie.ts.

import * as React from 'react'
import { Shrink } from 'lucide-react'
import { ListaZakladek, atrybutyPanelu } from '../Zakladki'
import { useFokusPowrotu, useUwiezionyFokus } from '@/lib/ruch'
import { czynnikKolka, przesuniecieKolka } from '@/lib/przyblizenie'

export interface Przyblizenie {
    /** przybliżenie w procentach względem widoku startowego */
    procent: number
    przybliz: () => void
    oddal: () => void
    calosc: () => void
    /** podpis przycisku „całość”, np. „cały plan”, „całe drzewo w oknie” */
    etykietaCalosci: string
}
interface Rama {
    panel: boolean
    przelaczPanel: (widoczny: boolean) => void
    pelny: boolean
    zglosPrzyblizenie: (p: Przyblizenie | null) => void
}
const KontekstRamy = React.createContext<Rama | null>(null)
export const useRama = (): Rama => {
    const r = React.useContext(KontekstRamy)
    if (!r) throw new Error('useRama poza RamaPrzegladarki')
    return r
}

export default function RamaPrzegladarki<Z extends string>({ prefix, etykietaPaska, etykietaZakladek, tytul, klasa, zakladki, aktywna, ustawZakladke, lewa, prawa, kluczPanelu, escZamyka, children, lista }: {
    prefix: string
    /** nazwa paska dla czytnika ekranu, np. „przeglądanie planu” */
    etykietaPaska: string
    /** nazwa listy zakładek, np. „widok planu” */
    etykietaZakladek: string
    /** tytuł w pasku na pełnym ekranie i nazwa okna */
    tytul: string
    /** dodatkowe klasy ramki (np. drzewo-aplet, plan-do-druku) */
    klasa?: string
    /** pierwsza zakładka to widok z przybliżaniem i panelem */
    zakladki: { id: Z; etykieta: string }[]
    aktywna: Z
    ustawZakladke: (z: Z) => void
    /** grupy w pasku po zakładkach (np. pokolenia drzewa) */
    lewa?: React.ReactNode
    /** grupy w pasku przed przybliżeniem (np. eksport planu) */
    prawa?: React.ReactNode
    /** klucz localStorage stanu panelu (schowany / widoczny) */
    kluczPanelu: string
    /** czy Esc może zamknąć pełny ekran (np. nie przy otwartej galerii zdjęć) */
    escZamyka?: () => boolean
    /** zawartość pierwszej zakładki: PasekPanelu, widok (.plan-aplet-mapa) i panel (.plan-aplet-panel) */
    children: React.ReactNode
    /** zawartość drugiej zakładki (lista); bez niej narzędzie obsługuje listę samo */
    lista?: React.ReactNode
}) {
    const [pelny, ustawPelny] = React.useState(false)
    const [panel, ustawPanel] = React.useState(true)
    const [przyblizenie, zglosPrzyblizenie] = React.useState<Przyblizenie | null>(null)
    const ramka = React.useRef<HTMLDivElement>(null)
    const widok = zakladki[0].id

    // panel domyślnie widoczny (decyzja 18.11); schowanie zapamiętane w tej przeglądarce
    React.useEffect(() => { try { if (localStorage.getItem(kluczPanelu) === '0') ustawPanel(false) } catch { /* bez pamięci */ } }, [kluczPanelu])
    const przelaczPanel = React.useCallback((v: boolean) => { ustawPanel(v); try { localStorage.setItem(kluczPanelu, v ? '1' : '0') } catch { /* bez pamięci */ } }, [kluczPanelu])

    // VIEW-03: po zamknięciu pełnego ekranu fokus wraca na przycisk, którym go otwarto; fokus uwięziony w ramie
    useFokusPowrotu(pelny, {
        wejscie: () => ramka.current?.querySelector<HTMLElement>('button[aria-label="zamknij pełny ekran"]'),
        zapasowy: () => ramka.current?.querySelector<HTMLElement>('button[aria-label="pełny ekran"]'),
    })
    useUwiezionyFokus(pelny, ramka)
    const zamknijPelny = React.useCallback(() => {
        ustawPelny(false)
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }, [])
    const otworzPelny = () => {
        ustawPelny(true)
        ramka.current?.requestFullscreen?.().catch(() => {})
    }
    const escRef = React.useRef(escZamyka)
    escRef.current = escZamyka
    React.useEffect(() => {
        if (!pelny) return undefined
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && (escRef.current?.() ?? true)) zamknijPelny() }
        const wyjscie = () => { if (!document.fullscreenElement) ustawPelny(false) }
        document.addEventListener('keydown', esc)
        document.addEventListener('fullscreenchange', wyjscie)
        const przewijanie = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.removeEventListener('keydown', esc); document.removeEventListener('fullscreenchange', wyjscie); document.body.style.overflow = przewijanie }
    }, [pelny, zamknijPelny])

    const kontekst = React.useMemo<Rama>(() => ({ panel, przelaczPanel, pelny, zglosPrzyblizenie }), [panel, przelaczPanel, pelny])
    const naWidoku = aktywna === widok

    return (
        <KontekstRamy.Provider value={kontekst}>
            <div ref={ramka} className={`plan-aplet przegladarka-aplet${klasa ? ` ${klasa}` : ''}${naWidoku ? '' : ' plan-aplet--lista'}${pelny ? ' plan-aplet--pelny' : ''}${panel ? '' : ' plan-aplet--bez-panelu'}`}
                role={pelny ? 'dialog' : undefined} aria-modal={pelny ? true : undefined} aria-label={pelny ? `${tytul} – pełny ekran` : undefined}>
                <div className="plan-aplet-pasek">
                    <div className="dok-pasek dok-pasek-karta" role="toolbar" aria-label={etykietaPaska}>
                        <span className="dok-pasek-lewa">
                            {pelny && <b className="dok-tytul">{tytul}</b>}
                            <ListaZakladek prefix={prefix} etykieta={etykietaZakladek} zakladki={zakladki} aktywna={aktywna} ustaw={ustawZakladke} />
                            {lewa}
                        </span>
                        <span className="dok-pasek-prawa">
                            {prawa}
                            {przyblizenie && naWidoku && (
                                <span className="dok-grupa pasek-przyblizenie" role="group" aria-label="przybliżenie">
                                    <button type="button" aria-label="oddal" title="oddal (−)" onClick={przyblizenie.oddal}>−</button>
                                    <span className="pasek-przyblizenie-txt" aria-live="polite">{przyblizenie.procent}%</span>
                                    <button type="button" aria-label="przybliż" title="przybliż (+)" onClick={przyblizenie.przybliz}>+</button>
                                    {/* znak strzałek do środka – inny niż „pełny ekran ⤢” (odbiór 18.11) */}
                                    <button type="button" aria-label={przyblizenie.etykietaCalosci} title={`${przyblizenie.etykietaCalosci} (0)`} onClick={przyblizenie.calosc}><Shrink aria-hidden size={16} /></button>
                                </span>
                            )}
                            <span className="dok-grupa">
                                {!panel && naWidoku && <button type="button" onClick={() => przelaczPanel(true)}>panel ◂</button>}
                                {pelny
                                    ? <button type="button" onClick={zamknijPelny} aria-label="zamknij pełny ekran" title="zamknij (Esc)"><span className="dok-etyk">zamknij </span>✕</button>
                                    : <button type="button" onClick={otworzPelny} aria-label="pełny ekran" title="pełny ekran"><span className="dok-etyk">pełny ekran </span>⤢</button>}
                            </span>
                        </span>
                    </div>
                </div>
                {/* obszar pierwszej zakładki – display: contents (siatka ramy: pasek panelu, widok, panel) */}
                <div {...atrybutyPanelu(prefix, lista === undefined ? aktywna : widok)} className="plan-aplet-obszar">
                    {children}
                </div>
                {lista !== undefined && (
                    <div {...atrybutyPanelu(prefix, zakladki[1]?.id ?? widok)} className="plan-aplet-lista">{lista}</div>
                )}
            </div>
        </KontekstRamy.Provider>
    )
}

/** Pasek nad panelem: nazwa części, „×” (wyjście z wyboru / szukania – gdy narzędzie poda) i „▸” – schowaj panel. */
export function PasekPanelu({ tytul, zamknij }: { tytul: React.ReactNode; zamknij?: () => void }) {
    const { przelaczPanel } = useRama()
    return (
        <div className="szt-pasek plan-panel-pasek">
            <b className="szt-jedna">{tytul}</b>
            {zamknij && <button type="button" className="plan-panel-x" onClick={zamknij} aria-label="zamknij">×</button>}
            <button type="button" className="plan-panel-x" onClick={() => przelaczPanel(false)} aria-label="schowaj panel" title="schowaj panel">▸</button>
        </div>
    )
}

/** Kółko nad widokiem – wspólne zachowanie: kółko przybliża przy kursorze (czynnik > 1 przybliża), Shift + kółko –
 *  w bok (naBok; bez niego przeglądarka przewija w bok sama). Strona się nie przewija. */
export function useKolkoPrzyblizenia(pobierz: () => Element | null | undefined, zaleznosci: React.DependencyList, naPrzyblizenie: (czynnik: number, x: number, y: number) => void, naBok?: (px: number) => void) {
    const funkcje = React.useRef({ naPrzyblizenie, naBok })
    funkcje.current = { naPrzyblizenie, naBok }
    const pobierzRef = React.useRef(pobierz)
    pobierzRef.current = pobierz
    React.useEffect(() => {
        const el = pobierzRef.current()
        if (!el) return undefined
        const kolko = (e: Event) => {
            const w = e as WheelEvent
            if (w.shiftKey) {
                if (!funkcje.current.naBok) return
                w.preventDefault()
                funkcje.current.naBok(przesuniecieKolka(w.deltaX, w.deltaY, w.deltaMode))
                return
            }
            w.preventDefault()
            const r = el.getBoundingClientRect()
            funkcje.current.naPrzyblizenie(czynnikKolka(w.deltaY, w.deltaMode, w.ctrlKey), w.clientX - r.left, w.clientY - r.top)
        }
        el.addEventListener('wheel', kolko, { passive: false })
        return () => el.removeEventListener('wheel', kolko)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- element wskazuje narzędzie (np. drzewo z HTML serwera)
    }, zaleznosci)
}

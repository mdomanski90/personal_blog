'use client'
// PK: rama panelu (integracja B) – pasek 48 px, menu boczne z grupami w danych (lib/panel/menu.ts), kolumna ikon w edytorze planu,
// szuflada na telefonie, jeden przełącznik motywu (także dla Keystatic), szukaj w pasku (paleta Ctrl+K – P6).
import * as React from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { type LucideIcon, Archive, BookMarked, ChevronDown, ChevronRight, Ellipsis, ExternalLink, FileText, House, Inbox, Languages, Library, ListTodo, Map as IkonaMapy, Menu, Moon, PanelsTopLeft, Pin, PinOff, Search, SlidersHorizontal, Sun, Wrench } from 'lucide-react'
import { aktywna, menuWgUstawien, rodzajWidoku, stronaZAdresuKeystatic, type Ikona, type UstawieniaMenu } from '@/lib/panel/menu'
import type { RodzajPlanu } from '@/lib/plany/metadane'

const IKONY: Record<Ikona, LucideIcon> = {
    pulpit: House, zgloszenia: Inbox, opracowanie: ListTodo, tresci: FileText, archiwum: Archive, biblioteka: Library,
    ksiegi: BookMarked, slownik: Languages, strony: PanelsTopLeft, plany: IkonaMapy, narzedzia: Wrench,
}
const KLUCZ_SZER = 'odniepamieci-panel-szerokosc-v1'
/** ADM-04: zwinięcie menu zapamiętane między stronami panelu */
const KLUCZ_SCHOWANY = 'odniepamieci-panel-menu-v1'
const KLUCZ_GRUPY = 'odniepamieci-panel-grupy-v1'
const MIN = 190, MAX = 480, START = 230
const ogranicz = (n: number) => Math.min(MAX, Math.max(MIN, n))
const czytaj = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const zapisz = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* bez pamięci przeglądarki */ } }
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')

type Zgl = { stan: string; doPoprawy: string | null }
type Poz = { t: string; typ: string; href: string; d?: string }
type Menu = ReturnType<typeof menuWgUstawien>

function Szukaj({ pole }: { pole: React.RefObject<HTMLInputElement> }) {
    const [indeks, ustawIndeks] = React.useState<Poz[] | null>(null)
    const [q, ustawQ] = React.useState('')
    const [akt, ustawAkt] = React.useState(0)
    const [otwarte, ustawOtwarte] = React.useState(false)
    const wczytaj = () => { if (!indeks) { ustawIndeks([]); fetch('/api/keystatic/panel?czesc=indeks').then((r) => r.json()).then(ustawIndeks).catch(() => {}) } }
    const wyniki = React.useMemo(() => {
        const sl = norm(q.trim()).split(/\s+/).filter(Boolean)
        if (!sl.length || !indeks) return []
        return indeks.filter((x) => { const t = norm(`${x.t} ${x.typ} ${x.d ?? ''}`); return sl.every((s) => t.includes(s)) }).slice(0, 12)
    }, [q, indeks])
    return (
        <form role="search" aria-label="szukaj w panelu" className="pn-szukaj" onSubmit={(e) => { e.preventDefault(); if (wyniki[akt]) location.href = wyniki[akt].href }}>
            <Search aria-hidden />
            <input ref={pole} type="search" aria-label="szukaj w panelu" placeholder="szukaj: osoba, plan, MA-0042" autoComplete="off"
                role="combobox" aria-expanded={otwarte && !!q.trim()} aria-controls="pn-wyniki" aria-autocomplete="list"
                aria-activedescendant={otwarte && wyniki[akt] ? `pn-w-${akt}` : undefined}
                value={q} onFocus={() => { wczytaj(); ustawOtwarte(true) }} onBlur={() => window.setTimeout(() => ustawOtwarte(false), 150)}
                onChange={(e) => { ustawQ(e.target.value); ustawAkt(0); ustawOtwarte(true) }}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); ustawAkt((a) => Math.min(a + 1, wyniki.length - 1)) }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); ustawAkt((a) => Math.max(a - 1, 0)) }
                    else if (e.key === 'Escape') { ustawOtwarte(false); (e.target as HTMLInputElement).blur() }
                }} />
            <kbd aria-hidden="true">Ctrl K</kbd>
            {otwarte && q.trim() && (
                <div className="pn-wyniki" id="pn-wyniki" role="listbox" aria-label="wyniki">
                    {!wyniki.length && <span className="pn-maly pn-wyniki-pusto">{!indeks?.length ? 'wczytuję…' : 'nic nie znaleziono'}</span>}
                    {wyniki.map((w, i) => (
                        <a key={`${w.href}-${i}`} id={`pn-w-${i}`} href={w.href} data-akt={i === akt} role="option" aria-selected={i === akt}>
                            <span>{w.t}</span><span className="pn-szary">{w.typ}{w.d ? ` · ${w.d}` : ''}</span>
                        </a>
                    ))}
                </div>
            )}
        </form>
    )
}

function licznikPozycji(l: string | undefined, czeka: number, plany: Record<string, number>): number | null {
    if (!l) return null
    if (l === 'zgloszenia') return czeka
    const [rodzaj, k] = l.split(':')
    return (rodzaj === 'plany' || rodzaj === 'kolekcja' ? plany[`${rodzaj}:${k}`] : undefined) ?? null
}

function MenuPelne({ menu, sciezka, szukane, czeka, plany, pokazWszystko, ustawPokazWszystko, rozwiniete, przelaczGrupe, naGorze }: {
    menu: Menu; sciezka: string; szukane: string; czeka: number; plany: Record<string, number>
    pokazWszystko: boolean; ustawPokazWszystko: (b: boolean) => void; rozwiniete: Set<string>; przelaczGrupe: (k: string) => void; naGorze?: React.ReactNode
}) {
    const ukrytych = menu.reduce((a, g) => a + (g.pozycje.length ? g.pozycje.filter((p) => p.ukryta).length : g.ukryta ? 1 : 0), 0)
    return (
        <>
            {naGorze}
            <nav aria-label="menu panelu">
                {menu.map((g) => {
                    if (g.ukryta && !pokazWszystko) return null
                    const Ik = IKONY[g.ikona]
                    if (!g.pozycje.length && g.href) {
                        const n = licznikPozycji(g.licznik, czeka, plany)
                        return (
                            <a key={g.klucz} href={g.href} className={`pn-poz${g.ukryta ? ' pn-ukryta' : ''}`} aria-current={aktywna(g.href, sciezka, szukane) ? 'page' : undefined}>
                                <Ik aria-hidden strokeWidth={1.5} /><span className="pn-nazwa">{g.nazwa}</span>
                                {n ? <span className="pn-n" aria-label={`${n} czeka`}>{n}</span> : null}
                            </a>
                        )
                    }
                    const otwarta = rozwiniete.has(g.klucz)
                    const idListy = `pn-grupa-${g.klucz}`
                    return (
                        <React.Fragment key={g.klucz}>
                            <button type="button" className="pn-poz" aria-expanded={otwarta} aria-controls={idListy} onClick={() => przelaczGrupe(g.klucz)}>
                                <Ik aria-hidden strokeWidth={1.5} /><span className="pn-nazwa">{g.nazwa}</span>
                                {otwarta ? <ChevronDown className="pn-ch" aria-hidden /> : <ChevronRight className="pn-ch" aria-hidden />}
                            </button>
                            {otwarta && (
                                <div id={idListy} role="group" aria-label={g.nazwa}>
                                    {g.pozycje.filter((p) => pokazWszystko || !p.ukryta).map((p) => {
                                        const n = licznikPozycji(p.licznik, czeka, plany)
                                        return (
                                            <a key={p.klucz} href={p.href} className={`pn-poz pn-pod${p.ukryta ? ' pn-ukryta' : ''}`} title={p.nazwa} aria-current={aktywna(p.href, sciezka, szukane) ? 'page' : undefined}>
                                                <span className="pn-nazwa">{p.nazwa}</span>{n !== null && <span className="pn-n">{n}</span>}
                                            </a>
                                        )
                                    })}
                                </div>
                            )}
                        </React.Fragment>
                    )
                })}
            </nav>
            <div className="pn-bok-dol">
                <a href="/keystatic/singleton/menuPanelu" className="pn-poz"><SlidersHorizontal aria-hidden strokeWidth={1.5} /><span className="pn-nazwa">dostosuj menu</span></a>
                {ukrytych > 0 && (
                    <button type="button" className="pn-poz" aria-pressed={pokazWszystko} onClick={() => ustawPokazWszystko(!pokazWszystko)}>
                        <Ellipsis aria-hidden strokeWidth={1.5} /><span className="pn-nazwa">{pokazWszystko ? 'schowaj ukryte' : `pokaż wszystko (${ukrytych} ukryte)`}</span>
                    </button>
                )}
                <a href="/" target="_blank" rel="noreferrer" className="pn-poz"><ExternalLink aria-hidden strokeWidth={1.5} /><span className="pn-nazwa">zobacz stronę</span></a>
            </div>
        </>
    )
}

function Ikony({ menu, sciezka, szukane, czeka, przycisk }: { menu: Menu; sciezka: string; szukane: string; czeka: number; przycisk: React.ReactNode }) {
    return (
        <nav className="pn-ikony" aria-label="menu panelu (ikony)">
            {przycisk}
            <hr />
            {menu.filter((g) => !g.ukryta).map((g) => {
                const Ik = IKONY[g.ikona]
                const widoczne = g.pozycje.filter((p) => !p.ukryta)
                const href = g.href ?? (g.klucz === 'plany' ? '/keystatic/plany' : widoczne[0]?.href)
                if (!href) return null
                const akt = g.href ? aktywna(g.href, sciezka, szukane) : g.klucz === 'plany' ? sciezka.startsWith('/keystatic/plany') : widoczne.some((p) => aktywna(p.href, sciezka, szukane))
                return (
                    <a key={g.klucz} href={href} className="pn-poz" aria-label={g.licznik === 'zgloszenia' && czeka > 0 ? `${g.nazwa}, ${czeka} czeka` : g.nazwa} title={g.nazwa} aria-current={akt ? 'page' : undefined}>
                        <Ik aria-hidden strokeWidth={1.5} />
                        {g.licznik === 'zgloszenia' && czeka > 0 && <span className="pn-licz" aria-hidden="true">{czeka}</span>}
                    </a>
                )
            })}
        </nav>
    )
}

/** P6a (PNL-08): „przypnij” bieżącą pozycję panelu (pulpit → „wróć do pracy”). Nazwę ustala serwer (wpis, osoba, plan). */
function Przypnij({ sciezka }: { sciezka: string }) {
    const [przypiete, ustawPrzypiete] = React.useState<Set<string> | null>(null)
    React.useEffect(() => {
        fetch('/api/keystatic/panel/praca', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null))
            .then((p: { przypiete?: { href: string }[] } | null) => ustawPrzypiete(new Set((p?.przypiete ?? []).map((x) => x.href)))).catch(() => {})
    }, [sciezka])
    if (!przypiete || sciezka === '/keystatic/panel' || sciezka === '/keystatic') return null
    const jest = przypiete.has(sciezka)
    const przelacz = async () => {
        const r = await fetch('/api/keystatic/panel/praca', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ akcja: jest ? 'usun' : 'dodaj', lista: 'przypiete', href: sciezka }) }).catch(() => null)
        if (r?.ok) ustawPrzypiete((s) => { const n = new Set(s); if (jest) n.delete(sciezka); else n.add(sciezka); return n })
    }
    return (
        <button type="button" className="pn-btn pn-btn-maly pn-tylko-szeroki" aria-pressed={jest} onClick={przelacz} title={jest ? 'odepnij z pulpitu' : 'przypnij na pulpicie („wróć do pracy”)'}>
            {jest ? <PinOff aria-hidden /> : <Pin aria-hidden />}{jest ? 'przypięte' : 'przypnij'}
        </button>
    )
}

export default function RamaPanelu({ ustawienia, liczbyPlanow, liczbyKolekcji = {}, children }: { ustawienia: UstawieniaMenu | null; liczbyPlanow: Record<RodzajPlanu, number>; liczbyKolekcji?: Record<string, number>; children: React.ReactNode }) {
    // liczniki w menu: „plany:<rodzaj>” i (P6a) „kolekcja:<klucz>”
    const liczniki = React.useMemo(() => ({ ...Object.fromEntries(Object.entries(liczbyPlanow).map(([k, v]) => [`plany:${k}`, v])), ...Object.fromEntries(Object.entries(liczbyKolekcji).map(([k, v]) => [`kolekcja:${k}`, v])) }), [liczbyPlanow, liczbyKolekcji])
    const sciezka = usePathname() ?? ''
    const [szukane, ustawSzukane] = React.useState('')
    const rodzaj = rodzajWidoku(sciezka)
    const menu = React.useMemo(() => menuWgUstawien(ustawienia), [ustawienia])
    const { resolvedTheme, setTheme } = useTheme()
    const [zgl, ustawZgl] = React.useState<Zgl[]>([])
    const [szer, ustawSzer] = React.useState(START)
    const [schowany, ustawSchowany] = React.useState(false)
    const [szuflada, ustawSzuflade] = React.useState(false)
    const [pokazWszystko, ustawPokazWszystko] = React.useState(false)
    const [rozwiniete, ustawRozwiniete] = React.useState<Set<string>>(() => new Set())
    const poleSzukaj = React.useRef<HTMLInputElement>(null)
    const przyciskMenu = React.useRef<HTMLButtonElement>(null)
    const przyciskZwin = React.useRef<HTMLButtonElement>(null)
    const przyciskRozwin = React.useRef<HTMLButtonElement>(null)
    const szufladaRef = React.useRef<HTMLElement>(null)
    const fokusPoZmianie = React.useRef<'zwin' | 'rozwin' | null>(null)

    React.useEffect(() => { ustawSzukane(location.search) }, [sciezka])
    React.useEffect(() => {
        const v = Number(czytaj(KLUCZ_SZER)); if (Number.isFinite(v) && v >= MIN) ustawSzer(ogranicz(v))
        if (czytaj(KLUCZ_SCHOWANY) === '1') ustawSchowany(true)
    }, [])
    // grupy rozwinięte: zapamiętane + grupa z aktywną pozycją
    React.useEffect(() => {
        let zap: string[] = []
        try { zap = JSON.parse(czytaj(KLUCZ_GRUPY) ?? '[]') } catch { /* domyślne */ }
        const akt = menu.filter((g) => g.pozycje.some((p) => aktywna(p.href, sciezka, location.search) || sciezka.startsWith(p.href.split('?')[0]))).map((g) => g.klucz)
        ustawRozwiniete(new Set([...(Array.isArray(zap) ? zap : []), ...akt]))
    }, [menu, sciezka])
    const przelaczGrupe = (k: string) => ustawRozwiniete((s) => {
        const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k)
        zapisz(KLUCZ_GRUPY, JSON.stringify([...n])); return n
    })
    React.useEffect(() => {
        fetch('/api/keystatic/panel/zgloszenia', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).then((L: Zgl[]) => ustawZgl(Array.isArray(L) ? L : [])).catch(() => {})
    }, [sciezka])
    const czeka = zgl.filter((z) => z.stan === 'nowe' || z.stan === 'odlozone').length
    const zglPozycji = zgl.filter((z) => z.doPoprawy && z.doPoprawy.split('?')[0] === sciezka && (z.stan === 'nowe' || z.stan === 'odlozone')).length
    const naStronie = rodzaj === 'keystatic' ? stronaZAdresuKeystatic(sciezka) : null
    // P6a (PNL-10): historia wersji – przy edycji wpisu kolekcji albo ustawienia Keystatic
    const maHistorie = rodzaj === 'keystatic' && /^\/keystatic\/(collection\/[\w-]+\/item\/[^/]+|singleton\/[\w-]+)$/.test(sciezka)

    // zwijanie menu (komputer) – fokus na przycisk, który się pojawił
    const zwin = (b: boolean) => { fokusPoZmianie.current = b ? 'rozwin' : 'zwin'; ustawSchowany(b); zapisz(KLUCZ_SCHOWANY, b ? '1' : '0') }
    React.useEffect(() => {
        const f = fokusPoZmianie.current; fokusPoZmianie.current = null
        if (f === 'rozwin') przyciskRozwin.current?.focus(); else if (f === 'zwin') przyciskZwin.current?.focus()
    }, [schowany])
    // szuflada: fokus do środka, Esc zamyka i wraca na ≡
    React.useEffect(() => {
        if (!szuflada) return
        szufladaRef.current?.querySelector<HTMLElement>('a,button')?.focus()
        const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { ustawSzuflade(false); przyciskMenu.current?.focus() } }
        document.addEventListener('keydown', k)
        return () => document.removeEventListener('keydown', k)
    }, [szuflada])
    React.useEffect(() => { ustawSzuflade(false) }, [sciezka])
    // Ctrl+K: przejście do pola szukania (poza polami edycji – w edytorze tekstu Ctrl+K to odnośnik)
    React.useEffect(() => {
        const k = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'k') return
            const t = e.target as HTMLElement | null
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) && t !== poleSzukaj.current) return
            if (!poleSzukaj.current || !poleSzukaj.current.offsetParent) return
            e.preventDefault(); poleSzukaj.current.focus()
        }
        document.addEventListener('keydown', k)
        return () => document.removeEventListener('keydown', k)
    }, [])

    // Keystatic: „Dashboard” i adres /keystatic prowadzą do pulpitu panelu; jeden przełącznik motywu
    React.useEffect(() => {
        if (rodzaj !== 'keystatic') return
        const klik = (e: MouseEvent) => {
            const a = (e.target as Element | null)?.closest?.('a')
            const h = a?.getAttribute('href')
            if (h === '/keystatic' || h === '/keystatic/') { e.preventDefault(); e.stopPropagation(); location.assign('/keystatic/panel') }
        }
        document.addEventListener('click', klik, true)
        if (location.pathname === '/keystatic' || location.pathname === '/keystatic/') location.replace('/keystatic/panel')
        return () => document.removeEventListener('click', klik, true)
    }, [rodzaj])
    React.useEffect(() => {
        if (!resolvedTheme) return
        const t = resolvedTheme === 'dark' ? 'dark' : 'light'
        zapisz('keystatic-color-scheme', t)
        const ustaw = () => {
            document.querySelectorAll('.kui-theme').forEach((el) => {
                if (!el.classList.contains(`kui-scheme--${t}`)) { el.classList.remove('kui-scheme--light', 'kui-scheme--dark', 'kui-scheme--auto'); el.classList.add(`kui-scheme--${t}`) }
            })
            // własny przełącznik motywu Keystatic – schowany (jeden przełącznik w pasku)
            document.querySelectorAll<HTMLElement>('.pn-ks button[aria-label], .pn-ks [role=button][aria-label]').forEach((b) => {
                if (/motyw|schemat|kolor|theme|scheme|appearance/i.test(b.getAttribute('aria-label') ?? '')) b.setAttribute('data-pn-motyw-ks', '')
            })
        }
        ustaw()
        const obs = new MutationObserver(ustaw)
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true })
        return () => obs.disconnect()
    }, [resolvedTheme, rodzaj])

    const rozpocznij = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const ruch = (ev: PointerEvent) => { const n = ogranicz(ev.clientX); ustawSzer(n); zapisz(KLUCZ_SZER, String(n)) }
        const koniec = () => { window.removeEventListener('pointermove', ruch); window.removeEventListener('pointerup', koniec); window.removeEventListener('pointercancel', koniec) }
        window.addEventListener('pointermove', ruch); window.addEventListener('pointerup', koniec, { once: true }); window.addEventListener('pointercancel', koniec, { once: true })
    }
    const zmienSzer = (n: number) => { const v = ogranicz(n); ustawSzer(v); zapisz(KLUCZ_SZER, String(v)) }
    const [zamontowany, ustawZamontowany] = React.useState(false)
    React.useEffect(() => ustawZamontowany(true), [])
    const ciemny = zamontowany && resolvedTheme === 'dark'
    const wlasciwosciMenu = { menu, sciezka, szukane, czeka, plany: liczniki, pokazWszystko, ustawPokazWszystko, rozwiniete, przelaczGrupe }
    const pelneMenu = rodzaj === 'panel' && !schowany
    const kolumnaIkon = rodzaj === 'edytor-planu' || (rodzaj === 'panel' && schowany)

    return (
        <div className={`pn pn-widok-${rodzaj}`} style={{ '--pn-bok-szer': `${szer}px` } as React.CSSProperties /* styl-dynamiczny: szerokość menu ustawiana uchwytem */}>
            <a href="#panel-tresc" className="pn-pomin">przejdź do treści panelu</a>
            <header className="pn-gora">
                <button ref={przyciskMenu} type="button" className="pn-ikona-btn pn-gora-menu" aria-label="menu panelu" aria-expanded={szuflada} aria-controls="pn-szuflada" onClick={() => ustawSzuflade((s) => !s)}><Menu aria-hidden /></button>
                <a href="/keystatic/panel" className="pn-marka">odniepamieci.pl<span>panel</span></a>
                <a href="/keystatic/panel" className="pn-gora-link pn-tylko-szeroki">← pulpit</a>
                <a href="/keystatic/panel/zgloszenia" className="pn-gora-link">zgłoszenia{czeka > 0 && <span className="pn-licz" aria-label={`${czeka} czeka`}>{czeka}</span>}</a>
                <a href="/keystatic/panel/do-opracowania" className="pn-gora-link pn-tylko-szeroki">do opracowania</a>
                <Szukaj pole={poleSzukaj} />
                <div className="pn-gora-prawa">
                    {zglPozycji > 0 && <a href="/keystatic/panel/zgloszenia" className="pn-btn pn-btn-maly pn-tylko-szeroki">zgłoszenia: {zglPozycji}</a>}
                    {naStronie && <a href={naStronie} target="_blank" rel="noreferrer" className="pn-btn pn-btn-maly pn-tylko-szeroki">na stronie ↗</a>}
                    {maHistorie && <a href={`/keystatic/panel/historia?adres=${encodeURIComponent(sciezka)}`} className="pn-btn pn-btn-maly pn-tylko-szeroki">historia</a>}
                    <Przypnij sciezka={sciezka} />
                    <button type="button" className="pn-ikona-btn" aria-label="przełącz motyw (jasny / ciemny)" title="przełącz motyw (jasny / ciemny)" onClick={() => setTheme(ciemny ? 'light' : 'dark')}>
                        {!zamontowany ? <Moon aria-hidden className="pn-niewidoczne" /> : ciemny ? <Sun aria-hidden /> : <Moon aria-hidden />}
                    </button>
                </div>
            </header>
            <div className="pn-uklad">
                {pelneMenu && (
                    <aside className="pn-bok" aria-label="menu panelu">
                        <MenuPelne {...wlasciwosciMenu} naGorze={
                            <button ref={przyciskZwin} type="button" className="pn-ikona-btn pn-bok-zwin" aria-label="zwiń menu" title="zwiń menu" aria-expanded={true} onClick={() => zwin(true)}><Menu aria-hidden /></button>
                        } />
                    <div role="separator" aria-label="szerokość menu – przeciągnij albo użyj strzałek" aria-orientation="vertical" aria-valuemin={MIN} aria-valuemax={MAX} aria-valuenow={szer}
                            tabIndex={0} className="pn-bok-uchwyt" onPointerDown={rozpocznij}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowLeft') { e.preventDefault(); zmienSzer(szer - 10) }
                                else if (e.key === 'ArrowRight') { e.preventDefault(); zmienSzer(szer + 10) }
                                else if (e.key === 'Home') { e.preventDefault(); zmienSzer(MIN) }
                                else if (e.key === 'End') { e.preventDefault(); zmienSzer(MAX) }
                            }} />
                    </aside>
                )}
                {kolumnaIkon && (
                    <Ikony menu={menu} sciezka={sciezka} szukane={szukane} czeka={czeka} przycisk={
                        rodzaj === 'panel'
                            ? <button ref={przyciskRozwin} type="button" className="pn-ikona-btn" aria-label="rozwiń menu" title="rozwiń menu" aria-expanded={false} onClick={() => zwin(false)}><Menu aria-hidden /></button>
                            : <button type="button" className="pn-ikona-btn" aria-label="pełne menu" title="pełne menu" aria-expanded={szuflada} aria-controls="pn-szuflada" onClick={() => ustawSzuflade((s) => !s)}><Menu aria-hidden /></button>
                    } />
                )}
                {szuflada && <div className="pn-zaslona" onClick={() => ustawSzuflade(false)} aria-hidden="true" />}
                {szuflada && (
                    <aside id="pn-szuflada" ref={szufladaRef} className="pn-bok pn-szuflada" aria-label="menu panelu">
                        <MenuPelne {...wlasciwosciMenu} />
                    </aside>
                )}
                {rodzaj === 'keystatic'
                    ? <div id="panel-tresc" tabIndex={-1} className="pn-ks">{children}</div>
                    : <main id="panel-tresc" tabIndex={-1} className="pn-glowna">{children}</main>}
            </div>
        </div>
    )
}

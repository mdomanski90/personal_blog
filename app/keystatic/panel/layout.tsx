'use client'
// Panel administracyjny: sekcje Keystatic, regulowana szerokość, na telefonie pasek u góry.
import * as React from 'react'
import { usePathname } from 'next/navigation'
import { CSS } from './wspolne'

const KLUCZ = 'odniepamieci-panel-szerokosc-v1'
const MIN = 190, MAX = 480, START = 240
const ogranicz = (n: number) => Math.min(MAX, Math.max(MIN, n))

type Poz = { href: string; nazwa: string; zewn?: boolean; licznik?: boolean }
type Grupa = { naglowek?: string; linki: Poz[] }
const GRUPY: Grupa[] = [
    { linki: [
        { href: '/keystatic/panel', nazwa: 'pulpit' },
        { href: '/keystatic/panel/zgloszenia', nazwa: 'zgłoszenia', licznik: true },
        { href: '/keystatic/panel/do-opracowania', nazwa: 'do opracowania' },
    ] },
    { naglowek: 'treści', linki: [
        { href: '/keystatic/collection/posts', nazwa: 'wpisy', zewn: true },
        { href: '/keystatic/collection/miejsca', nazwa: 'miejsca', zewn: true },
        { href: '/keystatic/collection/obiekty', nazwa: 'obiekty w terenie', zewn: true },
        { href: '/keystatic/collection/tematy', nazwa: 'tematy', zewn: true },
        { href: '/keystatic/collection/biogramy', nazwa: 'osoby – biogramy', zewn: true },
    ] },
    { naglowek: 'archiwum', linki: [
        { href: '/keystatic/collection/materialy', nazwa: 'materiały (archiwum)', zewn: true },
        { href: '/keystatic/collection/zbiory', nazwa: 'zbiory i kolekcje', zewn: true },
        { href: '/keystatic/panel/materialy', nazwa: 'strony skanów' },
    ] },
    { naglowek: 'biblioteka', linki: [
        { href: '/keystatic/collection/publikacje', nazwa: 'publikacje i opracowania', zewn: true },
    ] },
    { naglowek: 'księgi metrykalne', linki: [
        { href: '/keystatic/collection/parafie', nazwa: 'parafie i urzędy', zewn: true },
        { href: '/keystatic/collection/ksiegi', nazwa: 'księgi metrykalne', zewn: true },
        { href: '/keystatic/panel/ksiegi-import', nazwa: 'import ksiąg · CSV/XLSX' },
    ] },
    { naglowek: 'słownik', linki: [
        { href: '/keystatic/collection/hasla', nazwa: 'słownik (pojęcia i gwara)', zewn: true },
    ] },
    { naglowek: 'strony', linki: [
        { href: '/keystatic/singleton/stronaGlowna', nazwa: 'strona główna', zewn: true },
        { href: '/keystatic/singleton/wstepyDzialow', nazwa: 'wstępy działów', zewn: true },
        { href: '/keystatic/singleton/oProjekcie', nazwa: 'o projekcie', zewn: true },
    ] },
    { naglowek: 'narzędzia', linki: [
        { href: '/keystatic/plany', nazwa: 'plany cmentarzy', zewn: true },
        { href: '/keystatic/osoby', nazwa: 'osoby i drzewo', zewn: true },
        { href: '/keystatic/panel/dostep', nazwa: 'dostęp' },
        { href: '/keystatic/panel/wyglad', nazwa: 'wygląd strony' },
        { href: '/keystatic/panel/system', nazwa: 'kopie, eksport, ustawienia' },
    ] },
]

// Wspólne style panelu zachowujemy bez zmian: nadpisujemy tylko geometrię paska.
const CSS_BOK = `
.pn{--pn-bok-szer:240px;flex-wrap:nowrap}
.pn-bok{position:relative;flex:0 0 var(--pn-bok-szer);width:var(--pn-bok-szer);max-width:var(--pn-bok-szer);min-width:0;max-height:100dvh;overflow-y:auto;overflow-x:hidden;position:sticky;top:0;scrollbar-gutter:stable}
.pn-glowna{flex:1 1 0;width:0;max-width:none;min-width:0}
.pn-bok-grupa{display:flex;flex-direction:column;gap:2px;margin-top:8px}
.pn-bok-grupa .pn-etyk{margin:8px 10px 3px}
.pn-bok-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.pn-bok-tog{border:1px solid var(--linia);border-radius:6px;background:var(--karta);color:var(--tekst);cursor:pointer;min-width:32px;height:30px}
.pn-bok-tog:hover{background:var(--hover)}
.pn-bok-uchwyt{position:absolute;z-index:20;right:0;top:0;bottom:0;width:15px;cursor:col-resize;touch-action:none;user-select:none;background:color-mix(in srgb,var(--akcent) 10%,transparent);border-right:2px solid var(--linia)}
.pn-bok-uchwyt::after{content:"⋮";position:absolute;left:1px;top:50%;transform:translateY(-50%);font-weight:700;font-size:22px;line-height:1;color:var(--akcent);background:var(--karta);padding:7px 1px;border:1px solid var(--linia);border-radius:5px}
.pn-bok-uchwyt:hover,.pn-bok-uchwyt:focus-visible{background:var(--wyb);outline:0;box-shadow:inset -2px 0 0 var(--akcent)}
.pn-bok-uchwyt:focus-visible{outline:2px solid var(--akcent);outline-offset:-2px}
.pn-pokaz-menu{align-self:flex-start;margin:0 0 4px}
.pn-bok .pn-nav a{min-width:0}
.pn-bok .pn-nav a .pn-nazwa{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:820px){
 .pn{flex-wrap:wrap}
 .pn-bok{position:relative;top:auto;flex:1 1 100%;width:100%;max-width:100%;height:auto;max-height:none;overflow:visible;padding:10px 12px}
 .pn-bok-grupy{display:flex;gap:12px;overflow-x:auto;padding-bottom:3px}
 .pn-bok-grupa{flex:0 0 auto;min-width:max-content;margin:0;gap:0}
 .pn-bok-grupa .pn-etyk{margin:0 8px 3px}
 .pn-bok-grupa .pn-nav{flex-direction:row}
 .pn-bok-uchwyt,.pn-bok-tog,.pn-pokaz-menu{display:none!important}
 .pn-glowna{flex:1 1 100%;width:100%}
 .pn-bok-podpis{display:none!important}
}
`

export default function UkladPanelu({ children }: { children: React.ReactNode }) {
    const sciezka = usePathname()
    const [czeka, ustawCzeka] = React.useState(0)
    const [szer, ustawSzer] = React.useState(START)
    const [schowany, ustawSchowany] = React.useState(false)
    const [mobilny, ustawMobilny] = React.useState(false)
    const bok = React.useRef<HTMLElement>(null)

    React.useEffect(() => {
        try {
            const v = Number(localStorage.getItem(KLUCZ))
            if (Number.isFinite(v) && v >= MIN) ustawSzer(ogranicz(v))
        } catch { /* np. zablokowany localStorage */ }
    }, [])
    React.useEffect(() => {
        const mq = window.matchMedia('(max-width:820px)')
        const aktualizuj = () => ustawMobilny(mq.matches)
        aktualizuj()
        mq.addEventListener('change', aktualizuj)
        return () => mq.removeEventListener('change', aktualizuj)
    }, [])
    React.useEffect(() => {
        fetch('/api/keystatic/panel/zgloszenia', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : []))
            .then((L: { stan: string }[]) => ustawCzeka(L.filter((z) => z.stan === 'nowe' || z.stan === 'odlozone').length))
            .catch(() => {})
    }, [sciezka])
    const zapiszSzer = (n: number) => {
        const nowa = ogranicz(n)
        ustawSzer(nowa)
        try { localStorage.setItem(KLUCZ, String(nowa)) } catch { /* bez pamięci */ }
    }
    const rozpocznij = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0 || !bok.current) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const lewa = bok.current.getBoundingClientRect().left
        const ruch = (ev: PointerEvent) => zapiszSzer(ev.clientX - lewa)
        const koniec = () => {
            window.removeEventListener('pointermove', ruch)
            window.removeEventListener('pointerup', koniec)
            window.removeEventListener('pointercancel', koniec)
        }
        window.addEventListener('pointermove', ruch)
        window.addEventListener('pointerup', koniec, { once: true })
        window.addEventListener('pointercancel', koniec, { once: true })
    }
    const aktywny = (m: Poz) => sciezka === m.href || (!m.zewn && m.href !== '/keystatic/panel' && sciezka?.startsWith(m.href + '/'))
    return (
        <div className="pn" style={{ '--pn-bok-szer': schowany && !mobilny ? '0px' : `${szer}px` } as React.CSSProperties}>
            <style>{CSS}</style>
            <style>{CSS_BOK}</style>
            <aside className="pn-bok" ref={bok} style={schowany && !mobilny ? { padding: 0, border: 0 } : undefined} aria-hidden={schowany && !mobilny ? true : undefined}>
                {(!schowany || mobilny) && <>
                    <div className="pn-bok-head">
                        <div className="pn-bok-podpis" style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
                            <b style={{ fontSize: 15 }}>odniepamieci.pl</b>
                            <span className="pn-maly">panel administracyjny</span>
                        </div>
                        <button type="button" className="pn-bok-tog" onClick={() => ustawSchowany(true)} title="schowaj menu" aria-label="schowaj menu">◀</button>
                    </div>
                    <nav className="pn-bok-grupy" aria-label="panel administracyjny">
                        {GRUPY.map((g, i) => (
                            <div className="pn-bok-grupa" key={g.naglowek ?? i}>
                                {g.naglowek && <div className="pn-etyk">{g.naglowek}</div>}
                                <div className="pn-nav">
                                    {g.linki.map((m) => (
                                        <a key={m.href} href={m.href} aria-current={aktywny(m) ? 'page' : undefined} title={m.nazwa}>
                                            <span className="pn-nazwa">{m.nazwa}</span>
                                            {m.licznik && czeka > 0 && <span className="pn-licznik" aria-label={`${czeka} czeka`}>{czeka}</span>}
                                            {m.zewn && <span aria-hidden="true" className="pn-szary">→</span>}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                    <div className="pn-nav pn-bok-dol" style={{ marginTop: 'auto' }}>
                        <a href="/" target="_blank" rel="noreferrer">zobacz stronę <span aria-hidden="true">↗</span></a>
                    </div>
                    <div role="separator" aria-label="Chwyć i przeciągnij, aby zmienić szerokość menu (lub użyj strzałek)" title="Przeciągnij, by zmienić szerokość menu" aria-orientation="vertical" aria-valuemin={MIN} aria-valuemax={MAX} aria-valuenow={szer}
                        tabIndex={0} className="pn-bok-uchwyt" onPointerDown={rozpocznij}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowLeft') { e.preventDefault(); zapiszSzer(szer - 10) }
                            else if (e.key === 'ArrowRight') { e.preventDefault(); zapiszSzer(szer + 10) }
                            else if (e.key === 'Home') { e.preventDefault(); zapiszSzer(MIN) }
                            else if (e.key === 'End') { e.preventDefault(); zapiszSzer(MAX) }
                        }} />
                </>}
            </aside>
            <main className="pn-glowna">
                {schowany && !mobilny && <button type="button" className="pn-btn pn-pokaz-menu" onClick={() => ustawSchowany(false)}>☰ pokaż menu</button>}
                {children}
            </main>
        </div>
    )
}

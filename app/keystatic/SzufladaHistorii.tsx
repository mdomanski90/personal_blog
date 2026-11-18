'use client'
// P6a wg plansz (PDF 18.11, funkcja 4): szuflada „historia” z prawej w edycji wpisu Keystatic – edycja zostaje obok.
// Wpisy: zapisy Keystatic i operacje (zmiana zbiorcza, import, przywrócenie), zmiana pole po polu z różnicą słów,
// „porównaj” (wszystkie pola) i „przywróć poprzednią” (stan sprzed zmiany – nowa operacja do cofnięcia); na dole kosz tego rodzaju.
// Esc i × zamykają, fokus wraca na przycisk „historia” (zasada 5.3). Kolory różnic – tokeny --pn-us / --pn-do (stonowane).
import * as React from 'react'
import { X } from 'lucide-react'

type Fragment = { t: '=' | '-' | '+'; s: string }
type ZmianaPola = { pole: string; etykieta: string; fragmenty: Fragment[] }
type Wpis = { klucz: string; zrodlo: 'keystatic' | 'operacja'; czas: string; opis: string; zmiany: ZmianaPola[] | null; mozna: boolean; wersja?: string; operacja?: string }
type Kosz = { id: string; czas: string; opis: string }
type Historia = { plik: string; nazwa: string; istnieje: boolean; wpisy: Wpis[]; kosz: Kosz[] }

const godzina = (iso: string) => new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
function kiedy(iso: string): string {
    const d = new Date(iso), dzis = new Date(), wczoraj = new Date(Date.now() - 864e5)
    if (d.toDateString() === dzis.toDateString()) return `dziś ${godzina(iso)}`
    if (d.toDateString() === wczoraj.toDateString()) return `wczoraj ${godzina(iso)}`
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}
function temu(iso: string): string {
    const dni = Math.floor((Date.now() - Date.parse(iso)) / 864e5)
    return dni < 1 ? 'dziś' : dni === 1 ? 'wczoraj' : `${dni} dni temu`
}

function Pole({ z }: { z: ZmianaPola }) {
    return (
        <p className="pn-hist-pole"><span className="pn-szary">{z.etykieta}: </span>
            {z.fragmenty.map((f, i) => f.t === '-' ? <del key={i} className="pn-us">{f.s}</del> : f.t === '+' ? <ins key={i} className="pn-do">{f.s}</ins> : <span key={i}>{f.s}</span>)}
        </p>
    )
}

export default function SzufladaHistorii({ adres, otwarta, onZamknij }: { adres: string; otwarta: boolean; onZamknij: () => void }) {
    const ref = React.useRef<HTMLDivElement>(null)
    const tytul = React.useRef<HTMLHeadingElement>(null)
    const powrot = React.useRef<HTMLElement | null>(null)
    const [d, ustawD] = React.useState<Historia | null>(null)
    const [blad, ustawBlad] = React.useState('')
    const [rozwiniete, ustawRozwiniete] = React.useState<string | null>(null)
    const [pyta, ustawPyta] = React.useState<string | null>(null)
    const [kom, ustawKom] = React.useState('')

    const wczytaj = React.useCallback(() => {
        ustawBlad('')
        fetch(`/api/keystatic/panel/historia?adres=${encodeURIComponent(adres)}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(j.blad ?? `Błąd ${r.status}`))))
            .then(ustawD).catch((e) => ustawBlad(String(e)))
    }, [adres])
    React.useEffect(() => {
        if (!otwarta) return
        powrot.current = document.activeElement as HTMLElement | null
        ustawD(null); ustawPyta(null); ustawKom(''); wczytaj()
        window.setTimeout(() => tytul.current?.focus(), 0)
        const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); zamknij() } }
        document.addEventListener('keydown', k)
        return () => document.removeEventListener('keydown', k)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otwarta, wczytaj])
    const zamknij = () => { onZamknij(); const p = powrot.current; if (p && document.contains(p)) window.setTimeout(() => p.focus(), 0) }

    const przywroc = async (w: Wpis) => {
        ustawBlad('')
        const r = await fetch('/api/keystatic/panel/historia', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plik: d?.plik, ...(w.wersja ? { wersja: w.wersja } : { operacja: w.operacja }) }) }).catch(() => null)
        const j = r ? await r.json().catch(() => ({})) : { blad: 'Brak połączenia z serwerem.' }
        if (!r?.ok) { ustawBlad(j.blad ?? 'Nie udało się przywrócić.'); ustawPyta(null); return }
        ustawKom('Przywrócono – wczytuję edycję od nowa…')
        window.setTimeout(() => window.location.reload(), 600) // Keystatic trzyma treść w pamięci – po przywróceniu wczytujemy ją od nowa
    }
    const przywrocZKosza = async (k: Kosz) => {
        const r = await fetch('/api/keystatic/panel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ akcja: 'przywroc', rodzaj: 'tresc', plik: k.id }) }).catch(() => null)
        const j = r ? await r.json().catch(() => ({})) : { blad: 'Brak połączenia z serwerem.' }
        if (!r?.ok) { ustawBlad(j.blad ?? 'Nie udało się przywrócić.'); return }
        ustawKom(`Przywrócono z kosza: ${k.opis}.`); wczytaj()
    }

    if (!otwarta) return null
    return (
        <div ref={ref} className="pn-szuflada-hist" role="dialog" aria-modal="false" aria-labelledby="pn-hist-tytul">
            <div className="pn-naglowek">
                <h2 id="pn-hist-tytul" ref={tytul} tabIndex={-1}>historia{d ? `: ${d.nazwa.replace(/^[^„]*„|”$/g, '')}` : ''}</h2>
                <button type="button" className="pn-ikona-btn" aria-label="zamknij historię" onClick={zamknij}><X aria-hidden /></button>
            </div>
            <p className="pn-maly pn-bez-marginesu">Każdy zapis z Keystatic i z panelu zostawia poprzednią wersję (30 dni, potem co tydzień). Przywrócenie to nowy zapis – nic nie ginie.</p>
            {blad && <p className="pn-kom pn-bez-marginesu" role="alert">{blad}</p>}
            {kom && <p className="pn-info pn-bez-marginesu" role="status">{kom}</p>}
            {!d && !blad && <p className="pn-szary pn-bez-marginesu" role="status">wczytuję…</p>}
            {d && !d.wpisy.length && <p className="pn-szary pn-bez-marginesu">Brak wcześniejszych wersji – historia zaczyna się od pierwszego zapisu po wdrożeniu P6a.</p>}
            {d && d.wpisy.length > 0 && (
                <ol className="pn-hist-lista">
                    {d.wpisy.map((w, i) => {
                        const pola = w.zmiany ?? []
                        const caly = rozwiniete === w.klucz
                        return (
                            <li key={w.klucz} className={`pn-hist-wpis${i === 0 ? ' pn-hist-zazn' : ''}`}>
                                <b>{kiedy(w.czas)} · {w.opis}</b>
                                {w.zmiany === null && <span className="pn-maly">nie da się porównać (plik nieczytelny)</span>}
                                {w.zmiany && pola.length === 0 && <span className="pn-maly">bez zmian w polach</span>}
                                {(caly ? pola : pola.slice(0, 2)).map((z) => <Pole key={z.pole} z={z} />)}
                                {!caly && pola.length > 2 && <span className="pn-maly">i {pola.length - 2} {pola.length - 2 === 1 ? 'inne pole' : 'inne pola'}</span>}
                                {pyta === w.klucz ? (
                                    <div className="pn-rzad">
                                        <span className="pn-maly">Przywrócić stan sprzed tej zmiany?</span>
                                        <button type="button" className="pn-btn pn-btn-gl pn-btn-maly" onClick={() => przywroc(w)}>tak, przywróć</button>
                                        <button type="button" className="pn-btn pn-btn-maly" onClick={() => ustawPyta(null)}>anuluj</button>
                                    </div>
                                ) : (
                                    <div className="pn-rzad">
                                        {pola.length > 0 && <button type="button" className="pn-btn pn-btn-maly" aria-expanded={caly} onClick={() => ustawRozwiniete(caly ? null : w.klucz)}>{caly ? 'zwiń' : 'porównaj'}</button>}
                                        {w.mozna && <button type="button" className="pn-btn pn-btn-gl pn-btn-maly" onClick={() => ustawPyta(w.klucz)}>przywróć poprzednią</button>}
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ol>
            )}
            {d && (
                <section className="pn-hist-kosz" aria-labelledby="pn-hist-kosz">
                    <h3 id="pn-hist-kosz">kosz treści</h3>
                    {d.kosz.length ? (
                        <p className="pn-maly pn-bez-marginesu">Usunięte w Keystatic: {d.kosz.slice(0, 6).map((k, i) => (
                            <React.Fragment key={k.id}>{i > 0 && ' · '}{k.opis} ({temu(k.czas)}) – <button type="button" className="pn-link-btn" onClick={() => przywrocZKosza(k)}>przywróć</button></React.Fragment>
                        ))}{d.kosz.length > 6 && <> · <a href="/keystatic/panel/system#kosz">cały kosz</a></>}</p>
                    ) : <p className="pn-maly pn-bez-marginesu">pusty – usunięte wpisy tego rodzaju trafią tutaj</p>}
                </section>
            )}
        </div>
    )
}

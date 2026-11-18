'use client'
// P5 (PNL-09): lista panelu z filtrami i zmianami zbiorczymi – zamiast listy Keystatic (stawia identyfikator pierwszy i nie ma
// zaznaczania). Zaznaczanie wierszy, pasek akcji, okno podglądu skutku (ile pozycji się zmieni i co z tego wynika na stronie),
// „cofnij” po zapisie (operacja z kopią – lib/panel/operacje.ts). Edycja i tworzenie pozycji – dalej w Keystatic.
import * as React from 'react'
import { useParams } from 'next/navigation'
import { odmiana, useDane } from '../../wspolne'
import { Okno } from '../../okno'
import type { DaneListy, PodgladZmiany } from '@/lib/panel/listy'
import type { AkcjaZbiorcza } from '@/lib/panel/listy-konfig'

const API = '/api/keystatic/panel/lista'
const norm = (s: string) => s.toLocaleLowerCase('pl-PL').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')

async function post<T>(url: string, body: unknown): Promise<{ ok: boolean; dane: T & { blad?: string } }> {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
    if (!r) return { ok: false, dane: { blad: 'Brak połączenia z serwerem.' } as T & { blad?: string } }
    return { ok: r.ok, dane: await r.json().catch(() => ({ blad: `Błąd serwera ${r.status}` })) }
}

export default function ListaPanelu() {
    // useParams bywa typowane jako „| null” (zależnie od środowiska budowy – na VPS tsc to wymaga); jak w panel/materialy/[id]
    const kolekcja = useParams<{ kolekcja: string }>()?.kolekcja ?? ''
    const { dane: d, blad, odswiez } = useDane<DaneListy>(`${API}?kolekcja=${encodeURIComponent(kolekcja)}`)
    const [q, ustawQ] = React.useState('')
    const [filtry, ustawFiltry] = React.useState<Record<string, string>>({})
    const [sort, ustawSort] = React.useState<{ pole: string; rosnaco: boolean }>({ pole: 'title', rosnaco: true })
    const [zazn, ustawZazn] = React.useState<Set<string>>(new Set())
    const [akcja, ustawAkcje] = React.useState('')
    const [cel, ustawCel] = React.useState('')
    const [podglad, ustawPodglad] = React.useState<PodgladZmiany | null>(null)
    const [trwa, ustawTrwa] = React.useState(false)
    const [kom, ustawKom] = React.useState<{ tekst: string; operacja?: string | null; blad?: boolean } | null>(null)
    const wszystkie = React.useRef<HTMLInputElement>(null)

    // P6a (PNL-08): filtry w adresie (?q=…&f.<pole>=…) – widok da się zapisać na pulpicie („wróć do pracy”) i otworzyć ponownie
    React.useEffect(() => {
        const u = new URLSearchParams(window.location.search)
        const f: Record<string, string> = {}
        for (const [k, v] of u) if (k.startsWith('f.') && v) f[k.slice(2)] = v
        ustawZazn(new Set()); ustawFiltry(f); ustawQ(u.get('q') ?? ''); ustawKom(null)
    }, [kolekcja])
    React.useEffect(() => {
        const u = new URLSearchParams()
        if (q.trim()) u.set('q', q.trim())
        for (const [k, v] of Object.entries(filtry)) if (v) u.set(`f.${k}`, v)
        const t = u.toString(), adres = `${window.location.pathname}${t ? `?${t}` : ''}`
        if (adres !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, '', adres)
    }, [q, filtry])
    const [zapisanyWidok, ustawZapisanyWidok] = React.useState('')
    const zapiszWidok = async () => {
        if (!d) return
        const opisy = Object.entries(filtry).filter(([, v]) => v).map(([pole, v]) => {
            const k = d.kolumny.find((x) => x.pole === pole)
            if (v === '__nieczytelne') return 'nieczytelne'
            if (v === '__brak') return `${k?.etykieta ?? pole}: brak`
            const etykieta = k?.rodzaj === 'wybor' ? d.opcje[pole]?.find((o) => o.value === v)?.label : (d.cele[k?.kolekcja ?? ''] ?? []).find((c) => c.slug === v)?.nazwa
            return etykieta ?? v
        })
        const nazwa = [d.nazwa, ...opisy, ...(q.trim() ? [`„${q.trim()}”`] : [])].join(' · ')
        const r = await post<{ ok?: boolean }>('/api/keystatic/panel/praca', { akcja: 'dodaj', lista: 'widoki', href: `${window.location.pathname}${window.location.search}`, nazwa })
        ustawZapisanyWidok(r.ok ? `Zapisano widok „${nazwa}” – jest na pulpicie w „wróć do pracy”.` : String(r.dane.blad ?? 'Nie udało się zapisać widoku.'))
    }

    const filtrowalne = (d?.kolumny ?? []).filter((k) => k.rodzaj === 'wybor' || k.rodzaj === 'relacja')
    const wiersze = React.useMemo(() => {
        if (!d) return []
        const t = norm(q.trim())
        const L = d.wiersze.filter((w) => {
            if (t && !norm(`${w.slug} ${d.kolumny.map((k) => w.komorki[k.pole]?.tekst ?? '').join(' ')}`).includes(t)) return false
            for (const [pole, v] of Object.entries(filtry)) {
                if (!v) continue
                if (v === '__nieczytelne') { if (!w.nieczytelny) return false; continue }
                const wart = w.komorki[pole]?.wartosc ?? []
                if (v === '__brak' ? wart.length > 0 : !wart.includes(v)) return false
            }
            return true
        })
        const kl = (w: (typeof L)[number]) => norm(w.komorki[sort.pole]?.tekst ?? '')
        return [...L].sort((a, b) => (sort.rosnaco ? 1 : -1) * kl(a).localeCompare(kl(b), 'pl', { numeric: true }))
    }, [d, q, filtry, sort])

    const widoczneZazn = wiersze.filter((w) => zazn.has(w.slug)).length
    React.useEffect(() => { if (wszystkie.current) wszystkie.current.indeterminate = widoczneZazn > 0 && widoczneZazn < wiersze.length }, [widoczneZazn, wiersze.length])
    const przelacz = (s: string) => ustawZazn((z) => { const n = new Set(z); if (n.has(s)) n.delete(s); else n.add(s); return n })
    const przelaczWszystkie = () => ustawZazn((z) => {
        const n = new Set(z)
        if (widoczneZazn === wiersze.length) wiersze.forEach((w) => n.delete(w.slug)); else wiersze.forEach((w) => { if (!w.nieczytelny) n.add(w.slug) })
        return n
    })

    const relacja = d?.relacje.find((r) => akcja === `dodaj:${r.pole}` || akcja === `usun:${r.pole}`)
    const zmiana = (): AkcjaZbiorcza | null => {
        if (akcja.startsWith('wid:')) return { rodzaj: 'widocznosc', wartosc: akcja.slice(4) as 'publiczne' | 'bliscy' | 'ja' }
        if (relacja && cel) return { rodzaj: akcja.startsWith('dodaj:') ? 'dodaj-relacje' : 'usun-relacje', pole: relacja.pole, wartosc: cel }
        return null
    }
    const pokazPodglad = async () => {
        const z = zmiana(); if (!z || trwa) return
        ustawTrwa(true)
        const r = await post<PodgladZmiany>(API, { akcja: 'podglad', kolekcja, slugi: [...zazn], zmiana: z })
        ustawTrwa(false)
        if (r.ok) ustawPodglad(r.dane); else ustawKom({ tekst: r.dane.blad ?? 'Nie udało się przygotować podglądu.', blad: true })
    }
    const zamknij = React.useCallback(() => ustawPodglad(null), [])
    const zapisz = async () => {
        const z = zmiana(); if (!z) return
        ustawTrwa(true)
        const r = await post<{ id: string | null; zapisane: number }>(API, { akcja: 'zapisz', kolekcja, slugi: [...zazn], zmiana: z })
        ustawTrwa(false); ustawPodglad(null)
        if (r.ok) { ustawKom({ tekst: `Zapisano: ${odmiana(r.dane.zapisane, ['pozycja', 'pozycje', 'pozycji'])}.`, operacja: r.dane.id }); ustawZazn(new Set()); ustawAkcje(''); ustawCel('') }
        else ustawKom({ tekst: r.dane.blad ?? 'Nie udało się zapisać.', blad: true })
        odswiez()
    }
    const cofnij = async (id: string) => {
        ustawTrwa(true)
        const r = await post<{ zapisane: number }>('/api/keystatic/panel/operacje', { akcja: 'cofnij', id })
        ustawTrwa(false)
        ustawKom(r.ok ? { tekst: `Cofnięto: ${odmiana(r.dane.zapisane, ['pozycja', 'pozycje', 'pozycji'])} wróciło do poprzedniego stanu.` } : { tekst: r.dane.blad ?? 'Nie udało się cofnąć.', blad: true })
        odswiez()
    }
    const sortuj = (pole: string) => ustawSort((s) => ({ pole, rosnaco: s.pole === pole ? !s.rosnaco : true }))
    const nieczytelnych = d?.wiersze.filter((w) => w.nieczytelny).length ?? 0
    const ks = (s: string) => `/keystatic/collection/${kolekcja}/item/${encodeURIComponent(s)}`

    return (
        <>
            <header className="pn-naglowek">
                <div className="pn-kol pn-kol-wasko">
                    <h1>{d?.nazwa ?? kolekcja} {d && <span className="pn-szary">· {d.wiersze.length}</span>}</h1>
                    <span className="pn-maly">Zaznacz pozycje, żeby zmienić je razem – przed zapisem zobaczysz skutek, po zapisie możesz cofnąć. Pozycję edytujesz w Keystatic (kliknij nazwę).</span>
                </div>
                <span className="pn-rzad">
                    <a className="pn-btn" href={`/keystatic/collection/${kolekcja}`}>lista w Keystatic</a>
                    <a className="pn-btn pn-btn-gl" href={`/keystatic/collection/${kolekcja}/create`}>+ nowa pozycja</a>
                </span>
            </header>
            {blad && <p className="pn-kom pn-bez-marginesu">{blad}</p>}
            {zapisanyWidok && <p className="pn-info pn-bez-marginesu" role="status">{zapisanyWidok}</p>}
            {kom && <div className={kom.blad ? 'pn-ostrz' : 'pn-info'} role={kom.blad ? 'alert' : 'status'}>
                <span className="pn-rzad pn-rosnie"><span className="pn-rosnie">{kom.tekst}</span>{kom.operacja && <button type="button" className="pn-btn pn-btn-maly" disabled={trwa} onClick={() => cofnij(kom.operacja!)}>cofnij</button>}</span>
            </div>}
            {d && <div className="pn-rzad">
                <input className="pn-in pn-in-szukaj pn-rosnie pn-waskie-500" type="search" placeholder="szukaj w nazwie, identyfikatorze, kolumnach…" aria-label="szukaj na liście" value={q} onChange={(e) => ustawQ(e.target.value)} />
                {filtrowalne.map((k) => {
                    const opcje = k.rodzaj === 'wybor' ? d.opcje[k.pole] ?? [] : (d.cele[k.kolekcja!] ?? []).filter((c) => d.wiersze.some((w) => w.komorki[k.pole]?.wartosc.includes(c.slug))).map((c) => ({ value: c.slug, label: c.nazwa }))
                    return <select key={k.pole} className="pn-in" aria-label={`filtr: ${k.etykieta}`} value={filtry[k.pole] ?? ''} onChange={(e) => ustawFiltry((f) => ({ ...f, [k.pole]: e.target.value }))}>
                        <option value="">{k.etykieta}: wszystkie</option>
                        {opcje.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        <option value="__brak">{k.etykieta}: brak</option>
                    </select>
                })}
                {nieczytelnych > 0 && <label className="pn-rzad"><input type="checkbox" checked={filtry.title === '__nieczytelne'} onChange={(e) => ustawFiltry((f) => ({ ...f, title: e.target.checked ? '__nieczytelne' : '' }))} /> tylko nieczytelne ({nieczytelnych})</label>}
                {(q || Object.values(filtry).some(Boolean)) && <button type="button" className="pn-btn pn-btn-maly" onClick={() => { ustawQ(''); ustawFiltry({}) }}>wyczyść filtry</button>}
                {(q || Object.values(filtry).some(Boolean)) && <button type="button" className="pn-btn pn-btn-maly" onClick={zapiszWidok}>zapisz widok</button>}
            </div>}
            {zazn.size > 0 && d && (d.widocznosc || d.relacje.length > 0) && (
                <div className="pn-pasek-akcji" role="region" aria-label="zmiana zbiorcza">
                    <b>zaznaczono {zazn.size}</b>
                    <select className="pn-in" aria-label="zmiana" value={akcja} onChange={(e) => { ustawAkcje(e.target.value); ustawCel('') }}>
                        <option value="">wybierz zmianę…</option>
                        {d.widocznosc && <optgroup label="widoczność">
                            <option value="wid:publiczne">ustaw: publiczne</option>
                            <option value="wid:bliscy">ustaw: dla bliskich</option>
                            <option value="wid:ja">ustaw: tylko ja</option>
                        </optgroup>}
                        {d.relacje.map((r) => <optgroup key={r.pole} label={r.etykieta}>
                            <option value={`dodaj:${r.pole}`}>dopisz do: {r.etykieta}…</option>
                            <option value={`usun:${r.pole}`}>usuń z: {r.etykieta}…</option>
                        </optgroup>)}
                    </select>
                    {relacja && <select className="pn-in pn-waskie-500" aria-label={relacja.etykieta} value={cel} onChange={(e) => ustawCel(e.target.value)}>
                        <option value="">{relacja.etykieta}: wybierz…</option>
                        {(d.cele[relacja.kolekcja] ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.nazwa}</option>)}
                    </select>}
                    {/* bez disabled w trakcie wczytywania – przycisk zachowuje fokus, okno zwraca go po zamknięciu (zasada 5.3) */}
                    <button type="button" className="pn-btn pn-btn-gl" disabled={!zmiana()} aria-busy={trwa} onClick={pokazPodglad}>podgląd zmiany…</button>
                    <button type="button" className="pn-btn" onClick={() => ustawZazn(new Set())}>odznacz</button>
                </div>
            )}
            <section className="pn-karta" aria-label={`lista: ${d?.nazwa ?? kolekcja}`}>
                {!d && !blad && <span className="pn-szary">wczytuję…</span>}
                {d && d.wiersze.length === 0 && <span className="pn-szary">Jeszcze nic tu nie ma. Dodaj pierwszą pozycję przyciskiem „+ nowa pozycja”.</span>}
                {d && d.wiersze.length > 0 && <>
                    <span className="pn-maly" role="status">{wiersze.length === d.wiersze.length ? `${d.wiersze.length} pozycji` : `${wiersze.length} z ${d.wiersze.length} pozycji`}</span>
                    <div className="pn-tabela-ramka">
                        <table className="pn-tabela">
                            <thead><tr>
                                <th scope="col" className="pn-kol-zazn"><input ref={wszystkie} type="checkbox" aria-label="zaznacz wszystkie widoczne" checked={wiersze.length > 0 && widoczneZazn === wiersze.length} onChange={przelaczWszystkie} /></th>
                                {d.kolumny.map((k) => <th key={k.pole} scope="col" aria-sort={sort.pole === k.pole ? (sort.rosnaco ? 'ascending' : 'descending') : undefined}>
                                    <button type="button" onClick={() => sortuj(k.pole)}>{k.etykieta}{sort.pole === k.pole ? (sort.rosnaco ? ' ↑' : ' ↓') : ''}</button>
                                </th>)}
                            </tr></thead>
                            <tbody>{wiersze.map((w) => (
                                <tr key={w.slug} aria-selected={zazn.has(w.slug)}>
                                    <td className="pn-kol-zazn"><input type="checkbox" checked={zazn.has(w.slug)} disabled={!!w.nieczytelny} onChange={() => przelacz(w.slug)} aria-label={`zaznacz: ${w.komorki.title?.tekst || w.slug}`} /></td>
                                    {d.kolumny.map((k) => <td key={k.pole} className={k.rodzaj === 'slug' ? 'pn-slug' : undefined}>
                                        {k.rodzaj === 'tytul'
                                            ? <><a href={ks(w.slug)}>{w.komorki.title?.tekst || w.slug}</a>{w.nieczytelny && <> <span className="pn-tag" title={w.nieczytelny}>nieczytelny</span></>}</>
                                            : (w.komorki[k.pole]?.tekst || <span className="pn-szary">—</span>)}
                                    </td>)}
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                    {nieczytelnych > 0 && <span className="pn-maly">Pozycje oznaczone „nieczytelny” strona pomija (zły identyfikator albo wartość spoza listy) – popraw je w Keystatic; zmiany zbiorcze ich nie dotyczą.</span>}
                </>}
            </section>
            <Okno otwarte={!!podglad} tytul="podgląd zmiany" onZamknij={zamknij} stopka={podglad && <>
                <button type="button" className="pn-btn" onClick={zamknij}>anuluj</button>
                <button type="button" className="pn-btn pn-btn-gl" disabled={trwa || podglad.zmienione === 0} onClick={zapisz}>{trwa ? 'zapisuję…' : `zapisz zmianę (${podglad.zmienione})`}</button>
            </>}>
                {podglad && <div className="pn-kol">
                    <b>{podglad.opis}</b>
                    <span>Zmieni się: <b>{odmiana(podglad.zmienione, ['pozycja', 'pozycje', 'pozycji'])}</b> z {podglad.zaznaczone} zaznaczonych.</span>
                    {podglad.skutek.length > 0 && <ul>{podglad.skutek.map((s, i) => <li key={i}>{s}</li>)}</ul>}
                    {podglad.przyklady.length > 0 && <div className="pn-tabela-ramka">
                        <table className="pn-tabela">
                            <thead><tr><th scope="col">pozycja</th><th scope="col">było</th><th scope="col">będzie</th></tr></thead>
                            <tbody>{podglad.przyklady.map((p) => <tr key={p.slug}><td>{p.nazwa}</td><td><span className="pn-us">{p.przed}</span></td><td><span className="pn-do">{p.po}</span></td></tr>)}</tbody>
                        </table>
                    </div>}
                    {podglad.zmienione > podglad.przyklady.length && <span className="pn-maly">…i {podglad.zmienione - podglad.przyklady.length} więcej.</span>}
                    <span className="pn-maly">Zapis to jedna operacja z kopią – po zapisie przycisk „cofnij” przywróci poprzedni stan (także później, w ostatnich operacjach).</span>
                </div>}
            </Okno>
        </>
    )
}

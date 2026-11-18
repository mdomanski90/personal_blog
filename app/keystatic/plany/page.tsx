'use client'
// Panel planów: lista (PK: filtr po rodzaju – ?rodzaj=), nowy plan, import pliku planu; zgłoszenia czytelników – w panelu (/keystatic/panel/zgloszenia).
import * as React from 'react'
import { RODZAJE_PLANU, type RodzajPlanu } from '@/lib/plany/metadane'

type Wiersz = { slug: string; tytul: string; rodzaj: RodzajPlanu; widocznosc: string; miejsce?: string; obiekt?: string; elementow: number; zmieniono: string }
type ZgPlanu = { id: string; stan?: string }
type ZgStrony = { id: string; stan?: string }

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const WID: Record<string, string> = { ja: 'szkic', bliscy: 'dla bliskich', publiczne: 'publiczny' }
const NAGLOWKI: Record<RodzajPlanu, string> = { cmentarz: 'plany cmentarzy', historyczny: 'plany historyczne', schemat: 'schematy i szkice' }

export default function Plany() {
    const [dane, ustaw] = React.useState<{ plany: Wiersz[]; miejsca: { id: string; nazwa: string }[] } | null>(null)
    const [zgP, ustawZgP] = React.useState<ZgPlanu[]>([])
    const [zgS, ustawZgS] = React.useState<ZgStrony[]>([])
    const [msg, ustawMsg] = React.useState('')
    const [tytul, ustawTytul] = React.useState('')
    const [miejsce, ustawMiejsce] = React.useState('')
    const [nadpisz, ustawNadpisz] = React.useState(false)
    const [rodzaj, ustawRodzaj] = React.useState<RodzajPlanu | ''>('')
    React.useEffect(() => { const r = new URLSearchParams(location.search).get('rodzaj'); ustawRodzaj(r && r in RODZAJE_PLANU ? (r as RodzajPlanu) : '') }, [])
    const wczytaj = React.useCallback(() => {
        fetch('/api/keystatic/plany').then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then(ustaw).catch((s) => ustawMsg(s === 401 ? 'Brak dostępu – panel planów działa tylko za hasłem panelu (nginx).' : 'Nie udało się wczytać listy planów.'))
        fetch('/api/keystatic/plany/zgloszenia').then((r) => r.json()).then(ustawZgP).catch(() => {})
        fetch('/api/keystatic/zgloszenia').then((r) => r.json()).then(ustawZgS).catch(() => {})
    }, [])
    React.useEffect(() => { wczytaj() }, [wczytaj])
    const nowy = async (e: React.FormEvent) => {
        e.preventDefault()
        const r = await fetch('/api/keystatic/plany', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ akcja: 'nowy', slug: slugify(tytul), tytul, miejsce: miejsce || undefined }) })
        const j = await r.json()
        if (r.ok) location.href = `/keystatic/plany/${j.slug}`
        else ustawMsg(j.blad)
    }
    const importuj = async (f: File) => {
        ustawMsg(`wgrywam ${f.name} (${Math.round(f.size / 1024)} kB)…`)
        let plan: unknown
        try {
            plan = JSON.parse(await f.text())
        } catch {
            ustawMsg(`„${f.name}” nie jest plikiem planu – to nie jest poprawny JSON (może zapisał się jako strona albo jest ucięty).`)
            return
        }
        if (!plan || typeof plan !== 'object' || !('elementy' in plan)) {
            ustawMsg(`„${f.name}” to JSON, ale nie plik planu (brak listy elementów).`)
            return
        }
        try {
            const r = await fetch('/api/keystatic/plany', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ akcja: 'import', plan, nadpisz }) })
            const tekst = await r.text()
            let j: { tytul?: string; blad?: string } = {}
            try { j = JSON.parse(tekst) } catch { /* odpowiedź nie-JSON (nginx, błąd serwera) */ }
            if (r.ok) ustawMsg(`Zaimportowano: ${j.tytul ?? f.name}`)
            else if (r.status === 401) ustawMsg('Serwer odrzucił zapis (401): brak hasła panelu w zapytaniu. Odśwież stronę i zaloguj się ponownie.')
            else if (r.status === 413) ustawMsg('Plik za duży dla serwera (413) – trzeba zwiększyć client_max_body_size w nginx.')
            else ustawMsg(j.blad ?? `Błąd serwera ${r.status}: ${tekst.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)}`)
            wczytaj()
        } catch (e) {
            ustawMsg(`Nie udało się wysłać pliku: ${e instanceof Error ? e.message : String(e)}`)
        }
    }
    const usunPlan = async (p: Wiersz) => {
        if (!confirm(`Przenieść plan „${p.tytul}” do kosza (content/plany/_kosz)?`)) return
        await fetch(`/api/keystatic/plany/${p.slug}`, { method: 'DELETE' })
        wczytaj()
    }
    const czekaZg = [...zgP, ...zgS].filter((z) => !z.stan || z.stan === 'nowe' || z.stan === 'odlozone').length
    const widoczne = (dane?.plany ?? []).filter((p) => !rodzaj || p.rodzaj === rodzaj)
    const ile = (r: RodzajPlanu) => (dane?.plany ?? []).filter((p) => p.rodzaj === r).length
    return (
        <>
            <header className="pn-naglowek">
                <h1>{rodzaj ? NAGLOWKI[rodzaj] : 'plany'} {dane && <span className="pn-szary">· {widoczne.length}</span>}</h1>
                <span className="pn-rzad">
                    <a className="pn-btn" href="/keystatic/plany/typy">typy na planach →</a>
                    <a className="pn-btn pn-btn-gl" href="#nowy-plan">+ plan</a>
                </span>
            </header>
            <nav className="pn-seg pn-samo" aria-label="rodzaj planu">
                <a href="/keystatic/plany" aria-current={!rodzaj ? 'page' : undefined}>wszystkie {dane && <span className="pn-szary">{dane.plany.length}</span>}</a>
                {(Object.keys(RODZAJE_PLANU) as RodzajPlanu[]).map((r) => (
                    <a key={r} href={`/keystatic/plany?rodzaj=${r}`} aria-current={rodzaj === r ? 'page' : undefined}>{NAGLOWKI[r]} {dane && <span className="pn-szary">{ile(r)}</span>}</a>
                ))}
            </nav>
            {msg && <p className="pn-kom" role="status">{msg}</p>}
            <section className="pn-karta" aria-label="lista planów">
                {dane && widoczne.length === 0 && <p className="pn-szary pn-bez-marginesu">{rodzaj ? `Nie ma jeszcze planów tego rodzaju (${RODZAJE_PLANU[rodzaj]}).` : 'Nie ma jeszcze planów.'}</p>}
                {widoczne.length > 0 && (
                    <div className="pn-wiersze">
                        {widoczne.map((p) => (
                            <div key={p.slug} className="pn-wiersz">
                                <a href={`/keystatic/plany/${p.slug}`}><b>{p.tytul}</b></a>
                                <span className="pn-maly">{RODZAJE_PLANU[p.rodzaj]} · {WID[p.widocznosc] ?? p.widocznosc} · {p.elementow} elementów · zmieniono {new Date(p.zmieniono).toLocaleString('pl-PL')}</span>
                                <span className="pn-prawo pn-rzad">
                                    {p.widocznosc !== 'ja' && <a href={`/plany/${p.slug}`} target="_blank" rel="noreferrer" className="pn-btn pn-btn-maly">na stronie ↗</a>}
                                    <button type="button" onClick={() => usunPlan(p)} className="pn-btn pn-btn-maly">do kosza</button>
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
            <form onSubmit={nowy} className="pn-karta" id="nowy-plan" aria-labelledby="nowy-plan-t">
                <h2 id="nowy-plan-t">nowy plan</h2>
                <div className="pn-rzad">
                    <input required className="pn-in pn-rosnie" value={tytul} onChange={(e) => ustawTytul(e.target.value)} placeholder="tytuł, np. cmentarz w Mszannie" aria-label="tytuł planu" />
                    <select className="pn-in" value={miejsce} onChange={(e) => ustawMiejsce(e.target.value)} aria-label="miejscowość"><option value="">miejscowość…</option>{dane?.miejsca.map((m) => <option key={m.id} value={m.id}>{m.nazwa}</option>)}</select>
                    <button type="submit" className="pn-btn pn-btn-gl">utwórz</button>
                </div>
                {tytul && <span className="pn-maly">adres: /plany/{slugify(tytul)} · rodzaj planu ustawisz w edytorze (zakładka „plan”)</span>}
            </form>
            <section className="pn-karta" aria-labelledby="import-planu-t">
                <h2 id="import-planu-t">import pliku planu</h2>
                <div className="pn-rzad">
                    <label className="pn-btn">wybierz plik .plan.json<input type="file" accept=".json" hidden onChange={(e) => e.target.files?.[0] && importuj(e.target.files[0])} /></label>
                    <label className="pn-rzad"><input type="checkbox" checked={nadpisz} onChange={(e) => ustawNadpisz(e.target.checked)} /> zastąp istniejący plan o tym samym adresie</label>
                </div>
            </section>
            <p className="pn-bez-marginesu">
                <a href="/keystatic/panel/zgloszenia">zgłoszenia czytelników{czekaZg ? ` – czeka ${czekaZg}` : ''} →</a>
            </p>
        </>
    )
}

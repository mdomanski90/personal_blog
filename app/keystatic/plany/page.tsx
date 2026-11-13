'use client'
// Panel planów: lista, nowy plan, import pliku planu; zgłoszenia czytelników – w panelu (/keystatic/panel/zgloszenia).
import * as React from 'react'

type Wiersz = { slug: string; tytul: string; widocznosc: string; miejsce?: string; obiekt?: string; elementow: number; zmieniono: string }
type ZgPlanu = { id: string; stan?: string }
type ZgStrony = { id: string; stan?: string }

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const WID: Record<string, string> = { ja: 'szkic', bliscy: 'dla bliskich', publiczne: 'publiczny' }

export default function Plany() {
    const [dane, ustaw] = React.useState<{ plany: Wiersz[]; miejsca: { id: string; nazwa: string }[] } | null>(null)
    const [zgP, ustawZgP] = React.useState<ZgPlanu[]>([])
    const [zgS, ustawZgS] = React.useState<ZgStrony[]>([])
    const [msg, ustawMsg] = React.useState('')
    const [tytul, ustawTytul] = React.useState('')
    const [miejsce, ustawMiejsce] = React.useState('')
    const [nadpisz, ustawNadpisz] = React.useState(false)
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
    const pole: React.CSSProperties = { font: 'inherit', fontSize: 14, height: 30, padding: '0 8px', border: '1px solid #d6d1c6', borderRadius: 7, background: 'transparent', color: 'inherit' }
    const btn: React.CSSProperties = { ...pole, cursor: 'pointer', background: 'var(--muted, #f2f0eb)' }
    return (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 20px 60px', fontFamily: 'var(--font-jetbrains), monospace', display: 'flex', flexDirection: 'column', gap: 18, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 }}>
                <h1 style={{ fontSize: 22, margin: 0 }}>plany obiektów</h1>
                <span style={{ display: 'flex', gap: 14 }}><a href="/keystatic/panel">← panel</a><a href="/keystatic/plany/typy">katalog typów →</a><a href="/keystatic">panel treści →</a></span>
            </div>
            {msg && <p style={{ margin: 0, padding: '8px 10px', borderRadius: 7, background: '#fef3c7', color: '#78350f' }}>{msg}</p>}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dane?.plany.length === 0 && <p style={{ color: '#6b665c', margin: 0 }}>Nie ma jeszcze planów.</p>}
                {dane?.plany.map((p) => (
                    <div key={p.slug} style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap', borderBottom: '1px solid #e7e2d8', padding: '6px 0' }}>
                        <a href={`/keystatic/plany/${p.slug}`} style={{ fontWeight: 700 }}>{p.tytul}</a>
                        <span style={{ color: '#6b665c', fontSize: 12 }}>{WID[p.widocznosc] ?? p.widocznosc} · {p.elementow} elementów · zmieniono {new Date(p.zmieniono).toLocaleString('pl-PL')}</span>
                        <span style={{ flex: 1 }} />
                        {p.widocznosc !== 'ja' && <a href={`/plany/${p.slug}`} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>na stronie ↗</a>}
                        <button onClick={() => usunPlan(p)} style={{ ...btn, height: 26, fontSize: 12, background: 'none' }}>do kosza</button>
                    </div>
                ))}
            </section>
            <form onSubmit={nowy} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <b style={{ width: '100%' }}>nowy plan</b>
                <input required value={tytul} onChange={(e) => ustawTytul(e.target.value)} placeholder="tytuł, np. cmentarz w Mszannie" style={{ ...pole, flex: '1 1 260px' }} />
                <select value={miejsce} onChange={(e) => ustawMiejsce(e.target.value)} style={pole}><option value="">miejscowość…</option>{dane?.miejsca.map((m) => <option key={m.id} value={m.id}>{m.nazwa}</option>)}</select>
                <button type="submit" style={btn}>utwórz</button>
                {tytul && <span style={{ color: '#6b665c', fontSize: 12, width: '100%' }}>adres: /plany/{slugify(tytul)}</span>}
            </form>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <b style={{ width: '100%' }}>import pliku planu</b>
                <label style={{ ...btn, display: 'inline-flex', alignItems: 'center' }}>wybierz plik .plan.json<input type="file" accept=".json" hidden onChange={(e) => e.target.files?.[0] && importuj(e.target.files[0])} /></label>
                <label style={{ fontSize: 13 }}><input type="checkbox" checked={nadpisz} onChange={(e) => ustawNadpisz(e.target.checked)} /> zastąp istniejący plan o tym samym adresie</label>
            </div>
            <p style={{ margin: 0 }}>
                <a href="/keystatic/panel/zgloszenia">zgłoszenia czytelników{czekaZg ? ` – czeka ${czekaZg}` : ''} →</a>
            </p>
        </div>
    )
}

'use client'
// Tymczasowy panel planów: lista i import pliku planu. Pełny edytor – w następnej łatce.
import * as React from 'react'

export default function Plany() {
    const [dane, ustaw] = React.useState<{ plany: { slug: string; tytul: string; widocznosc: string; elementow: number }[]; zgloszenia: number } | null>(null)
    const [msg, ustawMsg] = React.useState('')
    const wczytaj = () => fetch('/api/keystatic/plany').then((r) => r.json()).then(ustaw).catch(() => ustawMsg('Brak dostępu do API planów.'))
    React.useEffect(() => { wczytaj() }, [])
    const importuj = async (f: File, nadpisz: boolean) => {
        ustawMsg('wgrywam…')
        const plan = JSON.parse(await f.text())
        const r = await fetch('/api/keystatic/plany', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ akcja: 'import', plan, nadpisz }) })
        const j = await r.json(); ustawMsg(r.ok ? `Zaimportowano: ${j.tytul}` : j.blad); wczytaj()
    }
    const ustawWid = async (slug: string, w: string) => {
        const p = await (await fetch(`/api/keystatic/plany/${slug}`)).json()
        const r = await fetch(`/api/keystatic/plany/${slug}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, widocznosc: w }) })
        ustawMsg(r.ok ? 'zapisano' : 'błąd zapisu'); wczytaj()
    }
    const [nadpisz, ustawNadpisz] = React.useState(false)
    return (
        <div style={{ maxWidth: 760, margin: '0 auto', padding: 24, fontFamily: 'var(--font-jetbrains), monospace', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h1 style={{ fontSize: 20, margin: 0 }}>plany obiektów</h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Edytor planów pojawi się w następnej łatce. Na razie: import pliku planu i widoczność na stronie.</p>
            {dane?.plany.map((p) => (
                <div key={p.slug} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 14 }}>
                    <a href={`/plany/${p.slug}`}>{p.tytul}</a><span style={{ color: '#6b7280' }}>{p.elementow} el.</span>
                    <select value={p.widocznosc} onChange={(e) => ustawWid(p.slug, e.target.value)}>
                        <option value="ja">szkic (tylko ja)</option><option value="bliscy">dla bliskich</option><option value="publiczne">publiczny</option>
                    </select>
                </div>
            ))}
            <label style={{ fontSize: 14 }}>importuj plik planu (.plan.json): <input type="file" accept=".json" onChange={(e) => e.target.files?.[0] && importuj(e.target.files[0], nadpisz)} /></label>
            <label style={{ fontSize: 13 }}><input type="checkbox" checked={nadpisz} onChange={(e) => ustawNadpisz(e.target.checked)} /> zastąp istniejący plan</label>
            {dane && dane.zgloszenia > 0 && <p style={{ margin: 0 }}>Prośby czytelników: {dane.zgloszenia} (pliki w content/plany/_zgloszenia)</p>}
            {msg && <p style={{ margin: 0 }}>{msg}</p>}
        </div>
    )
}

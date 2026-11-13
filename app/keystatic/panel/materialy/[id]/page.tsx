'use client'
// Strony jednego materiału: upuszczenie kilku skanów naraz, kolejność przeciąganiem (albo ‹ ›), podpisy, usuwanie.
import * as React from 'react'
import { useParams } from 'next/navigation'
import { odmiana } from '../../wspolne'

type Strona = { plik: string; podpis?: string; adres: string }
type Dane = { id: string; nazwa: string; plik: string | null; widocznosc: string; strony: Strona[] }

export default function StronyMaterialu() {
    // na serwerze typy Next.js dopuszczają null (strona poza trasą dynamiczną)
    const id = useParams<{ id: string }>()?.id ?? ''
    const [dane, ustawDane] = React.useState<Dane | null>(null)
    const [kom, ustawKom] = React.useState('')
    const [wysylanie, ustawWysylanie] = React.useState<{ z: number; n: number } | null>(null)
    const [nad, ustawNad] = React.useState(false)
    const ciagniety = React.useRef<number | null>(null)
    const api = `/api/keystatic/materialy/${id}/strony`

    const wczytaj = React.useCallback(async () => {
        const r = await fetch(api, { cache: 'no-store' })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) { ustawKom(j.blad ?? (r.status === 401 ? 'Brak hasła panelu – odśwież stronę.' : 'Nie udało się wczytać.')); return }
        ustawDane(j)
    }, [api])
    React.useEffect(() => { wczytaj() }, [wczytaj])

    const zapisz = async (strony: Strona[]) => {
        ustawDane((d) => (d ? { ...d, strony } : d))
        const r = await fetch(api, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ strony: strony.map(({ plik, podpis }) => ({ plik, podpis })) }) })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) { ustawKom(j.blad ?? 'Nie udało się zapisać.'); wczytaj(); return }
        ustawKom('zapisano')
        ustawDane((d) => (d ? { ...d, strony: j.strony } : d))
    }

    const wyslij = async (pliki: File[]) => {
        const obrazy = pliki.filter((f) => /^image\//.test(f.type) || /\.(tiff?|jpe?g|png|webp)$/i.test(f.name)).sort((a, b) => a.name.localeCompare(b.name, 'pl', { numeric: true }))
        if (!obrazy.length) { ustawKom('To nie są pliki graficzne (JPG, PNG, WebP, TIFF).'); return }
        for (let i = 0; i < obrazy.length; i++) {
            ustawWysylanie({ z: i + 1, n: obrazy.length })
            const fd = new FormData()
            fd.append('plik', obrazy[i])
            const r = await fetch(api, { method: 'POST', body: fd }).catch(() => null)
            const j = r ? await r.json().catch(() => ({})) : {}
            if (!r?.ok) { ustawKom(`„${obrazy[i].name}”: ${j.blad ?? (r?.status === 413 ? 'za duży plik dla serwera' : 'błąd wysyłania')}`); break }
            ustawDane((d) => (d ? { ...d, strony: j.strony } : d))
        }
        ustawWysylanie(null)
        ustawKom(`dodano ${odmiana(obrazy.length, ['stronę', 'strony', 'stron'])} – kolejność według nazw plików, możesz ją zmienić`)
    }

    const przenies = (z: number, na: number) => {
        if (!dane || z === na || na < 0 || na >= dane.strony.length) return
        const s = [...dane.strony]
        const [x] = s.splice(z, 1)
        s.splice(na, 0, x)
        zapisz(s)
    }
    const podpisy = React.useRef<Record<string, string>>({})
    const zapiszPodpis = (i: number, podpis: string) => {
        if (!dane) return
        const s = dane.strony.map((x, j) => (j === i ? { ...x, podpis } : x))
        zapisz(s)
    }

    if (!dane) return <>{kom ? <div className="pn-kom">{kom}</div> : <span className="pn-szary">wczytuję…</span>}</>
    const miniatura = (s: Strona) => `${api}?podglad=${encodeURIComponent(s.plik)}`

    return (
        <>
            <div className="pn-rzad" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <a href="/keystatic/panel/materialy" className="pn-maly">← materiały</a>
                    <h1>{dane.nazwa}</h1>
                    <span className="pn-maly">{dane.strony.length ? odmiana(dane.strony.length, ['strona', 'strony', 'stron']) : 'brak stron'}{dane.plik && !dane.strony.length ? ' · na stronie pokazuje się teraz plik z pola „Plik” w Keystatic – po dodaniu stron zastąpią go one' : ''}</span>
                </div>
                <span className="pn-rzad">
                    <a className="pn-btn" href={`/keystatic/collection/materialy/item/${dane.id}`}>opis w Keystatic →</a>
                    <a className="pn-btn" href={`/archiwum/${dane.id}`} target="_blank" rel="noreferrer">na stronie ↗</a>
                </span>
            </div>
            {kom && <div className={kom === 'zapisano' ? 'pn-info' : 'pn-kom'}>{kom}</div>}

            <label
                className="pn-karta"
                onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); ustawNad(true) } }}
                onDragLeave={() => ustawNad(false)}
                onDrop={(e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); ustawNad(false); wyslij([...e.dataTransfer.files]) }}
                style={{ alignItems: 'center', textAlign: 'center', borderStyle: 'dashed', borderWidth: 2, cursor: 'pointer', background: nad ? 'var(--wyb)' : undefined }}
            >
                <b>{wysylanie ? `wysyłam ${wysylanie.z} z ${wysylanie.n}…` : 'upuść tu skany stron – kilka naraz'}</b>
                <span className="pn-maly">albo kliknij, żeby wybrać pliki · JPG, PNG, WebP, TIFF · kolejność początkowo według nazw plików (np. 0001, 0002)</span>
                <input type="file" accept="image/*,.tif,.tiff" multiple hidden disabled={!!wysylanie} onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; if (f.length) wyslij(f) }} />
            </label>

            {dane.strony.length > 0 && (
                <section className="pn-karta">
                    <span className="pn-maly">Przeciągnij miniaturę, żeby zmienić kolejność (albo użyj ‹ ›). Podpis strony jest opcjonalny, np. „verso”, „s. 2 – podpisy świadków”.</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
                        {dane.strony.map((s, i) => (
                            <div
                                key={s.plik}
                                draggable
                                onDragStart={(e) => { ciagniety.current = i; e.dataTransfer.effectAllowed = 'move' }}
                                onDragOver={(e) => { if (ciagniety.current !== null) e.preventDefault() }}
                                onDrop={(e) => { e.preventDefault(); if (ciagniety.current !== null) przenies(ciagniety.current, i); ciagniety.current = null }}
                                style={{ display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid var(--linia)', borderRadius: 8, padding: 8, background: 'var(--karta)', cursor: 'grab' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <b>⋮⋮ s. {i + 1}</b>
                                    <span className="pn-rzad" style={{ gap: 4 }}>
                                        <button className="pn-btn" style={{ minHeight: 26, padding: '0 8px' }} onClick={() => przenies(i, i - 1)} disabled={i === 0} aria-label="wcześniej">‹</button>
                                        <button className="pn-btn" style={{ minHeight: 26, padding: '0 8px' }} onClick={() => przenies(i, i + 1)} disabled={i === dane.strony.length - 1} aria-label="później">›</button>
                                        <button className="pn-btn" style={{ minHeight: 26, padding: '0 8px' }} onClick={() => { if (confirm(`Usunąć stronę ${i + 1}? Plik trafi do kosza materiału na serwerze.`)) zapisz(dane.strony.filter((_, j) => j !== i)) }} aria-label="usuń stronę">✕</button>
                                    </span>
                                </div>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={miniatura(s)} alt={`strona ${i + 1}`} draggable={false} style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'contain', background: 'var(--tlo2)', borderRadius: 4 }} />
                                <input
                                    className="pn-in"
                                    placeholder="podpis (opcjonalnie)"
                                    defaultValue={s.podpis ?? ''}
                                    onChange={(e) => { podpisy.current[s.plik] = e.target.value }}
                                    onBlur={(e) => { if ((s.podpis ?? '') !== e.target.value) zapiszPodpis(i, e.target.value) }}
                                    style={{ minHeight: 30 }}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </>
    )
}

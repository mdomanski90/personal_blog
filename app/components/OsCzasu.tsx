'use client'
// Oś czasu tematów: epoki w kolorach państw z mapy, wydarzenia (data), zjawiska (okres od–do) i – na życzenie – materiały z datą.
import * as React from 'react'
import { Link } from 'next-view-transitions'

export interface PozycjaOsi { id: string; nazwa: string; href: string; rodzaj: 'wydarzenie' | 'zjawisko' | 'material'; klucz: number; data: string; opis?: string; meta: string }

const EPOKI: { nazwa: string; od: number; do: number; kolor: string }[] = [
    { nazwa: 'Rzeczpospolita', od: -9999, do: 1795.8, kolor: '#c0392b' },
    { nazwa: 'zabory', od: 1795.8, do: 1918.86, kolor: '#b7791f' },
    { nazwa: 'II Rzeczpospolita', od: 1918.86, do: 1939.67, kolor: '#c0392b' },
    { nazwa: 'okupacja', od: 1939.67, do: 1945.35, kolor: '#2f6aa3' },
    { nazwa: 'Polska Ludowa', od: 1945.35, do: 1989.5, kolor: '#8a5a83' },
    { nazwa: 'III Rzeczpospolita', od: 1989.5, do: 9999, kolor: '#c0392b' },
]
const FILTRY = [{ id: 'wydarzenie', nazwa: 'wydarzenia' }, { id: 'zjawisko', nazwa: 'zjawiska (okresy)' }, { id: 'material', nazwa: 'materiały z datą' }] as const

export default function OsCzasu({ pozycje }: { pozycje: PozycjaOsi[] }) {
    const [wl, ustawWl] = React.useState<Set<string>>(new Set(['wydarzenie', 'zjawisko']))
    const widoczne = pozycje.filter((p) => wl.has(p.rodzaj)).sort((a, b) => a.klucz - b.klucz)
    const grupy = EPOKI.map((e) => ({ e, L: widoczne.filter((p) => p.klucz / 10000 >= e.od && p.klucz / 10000 < e.do) })).filter((g) => g.L.length)
    return (
        <div className="flex flex-col" style={{ gap: 14 }}>
            <div className="flex flex-wrap items-center" style={{ gap: 8, fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                <span className="text-gray-600 dark:text-gray-400">pokaż:</span>
                <div className="flex flex-wrap w-fit" style={{ paddingLeft: 1 }}>
                    {FILTRY.map((f) => (
                        <button key={f.id} type="button" aria-pressed={wl.has(f.id)} onClick={() => ustawWl((s) => { const n = new Set(s); if (n.has(f.id)) n.delete(f.id); else n.add(f.id); return n })}
                            className={`border border-[#d1d5db] dark:border-[#4b5563] lowercase ${wl.has(f.id) ? 'bg-muted font-bold' : ''}`}
                            style={{ margin: '0 0 0 -1px', height: 'calc(28px * var(--font-scale, 1))', padding: '0 10px', background: wl.has(f.id) ? undefined : 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: 'inherit' }}>
                            {wl.has(f.id) ? '✓ ' : ''}{f.nazwa}
                        </button>
                    ))}
                </div>
            </div>
            {grupy.length === 0 && <p className="text-gray-500">Brak pozycji z datą.</p>}
            {grupy.map(({ e, L }) => (
                <section key={e.nazwa} className="flex flex-col" style={{ gap: 0 }}>
                    <div className="uppercase" style={{ fontSize: 'calc(11px * var(--font-scale, 1))', letterSpacing: '.08em', color: e.kolor, fontWeight: 700, marginBottom: 6 }}>{e.nazwa}</div>
                    <ol style={{ margin: 0, padding: 0, listStyle: 'none', borderLeft: `3px solid ${e.kolor}55` }}>
                        {L.map((p) => (
                            <li key={p.rodzaj + p.id} className="grid" style={{ gridTemplateColumns: '7.5rem minmax(0,1fr)', gap: '0 14px', padding: '8px 0 8px 14px', position: 'relative' }}>
                                <span aria-hidden="true" style={{ position: 'absolute', left: -8, top: 14, width: p.rodzaj === 'zjawisko' ? 4 : 11, height: p.rodzaj === 'zjawisko' ? 22 : 11, marginLeft: p.rodzaj === 'zjawisko' ? 3.5 : 0, borderRadius: p.rodzaj === 'material' ? 2 : 6, background: p.rodzaj === 'material' ? '#fff' : e.kolor, border: `2px solid ${e.kolor}` }} />
                                <span className="font-bold" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>{p.data}</span>
                                <span className="flex flex-col" style={{ gap: 2 }}>
                                    <Link href={p.href} style={{ fontSize: 'calc(16px * var(--font-scale, 1))' }}>{p.nazwa}</Link>
                                    {p.opis && <span className="text-gray-700 dark:text-gray-300" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>{p.opis}</span>}
                                    <span className="text-gray-500" style={{ fontSize: 'calc(12.5px * var(--font-scale, 1))' }}>{p.meta}</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </section>
            ))}
            <div className="flex flex-wrap text-gray-500" style={{ gap: '4px 16px', fontSize: 'calc(12px * var(--font-scale, 1))' }}>
                <span>● wydarzenie (data)</span><span>▮ zjawisko (okres od–do)</span><span>□ materiał z datą</span><span>epoki – te same kolory co państwa na mapie</span>
            </div>
        </div>
    )
}

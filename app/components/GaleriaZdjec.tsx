'use client'

// Fotografie (np. obiektu): miniatury z podpisem, kliknięcie – powiększenie na ciemnym tle,
// strzałki / klawiatura, Esc zamyka. Pod zdjęciem zawsze autor, data i prawa (źródło).

import * as React from 'react'

export interface Zdjecie { plik: string; podpis?: string; data?: string; autor?: string; prawa?: string }
const opisZrodla = (z: Zdjecie) => [z.data, z.autor && `fot. ${z.autor}`, z.prawa].filter(Boolean).join(' · ')

export default function GaleriaZdjec({ zdjecia, tytul }: { zdjecia: Zdjecie[]; tytul: string }) {
    const [i, ustaw] = React.useState<number | null>(null)
    React.useEffect(() => {
        if (i === null) return
        const k = (e: KeyboardEvent) => {
            if (e.key === 'Escape') ustaw(null)
            else if (e.key === 'ArrowRight') ustaw((x) => (x === null ? x : Math.min(zdjecia.length - 1, x + 1)))
            else if (e.key === 'ArrowLeft') ustaw((x) => (x === null ? x : Math.max(0, x - 1)))
        }
        document.addEventListener('keydown', k)
        const o = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.removeEventListener('keydown', k); document.body.style.overflow = o }
    }, [i, zdjecia.length])
    if (!zdjecia.length) return null
    const z = i !== null ? zdjecia[i] : null
    return (
        <>
            <div className="galeria-siatka">
                {zdjecia.map((x, j) => (
                    <figure key={x.plik} style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <button type="button" onClick={() => ustaw(j)} aria-label={`powiększ: ${x.podpis || `zdjęcie ${j + 1}`}`} className="galeria-miniatura">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${x.plik}?w=480`} alt={x.podpis || tytul} loading="lazy" />
                        </button>
                        {(x.podpis || opisZrodla(x)) && <figcaption style={{ fontSize: 'calc(12.5px * var(--font-scale, 1))', lineHeight: 1.45 }}>{x.podpis}{x.podpis && opisZrodla(x) ? <br /> : null}<span className="text-gray-500">{opisZrodla(x)}</span></figcaption>}
                    </figure>
                ))}
            </div>
            {z && i !== null && (
                <div className="plan-galeria" role="dialog" aria-label={z.podpis || 'zdjęcie'} onClick={(e) => { if (e.target === e.currentTarget) ustaw(null) }}>
                    <div className="flex items-center" style={{ gap: 12, color: '#e8e6e1' }}>
                        <span style={{ fontSize: 13 }}>{tytul}</span>
                        <span style={{ flex: 1 }} />
                        {zdjecia.length > 1 && <span style={{ fontSize: 12.5, color: '#a3a09a' }}>zdjęcie {i + 1} z {zdjecia.length}</span>}
                        <button type="button" onClick={() => ustaw(null)} className="plan-galeria-btn">zamknij (Esc)</button>
                    </div>
                    <div className="plan-galeria-srodek" style={{ flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {i > 0 && <button type="button" aria-label="poprzednie zdjęcie" onClick={() => ustaw(i - 1)} className="plan-galeria-btn" style={{ position: 'absolute', left: 0, width: 44, height: 44, fontSize: 18 }}>‹</button>}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${z.plik}?w=1800`} alt={z.podpis || tytul} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} />
                            {i < zdjecia.length - 1 && <button type="button" aria-label="następne zdjęcie" onClick={() => ustaw(i + 1)} className="plan-galeria-btn" style={{ position: 'absolute', right: 0, width: 44, height: 44, fontSize: 18 }}>›</button>}
                        </div>
                        {(z.podpis || opisZrodla(z)) && <p style={{ margin: 0, color: '#e8e6e1', fontSize: 13, textAlign: 'center' }}>{z.podpis}{z.podpis && opisZrodla(z) ? ' · ' : ''}<span style={{ color: '#a3a09a' }}>{opisZrodla(z)}</span></p>}
                    </div>
                </div>
            )}
        </>
    )
}

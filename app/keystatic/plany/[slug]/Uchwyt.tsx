'use client'
// PH-21: uchwyt zmiany szerokości panelu edytora (paleta typów, panel boczny) – przeciąganie, strzałki z klawiatury,
// Home / End = min / max, dwuklik = szerokość domyślna. Szerokość zapamiętana w przeglądarce osobno dla każdego panelu.
import * as React from 'react'

export function useSzerokosc(klucz: string, domyslna: number, min: number, max: number) {
    const ogr = React.useCallback((n: number) => Math.round(Math.min(max, Math.max(min, n))), [min, max])
    const [w, ustawW] = React.useState(domyslna)
    React.useEffect(() => { try { const z = Number(localStorage.getItem(klucz)); if (z) ustawW(ogr(z)) } catch { /* bez pamięci */ } }, [klucz, ogr])
    const ustaw = React.useCallback((n: number) => { const v = ogr(n); ustawW(v); try { localStorage.setItem(klucz, String(v)) } catch { /* bez pamięci */ } }, [klucz, ogr])
    return [w, ustaw] as const
}

/** `po` – po której stronie uchwytu jest panel: 'lewej' (paleta – w prawo szerzej) albo 'prawej' (panel boczny – w lewo szerzej). */
export function Uchwyt({ wartosc, ustaw, domyslna, min, max, po, etykieta }: {
    wartosc: number; ustaw: (n: number) => void; domyslna: number; min: number; max: number; po: 'lewej' | 'prawej'; etykieta: string
}) {
    const kier = po === 'lewej' ? 1 : -1
    const start = React.useRef<{ x: number; w: number } | null>(null)
    return (
        <div className="ed-uchwyt" role="separator" aria-orientation="vertical" aria-label={etykieta} aria-valuenow={wartosc} aria-valuemin={min} aria-valuemax={max} tabIndex={0}
            title={`${etykieta}: przeciągnij albo strzałki; dwuklik – szerokość domyślna`}
            onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); start.current = { x: e.clientX, w: wartosc } }}
            onPointerMove={(e) => { if (start.current) ustaw(start.current.w + (e.clientX - start.current.x) * kier) }}
            onPointerUp={() => { start.current = null }} onPointerCancel={() => { start.current = null }}
            onDoubleClick={() => ustaw(domyslna)}
            onKeyDown={(e) => {
                const krok = e.shiftKey ? 48 : 16
                if (e.key === 'ArrowRight') ustaw(wartosc + krok * kier)
                else if (e.key === 'ArrowLeft') ustaw(wartosc - krok * kier)
                else if (e.key === 'Home') ustaw(min)
                else if (e.key === 'End') ustaw(max)
                else if (e.key === 'Enter') ustaw(domyslna)
                else return
                e.preventDefault()
            }} />
    )
}

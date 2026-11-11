'use client'

// Mapa wektorowa (MapLibre + OpenFreeMap) z tarczami miejscowości.
// Przełącza kolory razem z motywem strony.

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { LngLatBounds, Map as MapaGL, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { stylMapy } from '@/lib/mapa-styl'
import { tarczaMiejsca, type Wyznanie } from '@/lib/tarcze'

const bezpieczny = (t: string) => t.replace(/[&<>"]/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[z]!)

export interface PunktTarczy {
    id: string
    nazwa: string
    rodzaj: string
    wyznanie: string
    lat: number
    lng: number
    przyblizone: boolean
}

export default function MapaWektor({ punkty, wysokosc = 560 }: { punkty: PunktTarczy[]; wysokosc?: number }) {
    const kontener = useRef<HTMLDivElement>(null)
    const mapa = useRef<MapaGL | null>(null)
    const router = useRouter()
    const { resolvedTheme } = useTheme()
    const ciemny = resolvedTheme === 'dark'
    const nazwy = punkty.map((p) => p.nazwa)

    useEffect(() => {
        if (!kontener.current || mapa.current) return
        setWorkerUrl('/api/mapa-worker')
        const m = new MapaGL({
            container: kontener.current,
            style: stylMapy(ciemny, nazwy),
            center: [22.68, 52.11],
            zoom: 10,
            attributionControl: { compact: true },
            cooperativeGestures: true,
        })
        m.addControl(new NavigationControl({ showCompass: false }), 'top-left')
        if (punkty.length > 1) {
            const b = new LngLatBounds()
            punkty.forEach((p) => b.extend([p.lng, p.lat]))
            m.fitBounds(b, { padding: 50, duration: 0 })
        }
        for (const p of punkty) {
            const el = document.createElement('a')
            el.href = `/miejsca/${p.id}`
            el.className = 'tarcza-mapy'
            el.innerHTML = `${tarczaMiejsca(p.rodzaj, p.wyznanie as Wyznanie, p.nazwa, p.rodzaj === 'miasto' ? 32 : 28, p.przyblizone)}<span>${bezpieczny(p.nazwa)}</span>`
            el.addEventListener('click', (e) => {
                e.preventDefault()
                router.push(`/miejsca/${p.id}`)
            })
            new Marker({ element: el, anchor: 'left', offset: [-14, 0] }).setLngLat([p.lng, p.lat]).addTo(m)
        }
        mapa.current = m
        return () => {
            m.remove()
            mapa.current = null
        }
        // mapa tworzona raz; motyw zmienia tylko styl (niżej)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        mapa.current?.setStyle(stylMapy(ciemny, nazwy))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ciemny])

    return (
        <div
            ref={kontener}
            role="region"
            aria-label="mapa wektorowa miejsc"
            className="border border-[#d1d5db] dark:border-[#4b5563] w-full mapa-wektor"
            style={{ height: wysokosc, borderRadius: '8px', overflow: 'hidden' }}
        />
    )
}

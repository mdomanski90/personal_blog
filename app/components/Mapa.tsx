'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface PunktMapy {
    id: string
    nazwa: string
    lat: number
    lng: number
    przyblizone?: boolean
    href?: string
}

// Domyślny widok: okolice Olszanki i Łosic.
const SRODEK: [number, number] = [52.137, 22.693]

export default function Mapa({
    punkty,
    wybrany = null,
    naWybor,
    wysokosc = 480,
    etykiety = true,
}: {
    punkty: PunktMapy[]
    wybrany?: string | null
    naWybor?: (id: string) => void
    wysokosc?: number
    etykiety?: boolean
}) {
    const kontener = useRef<HTMLDivElement>(null)
    const mapa = useRef<L.Map | null>(null)
    const znaczniki = useRef(new Map<string, L.CircleMarker>())
    const naWyborRef = useRef(naWybor)
    naWyborRef.current = naWybor

    useEffect(() => {
        if (!kontener.current || mapa.current) return
        const m = L.map(kontener.current, { scrollWheelZoom: false }).setView(SRODEK, 10)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(m)
        mapa.current = m
        return () => {
            m.remove()
            mapa.current = null
            znaczniki.current.clear()
        }
    }, [])

    useEffect(() => {
        const m = mapa.current
        if (!m) return
        znaczniki.current.forEach((z) => z.remove())
        znaczniki.current.clear()
        for (const p of punkty) {
            const z = L.circleMarker([p.lat, p.lng], {
                radius: 7,
                color: '#1e40af',
                weight: 2,
                fillColor: p.przyblizone ? '#ffffff' : '#1e40af',
                fillOpacity: 1,
                dashArray: p.przyblizone ? '3 3' : undefined,
            }).addTo(m)
            if (etykiety) z.bindTooltip(p.nazwa, { permanent: true, direction: 'right', offset: [8, 0], className: 'mapa-etykieta' })
            z.on('click', () => {
                if (naWyborRef.current) naWyborRef.current(p.id)
                else if (p.href) window.location.href = p.href
            })
            znaczniki.current.set(p.id, z)
        }
        if (punkty.length === 1) m.setView([punkty[0].lat, punkty[0].lng], 13)
        else if (punkty.length > 1) m.fitBounds(L.latLngBounds(punkty.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40] })
    }, [punkty, etykiety])

    useEffect(() => {
        znaczniki.current.forEach((z, id) => z.setStyle({ radius: id === wybrany ? 10 : 7, weight: id === wybrany ? 4 : 2 }))
    }, [wybrany])

    return (
        <div
            ref={kontener}
            role="region"
            aria-label="mapa miejsc"
            className="border border-[#d1d5db] dark:border-[#4b5563] w-full"
            style={{ height: wysokosc, zIndex: 0, borderRadius: '8px' }}
        />
    )
}

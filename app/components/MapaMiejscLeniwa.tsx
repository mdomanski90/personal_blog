'use client'

import dynamic from 'next/dynamic'
import type { PunktMapy } from './MapaMiejsc'

const MapaMiejsc = dynamic(() => import('./MapaMiejsc'), {
    ssr: false,
    loading: () => <div className="border border-[#d1d5db] dark:border-[#4b5563] bg-muted" style={{ height: 520, borderRadius: 8 }} />,
})

/** Mapa ładowana dopiero w przeglądarce (MapLibre nie działa po stronie serwera). */
export default function MapaMiejscLeniwa(props: { punkty: PunktMapy[]; wysokosc?: number; srodek?: [number, number]; przyblizenie?: number }) {
    return <MapaMiejsc {...props} />
}

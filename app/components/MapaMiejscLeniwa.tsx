'use client'

import dynamic from 'next/dynamic'
import type { PunktMapy } from './MapaMiejsc'
import type { PlanNaMapie } from '@/lib/plany/serwer'

const MapaMiejsc = dynamic(() => import('./MapaMiejsc'), {
    ssr: false,
    loading: () => <div className="border border-[#d6d1c6] dark:border-[#4b5563] bg-muted" style={{ height: '100%', minHeight: 300, borderRadius: 8 }} />,
})

/** Mapa ładowana dopiero w przeglądarce (MapLibre nie działa po stronie serwera). */
export default function MapaMiejscLeniwa(props: { punkty: PunktMapy[]; wysokosc?: number | string; srodek?: [number, number]; przyblizenie?: number; granice?: boolean; zapamietaj?: string; obrys?: { url: string; nazwa: string }; wyroznione?: string[]; planyGeo?: PlanNaMapie[] }) {
    return <MapaMiejsc {...props} />
}

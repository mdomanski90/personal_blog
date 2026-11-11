'use client'

import dynamic from 'next/dynamic'
import type { PunktTarczy } from './MapaWektor'

const MapaWektor = dynamic(() => import('./MapaWektor'), {
    ssr: false,
    loading: () => <div className="border border-[#d1d5db] dark:border-[#4b5563] bg-muted" style={{ height: 560, borderRadius: 8 }} />,
})

export default function MapaWektorLeniwa({ punkty }: { punkty: PunktTarczy[] }) {
    return <MapaWektor punkty={punkty} />
}

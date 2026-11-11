'use client'

import dynamic from 'next/dynamic'

const Mapa = dynamic(() => import('./Mapa'), {
    ssr: false,
    loading: () => <div className="border border-[#d1d5db] dark:border-[#4b5563] bg-muted" style={{ height: 260, borderRadius: '8px' }} />,
})

/** Mała mapka jednego miejsca (strona miejscowości). */
export default function MapaMiejsca({ id, nazwa, lat, lng, przyblizone }: { id: string; nazwa: string; lat: number; lng: number; przyblizone: boolean }) {
    return <Mapa punkty={[{ id, nazwa, lat, lng, przyblizone }]} wysokosc={260} etykiety={false} />
}

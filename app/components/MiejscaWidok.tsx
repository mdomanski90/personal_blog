'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import type { PunktMapy } from './Mapa'

const Mapa = dynamic(() => import('./Mapa'), {
    ssr: false,
    loading: () => <div className="border border-[#d1d5db] dark:border-[#4b5563] bg-muted" style={{ height: 480, borderRadius: '8px' }} />,
})

/** Mapa okolicy; kliknięcie w punkt otwiera stronę miejscowości. */
export default function MiejscaWidok({ punkty, wszystkich }: { punkty: PunktMapy[]; wszystkich: number }) {
    const router = useRouter()
    const bezWspolrzednych = wszystkich - punkty.length

    return (
        <div className="flex flex-col" style={{ gap: '0.5rem' }}>
            <Mapa punkty={punkty} naWybor={(id) => router.push(`/miejsca/${id}`)} />
            {bezWspolrzednych > 0 && (
                <p className="text-gray-500 lowercase" style={{ fontSize: '13px' }}>
                    {bezWspolrzednych === wszystkich
                        ? 'żadna miejscowość nie ma jeszcze współrzędnych – uzupełnij je w panelu, a pojawią się na mapie.'
                        : `${bezWspolrzednych} z ${wszystkich} miejscowości nie ma jeszcze współrzędnych.`}
                </p>
            )}
        </div>
    )
}

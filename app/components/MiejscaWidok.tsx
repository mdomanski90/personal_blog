'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Link } from 'next-view-transitions'
import type { PunktMapy } from './Mapa'
import { odmiana } from '@/lib/tekst'

const Mapa = dynamic(() => import('./Mapa'), {
    ssr: false,
    loading: () => <div className="border border-[#d1d5db] dark:border-[#4b5563] bg-muted" style={{ height: 480 }} />,
})

export interface MiejsceNaLiscie {
    id: string
    nazwa: string
    rodzaj: string
    inneNazwy: string[]
    nalezyDo: { id: string; nazwa: string } | null
    wspolrzedne: [number, number] | null
    przyblizone: boolean
    opowiesci: number
    tematy: number
}

export default function MiejscaWidok({ miejsca }: { miejsca: MiejsceNaLiscie[] }) {
    const [otwarte, setOtwarte] = useState<string | null>(null)

    const punkty: PunktMapy[] = miejsca
        .filter((m) => m.wspolrzedne)
        .map((m) => ({ id: m.id, nazwa: m.nazwa, lat: m.wspolrzedne![0], lng: m.wspolrzedne![1], przyblizone: m.przyblizone, href: `/miejsca/${m.id}` }))
    const bezWspolrzednych = miejsca.length - punkty.length

    const wybierzZMapy = (id: string) => {
        setOtwarte(id)
        requestAnimationFrame(() => document.getElementById(`miejsce-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    }

    return (
        <div className="flex flex-col" style={{ gap: '1.5rem' }}>
            <div className="flex flex-col" style={{ gap: '0.5rem' }}>
                <Mapa punkty={punkty} wybrany={otwarte} naWybor={wybierzZMapy} />
                {bezWspolrzednych > 0 && (
                    <p className="text-gray-500 lowercase" style={{ fontSize: '13px' }}>
                        {bezWspolrzednych === miejsca.length
                            ? 'żadna miejscowość nie ma jeszcze współrzędnych – uzupełnij je w panelu, a pojawią się na mapie.'
                            : `${bezWspolrzednych} z ${miejsca.length} miejscowości nie ma jeszcze współrzędnych.`}
                    </p>
                )}
            </div>

            <section className="flex flex-col" style={{ gap: '0.5rem' }}>
                <h2 className="font-bold lowercase" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>spis miejscowości</h2>
                <ul className="border-t border-[#d1d5db] dark:border-[#4b5563]">
                    {miejsca.map((m) => {
                        const czyOtwarte = otwarte === m.id
                        const powiazania = [
                            m.opowiesci ? odmiana(m.opowiesci, ['wpis', 'wpisy', 'wpisów']) : '',
                            m.tematy ? odmiana(m.tematy, ['temat', 'tematy', 'tematów']) : '',
                        ].filter(Boolean).join(' · ')
                        return (
                            <li key={m.id} id={`miejsce-${m.id}`} className="border-b border-[#d1d5db] dark:border-[#4b5563] scroll-mt-24">
                                <button
                                    type="button"
                                    aria-expanded={czyOtwarte}
                                    aria-controls={`miejsce-${m.id}-szczegoly`}
                                    onClick={() => setOtwarte(czyOtwarte ? null : m.id)}
                                    className="w-full box-border text-left flex items-baseline gap-3 py-2 px-1 bg-transparent border-0 cursor-pointer text-current hover:bg-muted"
                                    style={{ fontSize: 'calc(16px * var(--font-scale, 1))' }}
                                >
                                    <span aria-hidden="true" style={{ width: '1rem' }}>{czyOtwarte ? '▾' : '▸'}</span>
                                    <span className="font-bold">{m.nazwa}</span>
                                    {powiazania && <span className="text-gray-500" style={{ fontSize: 'calc(12px * var(--font-scale, 1))' }}>{powiazania}</span>}
                                </button>
                                {czyOtwarte && (
                                    <div id={`miejsce-${m.id}-szczegoly`} className="flex flex-col pb-4" style={{ paddingLeft: '2rem', gap: '0.35rem', fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                                        <span><span className="text-gray-500">rodzaj:</span> {m.rodzaj}</span>
                                        {m.inneNazwy.length > 0 && <span><span className="text-gray-500">inne nazwy:</span> {m.inneNazwy.join(', ')}</span>}
                                        {m.nalezyDo && (
                                            <span><span className="text-gray-500">należy do:</span> <Link href={`/miejsca/${m.nalezyDo.id}`}>{m.nalezyDo.nazwa}</Link></span>
                                        )}
                                        {!m.wspolrzedne && <span className="text-gray-500">brak współrzędnych – nie ma na mapie</span>}
                                        <Link href={`/miejsca/${m.id}`} className="font-bold w-fit">pełna strona miejscowości →</Link>
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ul>
            </section>
        </div>
    )
}

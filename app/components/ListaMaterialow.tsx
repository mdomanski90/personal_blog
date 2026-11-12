import * as React from 'react'
import { Link } from 'next-view-transitions'
import type { Material } from '@/lib/archiwum'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { formatujEdtf } from '@/lib/edtf'
import { typPliku } from '@/lib/pliki'
import { RAMKA } from './Uklad'

const ZNAK: Record<string, string> = { obraz: '▣', dzwiek: '♪', film: '▶', pdf: 'PDF', inny: '▤' }

/** Siatka materiałów: miniatura (zdjęcia, mapy, skany) albo znak rodzaju pliku, tytuł, rodzaj i data. */
export default function ListaMaterialow({ materialy }: { materialy: Material[] }) {
    if (!materialy.length) return <p className="text-gray-500 italic lowercase">brak materiałów.</p>
    return (
        <ul className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))', gap: 12 }}>
            {materialy.map((m) => {
                const typ = typPliku(m.plik)
                return (
                    <li key={m.id} className={`${RAMKA} overflow-hidden flex flex-col`} style={{ borderRadius: 8 }}>
                        <Link href={`/archiwum/${m.id}`} className="!no-underline text-current flex flex-col h-full hover:opacity-90">
                            <div className="bg-muted flex items-center justify-center" style={{ aspectRatio: '4 / 3', overflow: 'hidden' }}>
                                {m.plik && typ === 'obraz' ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={m.plik} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span className="text-gray-500" style={{ fontSize: 28 }} aria-hidden="true">{typ ? ZNAK[typ] : '—'}</span>
                                )}
                            </div>
                            <div className="flex flex-col" style={{ padding: '8px 10px', gap: 2 }}>
                                <span className="font-bold leading-tight" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>{m.nazwa}</span>
                                <span className="text-gray-500 lowercase" style={{ fontSize: 'calc(12px * var(--font-scale, 1))' }}>
                                    {[RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj, m.czas && formatujEdtf(m.czas), m.widocznosc === 'bliscy' && 'dla bliskich'].filter(Boolean).join(' · ')}
                                </span>
                            </div>
                        </Link>
                    </li>
                )
            })}
        </ul>
    )
}

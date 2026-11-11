import * as React from 'react'
import { Link } from 'next-view-transitions'
import type { GrupaMiejsc } from '@/lib/archiwum'
import SiatkaMiejsc from './SiatkaMiejsc'

/** Spis miejscowości podzielony na krainy i gminy (pod mapą na stronie „miejsca”). */
export default function SpisMiejsc({ grupy }: { grupy: GrupaMiejsc[] }) {
    const tylkoInne = grupy.length === 1 && !grupy[0].obszar
    return (
        <div className="flex flex-col" style={{ gap: 'calc(1.25rem * var(--font-scale, 1))' }}>
            {grupy.map((g) => (
                <section key={g.obszar?.id ?? 'inne'} className="flex flex-col" style={{ gap: 8 }}>
                    {!tylkoInne && (
                        <h2 className="font-bold" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                            {g.obszar ? <Link href={`/miejsca/${g.obszar.id}`} className="!no-underline hover:underline">{g.obszar.nazwa}</Link> : 'inne'}
                        </h2>
                    )}
                    {g.miejsca.length > 0 && <SiatkaMiejsc miejsca={g.miejsca} />}
                    {g.podgrupy.map((pg) => (
                        <div key={pg.obszar.id} className="flex flex-col" style={{ gap: 6, paddingLeft: 'calc(1rem * var(--font-scale, 1))' }}>
                            <h3 className="text-gray-700 dark:text-gray-300" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                                <Link href={`/miejsca/${pg.obszar.id}`} className="!no-underline hover:underline">{pg.obszar.nazwa}</Link>
                            </h3>
                            <SiatkaMiejsc miejsca={pg.miejsca} />
                        </div>
                    ))}
                </section>
            ))}
        </div>
    )
}

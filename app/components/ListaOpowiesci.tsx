import * as React from 'react'
import { Link } from 'next-view-transitions'
import type { Opowiesc } from '@/lib/archiwum'
import { RODZAJE_OPOWIESCI } from '@/lib/archiwum'
import { Kreski, Metki, dataZDniem } from './Uklad'

/** Lista opowieści: data · rodzaj · miejsca, tytuł, zajawka. */
export default function ListaOpowiesci({ opowiesci, nazwyMiejsc }: { opowiesci: Opowiesc[]; nazwyMiejsc: Map<string, string> }) {
    if (!opowiesci.length) return <p className="text-gray-500 italic lowercase">brak opowieści.</p>
    return (
        <div className="flex flex-col" style={{ gap: 'calc(1.5rem * var(--font-scale, 1))' }}>
            {opowiesci.map((o) => {
                const miejsca = o.miejsca.filter((id) => nazwyMiejsc.has(id))
                return (
                    <article key={o.id} className="flex flex-col" style={{ gap: 'calc(0.4rem * var(--font-scale, 1))' }}>
                        <Metki
                            elementy={[
                                dataZDniem(o.data),
                                RODZAJE_OPOWIESCI[o.rodzaj] ?? o.rodzaj,
                                miejsca.length ? nazwyMiejsc.get(miejsca[0]) + (miejsca.length > 1 ? ` +${miejsca.length - 1}` : '') : null,
                            ]}
                        />
                        <h2 className="font-bold break-words leading-tight" style={{ fontSize: 'calc(1.5rem * var(--font-scale, 1))' }}>
                            <Link href={`/opowiesci/${o.id}`} className="!no-underline hover:underline">{o.tytul}</Link>
                        </h2>
                        {o.zajawka && (
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed" style={{ fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                                {o.zajawka}
                            </p>
                        )}
                        <Kreski className="mt-2" />
                    </article>
                )
            })}
        </div>
    )
}

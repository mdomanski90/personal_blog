import * as React from 'react'
import { Link } from 'next-view-transitions'
import type { Opowiesc } from '@/lib/archiwum'
import { Kreski } from './Uklad'
import { LiniaWpisu } from './MetkiWpisu'

/** Lista wpisów: data · rodzaj · miejsca (spokojna linia), tytuł, zajawka i odnośnik do całości. */
export default function ListaOpowiesci({ opowiesci, nazwyMiejsc }: { opowiesci: Opowiesc[]; nazwyMiejsc: Map<string, string> }) {
    if (!opowiesci.length) return <p className="text-gray-500 italic lowercase">brak wpisów.</p>
    return (
        <div className="flex flex-col" style={{ gap: 'calc(1.5rem * var(--font-scale, 1))' }}>
            {opowiesci.map((o) => {
                return (
                    <article key={o.id} className="flex flex-col" style={{ gap: 'calc(0.4rem * var(--font-scale, 1))' }}>
                        <LiniaWpisu wpis={o} nazwy={{ miejsca: nazwyMiejsc }} ileMiejsc={3} />
                        <h2 className="font-bold break-words leading-tight" style={{ fontSize: 'calc(1.5rem * var(--font-scale, 1))' }}>
                            <Link href={`/wpisy/${o.id}`} className="!no-underline hover:underline">{o.tytul}</Link>
                        </h2>
                        {o.zajawka && (
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed" style={{ fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                                {o.zajawka}
                            </p>
                        )}
                        <Link href={`/wpisy/${o.id}`} className="w-fit lowercase font-bold" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                            czytaj całość →
                        </Link>
                        <Kreski className="mt-2" />
                    </article>
                )
            })}
        </div>
    )
}

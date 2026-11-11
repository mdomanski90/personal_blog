import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { poziomCzytelnika, szukaj } from '@/lib/archiwum'
import { Strona, TytulStrony } from '../components/Uklad'
import { odmiana } from '@/lib/tekst'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'szukaj · odniepamieci.pl', robots: { index: false } }

export default async function Szukaj({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
    const sp = await searchParams
    const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? '').slice(0, 100)
    const wyniki = q ? await szukaj(q, await poziomCzytelnika()) : []

    return (
        <Strona>
            <TytulStrony>szukaj</TytulStrony>
            {!q && <p className="text-gray-500 lowercase">wpisz szukane słowo w pole nad kreską – nazwę miejscowości, temat albo słowo z wpisów.</p>}
            {q && (
                <p className="lowercase" style={{ fontSize: '14px' }}>
                    „{q}”: {wyniki.length === 0 ? 'nic nie znaleziono.' : odmiana(wyniki.length, ['wynik', 'wyniki', 'wyników'])}
                </p>
            )}
            <ul className="flex flex-col border-t border-[#e5e7eb] dark:border-[#374151]">
                {wyniki.map((w) => (
                    <li key={w.adres} className="flex flex-col gap-1 py-3 border-b border-[#e5e7eb] dark:border-[#374151]">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                            <Link href={w.adres} className="font-bold" style={{ fontSize: 'calc(17px * var(--font-scale, 1))' }}>{w.tytul}</Link>
                            <span className="text-gray-500" style={{ fontSize: '13px' }}>{w.rodzaj}</span>
                        </div>
                        {w.fragment && <p className="text-gray-700 dark:text-gray-300" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>{w.fragment}</p>}
                    </li>
                ))}
            </ul>
        </Strona>
    )
}

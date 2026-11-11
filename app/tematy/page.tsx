import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { osCzasu, poziomCzytelnika, rozwiazOdnosniki, RODZAJE_TEMATOW, tematy } from '@/lib/archiwum'
import { formatujEdtf } from '@/lib/edtf'
import { zajawka } from '@/lib/markdoc'
import { Kreski, Sekcja, Strona, TytulStrony } from '../components/Uklad'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'tematy · odniepamieci.pl' }

export default async function Tematy() {
    const poziom = await poziomCzytelnika()
    const lista = await tematy(poziom)
    const rozwiaz = await rozwiazOdnosniki(poziom)
    const os = await osCzasu(poziom)

    return (
        <Strona>
            <TytulStrony>tematy</TytulStrony>
            {lista.length === 0 && <p className="text-gray-500 italic lowercase">brak opublikowanych tematów.</p>}

            {lista.length > 0 && (
                <Sekcja tytul="wszystkie tematy">
                    <ul className="flex flex-col border-t border-[#e5e7eb] dark:border-[#374151]">
                        {lista.map((t) => (
                            <li key={t.id} className="flex flex-col gap-1 py-3 border-b border-[#e5e7eb] dark:border-[#374151]">
                                <div className="flex flex-wrap items-baseline gap-x-3">
                                    <Link href={`/tematy/${t.id}`} className="font-bold" style={{ fontSize: 'calc(17px * var(--font-scale, 1))' }}>{t.nazwa}</Link>
                                    <span className="text-gray-500" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>
                                        {[RODZAJE_TEMATOW[t.rodzaj] ?? t.rodzaj, t.czas ? formatujEdtf(t.czas) : ''].filter(Boolean).join(' · ')}
                                    </span>
                                </div>
                                {t.opis && <p className="text-gray-700 dark:text-gray-300" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>{zajawka(t.opis, 160, rozwiaz)}</p>}
                            </li>
                        ))}
                    </ul>
                </Sekcja>
            )}

            {os.length > 0 && (
                <>
                    <Kreski />
                    <Sekcja tytul="oś czasu" id="os-czasu">
                        <ol className="border-l-2 border-[#d1d5db] dark:border-[#4b5563] ml-1">
                            {os.map((t) => (
                                <li key={t.id} className="flex flex-wrap gap-x-4 py-1 pl-4" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                                    <span className="font-bold" style={{ minWidth: '7rem' }}>{formatujEdtf(t.czas)}</span>
                                    <Link href={`/tematy/${t.id}`}>{t.nazwa}</Link>
                                </li>
                            ))}
                        </ol>
                    </Sekcja>
                </>
            )}
        </Strona>
    )
}

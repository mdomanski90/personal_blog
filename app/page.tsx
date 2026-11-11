import * as React from 'react'
import { Link } from 'next-view-transitions'
import { miejsca, nazwy, opowiesci, poziomCzytelnika } from '@/lib/archiwum'
import { Kreski, Sekcja, Strona } from './components/Uklad'
import ListaOpowiesci from './components/ListaOpowiesci'
import PrzekierowanieKotwicy from './components/PrzekierowanieKotwicy'

export const dynamic = 'force-dynamic'

export default async function StronaGlowna() {
    const poziom = await poziomCzytelnika()
    const wszystkieOpowiesci = await opowiesci(poziom)
    const wsie = (await miejsca(poziom)).filter((m) => m.rodzaj === 'wies' || m.rodzaj === 'miasto')
    const { miejsca: nazwyMiejsc } = await nazwy(poziom)

    return (
        <Strona>
            <PrzekierowanieKotwicy identyfikatory={wszystkieOpowiesci.map((o) => o.id)} />

            <p className="leading-relaxed" style={{ fontSize: 'var(--blog-font-size, 18px)' }}>
                Archiwum wsi wokół Olszanki i Łosic: dokumenty, zdjęcia, nagrania i wspomnienia, ludzie i miejsca, o których pamięta coraz mniej osób.
            </p>

            {wsie.length > 0 && (
                <Sekcja tytul="miejsca">
                    <ul
                        className="grid border-t border-l border-[#d1d5db] dark:border-[#4b5563]"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(11rem, 1fr))' }}
                    >
                        {wsie.map((m) => (
                            <li key={m.id} className="border-r border-b border-[#d1d5db] dark:border-[#4b5563]">
                                <Link href={`/miejsca/${m.id}`} className="block px-3 py-2 !no-underline hover:bg-muted" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                                    {m.nazwa}
                                </Link>
                            </li>
                        ))}
                        <li className="border-r border-b border-[#d1d5db] dark:border-[#4b5563] bg-muted">
                            <Link href="/miejsca" className="block px-3 py-2 !no-underline hover:opacity-80" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                                → na mapie
                            </Link>
                        </li>
                    </ul>
                </Sekcja>
            )}

            <Kreski />

            <Sekcja tytul="ostatnie opowieści">
                <ListaOpowiesci opowiesci={wszystkieOpowiesci.slice(0, 3)} nazwyMiejsc={nazwyMiejsc} />
                {wszystkieOpowiesci.length > 3 && (
                    <Link href="/opowiesci" className="lowercase w-fit" style={{ fontSize: '14px' }}>wszystkie opowieści →</Link>
                )}
            </Sekcja>
        </Strona>
    )
}

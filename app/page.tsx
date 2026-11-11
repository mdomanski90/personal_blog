import * as React from 'react'
import { Link } from 'next-view-transitions'
import { nazwy, opowiesci, poziomCzytelnika } from '@/lib/archiwum'
import { naHtml } from '@/lib/markdoc'
import { Kreski, Strona, Tresc } from './components/Uklad'
import MetkiWpisu from './components/MetkiWpisu'

export const dynamic = 'force-dynamic'

export default async function StronaGlowna() {
    const poziom = await poziomCzytelnika()
    const wpisy = await opowiesci(poziom)
    const n = await nazwy(poziom)

    return (
        <Strona>
            <p className="leading-relaxed" style={{ fontSize: 'var(--blog-font-size, 18px)' }}>
                Archiwum wsi wokół Olszanki i Łosic: dokumenty, zdjęcia, nagrania i wspomnienia, ludzie i miejsca, o których pamięta coraz mniej osób.
            </p>

            <Kreski />

            {wpisy.length === 0 && <p className="text-gray-500 italic lowercase">brak wpisów.</p>}

            {wpisy.map((w) => (
                // id = identyfikator wpisu, więc stare odnośniki „/#identyfikator” nadal przewijają do wpisu
                <article key={w.id} id={w.id} className="flex flex-col scroll-mt-6" style={{ gap: 'calc(1rem * var(--font-scale, 1))' }}>
                    <MetkiWpisu wpis={w} nazwy={n} />
                    <h2 className="font-bold break-words leading-tight" style={{ fontSize: 'calc(1.5rem * var(--font-scale, 1))' }}>
                        <Link href={`/wpisy/${w.id}`} className="!no-underline hover:underline">{w.tytul}</Link>
                    </h2>
                    <Tresc html={naHtml(w.tresc)} />
                    <Kreski />
                </article>
            ))}
        </Strona>
    )
}

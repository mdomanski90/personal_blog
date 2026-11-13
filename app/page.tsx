import * as React from 'react'
import { Link } from 'next-view-transitions'
import { nazwy, opowiesci, poziomCzytelnika, kontekstTresci, pozycjeLosowe, wstepStronyGlownej } from '@/lib/archiwum'
import LosowaKarta from './components/LosowaKarta'
import { naHtml } from '@/lib/markdoc'
import { Kreski, Strona, Tresc } from './components/Uklad'
import MetkiWpisu from './components/MetkiWpisu'

export const dynamic = 'force-dynamic'

export default async function StronaGlowna() {
    const poziom = await poziomCzytelnika()
    const kontekst = await kontekstTresci(poziom)
    const wpisy = await opowiesci(poziom)
    const n = await nazwy(poziom)
    const wstep = await wstepStronyGlownej()
    // losowa pozycja z archiwum – także nowo dodane materiały (dawne „ostatnio w archiwum”)
    const losowe = await pozycjeLosowe()
    const start = Math.floor(Math.random() * losowe.length)

    return (
        <Strona>
            {/* opis i losowa karta obok siebie; bez pozycji z opisem opis zajmuje całą szerokość */}
            <div className="grid" style={{ gap: '1.25rem', gridTemplateColumns: losowe.length ? 'repeat(auto-fit, minmax(17rem, 1fr))' : '1fr', alignItems: 'start' }}>
                <div className="flex flex-col" style={{ gap: 10 }}>
                    {wstep.map((a, i) => (
                        <p key={i} className="leading-relaxed" style={{ fontSize: 'var(--blog-font-size, 18px)', margin: 0 }}>{a}</p>
                    ))}
                    <Link href="/o-projekcie" className="w-fit lowercase" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>o projekcie →</Link>
                </div>
                {losowe.length > 0 && <LosowaKarta pozycje={losowe} start={start} />}
            </div>

            <Kreski />

            {wpisy.length === 0 && <p className="text-gray-500 italic lowercase">brak wpisów.</p>}

            {wpisy.map((w) => (
                // id = identyfikator wpisu, więc stare odnośniki „/#identyfikator” nadal przewijają do wpisu
                <article key={w.id} id={w.id} className="flex flex-col scroll-mt-6" style={{ gap: 'calc(1rem * var(--font-scale, 1))' }}>
                    <MetkiWpisu wpis={w} nazwy={n} />
                    <h2 className="font-bold break-words leading-tight" style={{ fontSize: 'calc(1.5rem * var(--font-scale, 1))' }}>
                        <Link href={`/wpisy/${w.id}`} className="!no-underline hover:underline">{w.tytul}</Link>
                    </h2>
                    <Tresc html={naHtml(w.tresc, kontekst)} />
                    <Kreski />
                </article>
            ))}
        </Strona>
    )
}

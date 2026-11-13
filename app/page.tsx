import * as React from 'react'
import { Link } from 'next-view-transitions'
import { nazwy, opowiesci, poziomCzytelnika, kontekstTresci, materialy, tenDzien } from '@/lib/archiwum'
import { naHtml } from '@/lib/markdoc'
import { Kreski, Strona, Tresc } from './components/Uklad'
import MetkiWpisu from './components/MetkiWpisu'
import ListaMaterialow from './components/ListaMaterialow'
import { Sekcja } from './components/Uklad'

export const dynamic = 'force-dynamic'

export default async function StronaGlowna() {
    const poziom = await poziomCzytelnika()
    const kontekst = await kontekstTresci(poziom)
    const wpisy = await opowiesci(poziom)
    const n = await nazwy(poziom)
    // ostatnio dodane materiały (najwyżej 4)
    const nowe = [...(await materialy(poziom))].sort((a, b) => (b.dodano ?? '').localeCompare(a.dodano ?? '')).slice(0, 4)
    // dzisiejsza data w Polsce (serwer może mieć inną strefę)
    const [rok, mies, dz] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-').map(Number)
    const dzis = await tenDzien(poziom, mies, dz)
    const MIES = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']
    const latTemu = (r: number) => { const n = rok - r; return n === 1 ? 'rok temu' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? `${n} lata temu` : `${n} lat temu` }

    return (
        <Strona>
            {/* opis i „ten dzień w historii” obok siebie; w dni bez dat opis zajmuje całą szerokość, na telefonie ramka pod opisem */}
            <div className="grid" style={{ gap: '1.25rem', gridTemplateColumns: dzis.length ? 'repeat(auto-fit, minmax(17rem, 1fr))' : '1fr', alignItems: 'start' }}>
                <div className="flex flex-col" style={{ gap: 10 }}>
                    <p className="leading-relaxed" style={{ fontSize: 'var(--blog-font-size, 18px)', margin: 0 }}>
                        Archiwum wsi wokół Olszanki i Łosic: dokumenty, zdjęcia, nagrania i wspomnienia, ludzie i miejsca, o których pamięta coraz mniej osób.
                    </p>
                    <Link href="/o-projekcie" className="w-fit lowercase" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>o projekcie →</Link>
                </div>
                {dzis.length > 0 && (
                    <aside className="border border-[#d6d1c6] dark:border-[#4b5563] rounded-[8px] flex flex-col" style={{ padding: 14, gap: 10 }}>
                        <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
                            <b className="lowercase" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>ten dzień w historii</b>
                            <span className="text-gray-500" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>{dz} {MIES[mies - 1]}</span>
                        </div>
                        {dzis.map((p) => (
                            <div key={p.href} className="grid" style={{ gridTemplateColumns: '3.4rem minmax(0,1fr)', gap: 10 }}>
                                <span className="font-bold" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>{p.rok}</span>
                                <span className="flex flex-col" style={{ gap: 2 }}>
                                    <Link href={p.href} style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>{p.tytul}</Link>
                                    <span className="text-gray-500" style={{ fontSize: 'calc(12.5px * var(--font-scale, 1))' }}>{p.rodzaj} · {latTemu(p.rok)}</span>
                                </span>
                            </div>
                        ))}
                    </aside>
                )}
            </div>

            <Kreski />

            {nowe.length > 0 && (
                <>
                    <Sekcja tytul="ostatnio w archiwum">
                        <ListaMaterialow materialy={nowe} />
                        <Link href="/archiwum" className="w-fit lowercase font-bold" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>całe archiwum →</Link>
                    </Sekcja>
                    <Kreski />
                </>
            )}

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

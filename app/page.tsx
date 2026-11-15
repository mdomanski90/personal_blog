import * as React from 'react'
import { Link } from 'next-view-transitions'
import { nazwy, opowiesci, poziomCzytelnika, kontekstTresci, pozycjeLosowe, wstepStronyGlownej, type PozycjaLosowa } from '@/lib/archiwum'
import LosowaKarta from './components/LosowaKarta'
import { naHtml } from '@/lib/markdoc'
import { Kreski, Strona, Tresc } from './components/Uklad'
import MetkiWpisu from './components/MetkiWpisu'
import Zgloszenie from './components/Zgloszenie'

export const dynamic = 'force-dynamic'

/** Ile wpisów w pełnej formie na stronie głównej; reszta pod „wszystkie wpisy”. */
const WPISOW_NA_GLOWNEJ = 5
/** Ile pozycji w oknie „z archiwum”: materiał tego tygodnia + wcześniejsze. */
const W_OKNIE = 6

/** Numer tygodnia ISO (poniedziałek–niedziela) – ta sama pozycja przez cały tydzień. */
function tydzien(d: Date): number {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dzien = t.getUTCDay() || 7
    t.setUTCDate(t.getUTCDate() + 4 - dzien)
    const start = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
    return t.getUTCFullYear() * 100 + Math.ceil(((t.getTime() - start.getTime()) / 86400000 + 1) / 7)
}

/** P7A-4: stała kolejność (wg klucza, przetasowana stałym ziarnem), pozycja tygodnia = numer tygodnia modulo liczba. */
function zestawDoOkna(wszystkie: PozycjaLosowa[], teraz = new Date()): PozycjaLosowa[] {
    if (!wszystkie.length) return []
    const l = [...wszystkie].sort((a, b) => a.klucz.localeCompare(b.klucz))
    let ziarno = 20261115
    const los = () => { ziarno = (ziarno * 1103515245 + 12345) % 2147483648; return ziarno / 2147483648 }
    for (let a = l.length - 1; a > 0; a--) { const b = Math.floor(los() * (a + 1)); [l[a], l[b]] = [l[b], l[a]] }
    // tygodnie liczone ciągle (rok*52 + tydzień), żeby przełom roku nie przeskakiwał
    const tw = tydzien(teraz); const ciagly = Math.floor(tw / 100) * 53 + (tw % 100)
    const ile = Math.min(W_OKNIE, l.length)
    return Array.from({ length: ile }, (_, j) => l[(((ciagly - j) % l.length) + l.length) % l.length])
}

export default async function StronaGlowna() {
    const poziom = await poziomCzytelnika()
    const kontekst = await kontekstTresci(poziom)
    const wpisy = await opowiesci(poziom)
    const n = await nazwy(poziom)
    const wstep = await wstepStronyGlownej()
    const doOkna = zestawDoOkna(await pozycjeLosowe())
    const pokazane = wpisy.slice(0, WPISOW_NA_GLOWNEJ)
    const wszystkie = `wszystkie wpisy (${wpisy.length}) →`

    return (
        <Strona>
            {/* wstęp i okno „z archiwum” obok siebie; bez pozycji wstęp zajmuje całą szerokość */}
            <section aria-label="o archiwum" className={`glowna-wstep${doOkna.length ? ' z-oknem' : ''}`}>
                <div className="flex flex-col" style={{ gap: 10 }}>
                    <span className="glowna-etykieta">o archiwum</span>
                    {wstep.map((a, i) => (
                        <p key={i} className="leading-relaxed" style={{ fontSize: 'var(--blog-font-size, 18px)', margin: 0 }}>{a}</p>
                    ))}
                    <span className="flex flex-col" style={{ gap: 4, fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                        <Link href="/o-projekcie" className="odn w-fit">o projekcie →</Link>
                        <a href="#pomoz" className="odn w-fit">jak przekazać zdjęcie lub dokument →</a>
                    </span>
                </div>
                {doOkna.length > 0 && <LosowaKarta pozycje={doOkna} />}
            </section>

            <Kreski />

            <div className="flex flex-wrap items-baseline justify-between" style={{ gap: '4px 16px' }}>
                <h2 className="font-bold lowercase" style={{ fontSize: 'calc(20px * var(--font-scale, 1))' }}>ostatnie wpisy</h2>
                {wpisy.length > pokazane.length && <Link href="/wpisy" className="odn" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>{wszystkie}</Link>}
            </div>

            {wpisy.length === 0 && <p className="text-gray-500 italic lowercase">brak wpisów.</p>}

            {pokazane.map((w) => (
                // id = identyfikator wpisu, więc stare odnośniki „/#identyfikator” nadal przewijają do wpisu
                <article key={w.id} id={w.id} className="flex flex-col scroll-mt-6" style={{ gap: 'calc(1rem * var(--font-scale, 1))' }}>
                    <MetkiWpisu wpis={w} nazwy={n} />
                    <h3 className="font-bold break-words leading-tight" style={{ fontSize: 'calc(1.5rem * var(--font-scale, 1))' }}>
                        <Link href={`/wpisy/${w.id}`} className="!no-underline hover:underline">{w.tytul}</Link>
                    </h3>
                    <Tresc html={naHtml(w.tresc, kontekst)} />
                    <Kreski />
                </article>
            ))}

            {wpisy.length > pokazane.length && (
                <div className="flex justify-end">
                    <Link href="/wpisy" className="przycisk-odn">{wszystkie}</Link>
                </div>
            )}

            {/* zaproszenie do współtworzenia – zgłoszenia trafiają do redakcji, nic nie publikuje się samo */}
            <section id="pomoz" aria-labelledby="pomoz-tytul" className="glowna-pomoz scroll-mt-6">
                <div className="glowna-pomoz-wstep">
                    <h2 id="pomoz-tytul" className="font-bold lowercase">pomóż uzupełnić archiwum</h2>
                    <p>Każde zdjęcie, dokument i wspomnienie z tych wsi coś dopowiada.</p>
                </div>
                <div className="glowna-pomoz-siatka">
                    <div>
                        <p>Masz stare zdjęcie albo dokument z tych wsi?</p>
                        <Zgloszenie rodzaj="material" adres="/" tytul="strona główna – udostępnij materiał" wariant="link" etykieta="udostępnij →"
                            podpowiedz="Co masz (zdjęcie, dokument, list, nagranie)? Odezwę się i umówimy, jak zrobić skan – oryginał zostaje u Ciebie." />
                    </div>
                    <div>
                        <p>Rozpoznajesz kogoś na zdjęciu albo miejsce?</p>
                        <Zgloszenie rodzaj="poprawka" adres="/" tytul="strona główna – rozpoznanie osoby lub miejsca" wariant="link" etykieta="podpowiedz →"
                            podpowiedz="Kogo albo co rozpoznajesz i na którym zdjęciu lub materiale (wklej adres strony albo opisz)?" />
                    </div>
                    <div>
                        <p>Chcesz podzielić się rodzinną historią?</p>
                        <Zgloszenie rodzaj="material" adres="/" tytul="strona główna – wspomnienie" wariant="link" etykieta="opowiedz →"
                            podpowiedz="O czym albo o kim chcesz opowiedzieć? Odezwę się i umówimy rozmowę – na piśmie, przez telefon albo z nagraniem." />
                    </div>
                </div>
            </section>
        </Strona>
    )
}

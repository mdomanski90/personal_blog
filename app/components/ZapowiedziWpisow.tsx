import * as React from 'react'
import { Link } from 'next-view-transitions'
import { kontekstTresci, materialy, nazwy, type Opowiesc, type Widocznosc } from '@/lib/archiwum'
import { zajawka } from '@/lib/markdoc'
import { pozycjaKadru } from '@/lib/kadr'
import { DLUGOSC_ZAPOWIEDZI, adresMiniatury, czyKrotkaZapowiedz } from '@/lib/zapowiedzi'
import MetkiWpisu from './MetkiWpisu'

/**
 * Zapowiedzi wpisów – jeden komponent dla strony głównej i listy /wpisy (uwagi właściciela 16.11, wariant B z canvy „lista wpisów”).
 * Metryczka nad całością; miniatura 300 px z lewej (do 860 px: tytuł → miniatura → tekst); tekst do prawej krawędzi wpisu,
 * w kolumnach z limitem wierszy (CSS); krótka zapowiedź bez kolumn, „czytaj dalej” równo z końcem tekstu.
 * Miniatury tylko z materiałów widocznych dla czytelnika (skan albo plik graficzny).
 */
export default async function ZapowiedziWpisow({ wpisy, poziom, naglowek = 'h3' }: { wpisy: Opowiesc[]; poziom: Widocznosc; naglowek?: 'h2' | 'h3' }) {
    if (!wpisy.length) return <p className="text-[var(--tekst-etykieta)] italic lowercase">brak wpisów.</p>
    const [kontekst, n, lista] = await Promise.all([kontekstTresci(poziom), nazwy(poziom), materialy(poziom)])
    const mats = new Map(lista.map((m) => [m.id, m]))
    const Tytul = naglowek
    return (
        <>
            {wpisy.map((w) => {
                const m = w.miniatura ? mats.get(w.miniatura) : undefined
                const obraz = adresMiniatury(m)
                const tekst = w.zapowiedz || (obraz
                    ? zajawka(w.tresc, DLUGOSC_ZAPOWIEDZI.zObrazem, kontekst.rozwiaz)
                    : zajawka(w.tresc, DLUGOSC_ZAPOWIEDZI.bezObrazu, kontekst.rozwiaz, { akapity: true }))
                const krotka = czyKrotkaZapowiedz(tekst ?? '', !!obraz)
                return (
                    // id = identyfikator wpisu, więc stare odnośniki „/#identyfikator” nadal przewijają do wpisu
                    <article key={w.id} id={w.id} className={`zapowiedz scroll-mt-6${obraz ? ' z-obrazem' : ''}`}>
                        <MetkiWpisu wpis={w} nazwy={n} />
                        <div className="zapowiedz-uklad">
                            {obraz && (
                                <Link href={`/wpisy/${w.id}`} className="zapowiedz-obraz" tabIndex={-1} aria-hidden="true">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={obraz} alt="" loading="lazy" style={/* styl-dynamiczny: kadr miniatury z danych materiału */ { objectPosition: pozycjaKadru(m!.kadr) }} />
                                </Link>
                            )}
                            <div className="zapowiedz-tresc">
                                <Tytul className="zapowiedz-tytul"><Link href={`/wpisy/${w.id}`}>{w.tytul}</Link></Tytul>
                                <div className={`zapowiedz-blok${krotka ? ' krotka' : ''}`}>
                                    {tekst && <p className="zapowiedz-tekst">{tekst}</p>}
                                    <Link href={`/wpisy/${w.id}`} className="zapowiedz-dalej">czytaj dalej <span aria-hidden="true">→</span><span className="sr-only">: {w.tytul}</span></Link>
                                </div>
                            </div>
                        </div>
                    </article>
                )
            })}
        </>
    )
}

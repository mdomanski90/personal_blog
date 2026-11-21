import * as React from 'react'
import { Link } from 'next-view-transitions'
import { kontekstTresci, materialy, nazwy, type Opowiesc, type Widocznosc } from '@/lib/archiwum'
import { zajawka } from '@/lib/markdoc'
import { pozycjaKadru } from '@/lib/kadr'
import { DLUGOSC_ZAPOWIEDZI, adresMiniatury, czyKrotkaZapowiedz } from '@/lib/zapowiedzi'
import MetkiWpisu from './MetkiWpisu'
import CopyLinkButton from './CopyLinkButton'
import { dataWpisu } from './Uklad'
import type { Nowosc } from '@/lib/nowosci'

/**
 * Zapowiedzi wpisów – jeden komponent dla strony głównej i listy /wpisy (uwagi właściciela 16.11, wariant B z canvy „lista wpisów”).
 * Metryczka nad całością; miniatura 300 px z lewej (do 860 px: tytuł → miniatura → tekst); tekst do prawej krawędzi wpisu,
 * w kolumnach z limitem wierszy (CSS); krótka zapowiedź bez kolumn, „czytaj dalej” równo z końcem tekstu.
 * Miniatury tylko z materiałów widocznych dla czytelnika (skan albo plik graficzny).
 */
/** Łatka 21.11: nowa karta (archiwum, leksykon, teren, miejsce) jako zapowiedź wśród wpisów – metryczka „nowe w archiwum · …”, „czytaj dalej” do karty. */
function MetkiNowosci({ x, nazwy }: { x: Nowosc; nazwy: { miejsca: Map<string, string>; tematy: Map<string, string> } }) {
    const odn = [...x.miejsca.filter((id) => nazwy.miejsca.has(id)).map((id) => ({ href: `/miejsca/${id}`, tekst: nazwy.miejsca.get(id)! })),
        ...x.tematy.filter((id) => nazwy.tematy.has(id)).map((id) => ({ href: `/leksykon/${id}`, tekst: nazwy.tematy.get(id)! }))]
    return (
        <div className="metki-wpisu">
            <p className="metki-linia">
                <span>{dataWpisu(x.data)}</span>
                {[x.etykieta, ...x.linia].map((t, i) => <React.Fragment key={i}><span aria-hidden="true"> · </span><span>{t}</span></React.Fragment>)}
                {odn.length > 0 && <span aria-hidden="true"> · </span>}
                {odn.map((o, i) => <React.Fragment key={o.href}>{i > 0 && ', '}<Link href={o.href} className="odn">{o.tekst}</Link></React.Fragment>)}
            </p>
            <CopyLinkButton sciezka={x.href} />
        </div>
    )
}

export default async function ZapowiedziWpisow({ wpisy, poziom, naglowek = 'h3' }: { wpisy: (Opowiesc | Nowosc)[]; poziom: Widocznosc; naglowek?: 'h2' | 'h3' }) {
    if (!wpisy.length) return <p className="text-[var(--tekst-etykieta)] italic lowercase">brak wpisów.</p>
    const [kontekst, n, lista] = await Promise.all([kontekstTresci(poziom), nazwy(poziom), materialy(poziom)])
    const mats = new Map(lista.map((m) => [m.id, m]))
    const Tytul = naglowek
    return (
        <>
            {wpisy.map((w) => {
                if ('typ' in w) {
                    const obraz = adresMiniatury(w.obraz), obrazDuzy = adresMiniatury(w.obraz, 1200)
                    const tekst = obraz ? zajawka(w.opis, DLUGOSC_ZAPOWIEDZI.zObrazem, kontekst.rozwiaz) : zajawka(w.opis, DLUGOSC_ZAPOWIEDZI.bezObrazu, kontekst.rozwiaz, { akapity: true })
                    const krotka = czyKrotkaZapowiedz(tekst, !!obraz)
                    return (
                        <article key={w.klucz} id={`nowe-${w.klucz.replace(':', '-')}`} className={`zapowiedz zapowiedz-nowosc scroll-mt-6${obraz ? ' z-obrazem' : ''}`}>
                            <MetkiNowosci x={w} nazwy={n} />
                            <div className="zapowiedz-uklad">
                                {obraz && (
                                    <Link href={w.href} className="zapowiedz-obraz" tabIndex={-1} aria-hidden="true">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={obraz} srcSet={obrazDuzy && obrazDuzy !== obraz ? `${obraz} 480w, ${obrazDuzy} 1200w` : undefined} sizes="(max-width: 640px) 100vw, 300px" alt="" loading="lazy" decoding="async" style={/* styl-dynamiczny: kadr miniatury z danych karty */ { objectPosition: pozycjaKadru(w.obraz?.kadr ?? 'srodek') }} />
                                    </Link>
                                )}
                                <div className="zapowiedz-tresc">
                                    <Tytul className="zapowiedz-tytul"><Link href={w.href}>{w.tytul}</Link></Tytul>
                                    <div className={`zapowiedz-blok${krotka ? ' krotka' : ''}`}>
                                        {tekst && <p className="zapowiedz-tekst">{tekst}</p>}
                                        <Link href={w.href} className="zapowiedz-dalej">czytaj dalej <span aria-hidden="true">→</span><span className="sr-only">: {w.tytul}</span></Link>
                                    </div>
                                </div>
                            </div>
                        </article>
                    )
                }
                const m = w.miniatura ? mats.get(w.miniatura) : undefined
                const obraz = adresMiniatury(m)
                const obrazDuzy = adresMiniatury(m, 1200)
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
                                    {/* kopia 480, na telefonie (pełna szerokość) i ekranach o podwójnej gęstości 1200 – WebP z listy serwera (20.11) */}
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={obraz} srcSet={obrazDuzy && obrazDuzy !== obraz ? `${obraz} 480w, ${obrazDuzy} 1200w` : undefined} sizes="(max-width: 640px) 100vw, 300px" alt="" loading="lazy" decoding="async" style={/* styl-dynamiczny: kadr miniatury z danych materiału */ { objectPosition: pozycjaKadru(m!.kadr) }} />
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

import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { redirect } from 'next/navigation'
import { parsujNr } from '@/lib/katalog/model'
import { adresNumeru } from '@/lib/katalog/widocznosc'
import { poziomCzytelnika, szukaj } from '@/lib/archiwum'
import { krotszeZapytanie } from '@/lib/szukanie'
import { adresFiltrow, wartosc, type Parametry } from '@/lib/adres-filtrow'
import { stronicuj } from '@/lib/stronicowanie'
import { RODZAJE_FILTRA, RODZINY, filtrZParametru, pasujeDoFiltra, rodzinaRodzaju } from '@/lib/rodziny-wynikow'
import { formaPoLiczbie } from '@/lib/tekst'
import PoleSzukania from '../components/PoleSzukania'
import Komunikat from '../components/Komunikat'
import StronaDzialu, { LicznikWynikow } from '../components/StronaDzialu'
import { NawigacjaStron, PastylkaFiltra, RzadFiltrow, WybraneFiltry } from '../components/Wzorce'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'szukaj · odniepamieci.pl', robots: { index: false } }
const BAZA = '/szukaj'

export default async function Szukaj({ searchParams }: { searchParams: Promise<Parametry> }) {
    const sp = await searchParams
    const q = wartosc(sp.q).slice(0, 100).trim()
    // KAT-04: numer katalogowy (MA-0042, ma-42) – od razu strona pozycji, gdy czytelnik ją widzi; inaczej zwykłe wyszukiwanie
    const nrKat = parsujNr(q)
    const adresKat = nrKat ? await adresNumeru(nrKat, await poziomCzytelnika()) : null
    if (adresKat) redirect(adresKat)
    const wszystkie = q ? await szukaj(q, await poziomCzytelnika()) : []
    const filtr = filtrZParametru(wartosc(sp.rodzaj))
    const wybrane = wszystkie.filter((w) => pasujeDoFiltra(w.rodzaj, filtr))
    const strona = /^\d{1,5}$/.test(wartosc(sp.strona)) ? Number(wartosc(sp.strona)) : 1
    const wyn = stronicuj(wybrane, strona)
    const ile = (r: string) => wszystkie.filter((w) => w.rodzaj === r).length
    const krotsze = q && !wszystkie.length ? krotszeZapytanie(q) : null
    // pastylki: konkretne rodzaje obecne w wynikach (plansza 17.11); legenda kropek – zawsze wszystkie rodziny
    const rodzajeWWynikach = RODZAJE_FILTRA.filter((r) => ile(r.rodzaj) > 0)
    const nazwaFiltra = !filtr ? undefined : 'rodzaj' in filtr
        ? formaPoLiczbie(ile(filtr.rodzaj), RODZAJE_FILTRA.find((r) => r.rodzaj === filtr.rodzaj)!.formy)
        : RODZINY.find((r) => r.id === filtr.rodzina)?.nazwa
    const aktywny = (r: string) => !!filtr && 'rodzaj' in filtr && filtr.rodzaj === r

    return (
        <StronaDzialu
            tytul="szukaj"
            wstep={!q ? <p className="tekst-opis">Wpisz nazwę miejscowości, nazwisko albo temat. Polskie znaki nie są potrzebne, a słowo może być w dowolnej formie – „w Olszance”, „bieżeństwa”.</p> : undefined}
            panel={<>
                <PoleSzukania action={BAZA} defaultValue={q} placeholder="nazwa wsi, nazwisko, temat…" obszar="zmień zapytanie" className="szukaj-pole-strony" />
                {q && wszystkie.length > 0 && (
                    <RzadFiltrow etykieta="rodzaj wyników">
                        <PastylkaFiltra href={adresFiltrow(BAZA, sp, { ustaw: { rodzaj: '' } })} aktywny={!filtr} liczba={wszystkie.length}>wszystko</PastylkaFiltra>
                        {rodzajeWWynikach.map((r) => <PastylkaFiltra key={r.rodzaj} href={adresFiltrow(BAZA, sp, { ustaw: { rodzaj: r.rodzaj } })} aktywny={aktywny(r.rodzaj)} liczba={ile(r.rodzaj)}>{formaPoLiczbie(ile(r.rodzaj), r.formy)}</PastylkaFiltra>)}
                    </RzadFiltrow>
                )}
            </>}
            wybrane={filtr && nazwaFiltra ? <WybraneFiltry wybrane={[{ klucz: 'rodzaj', etykieta: nazwaFiltra, href: adresFiltrow(BAZA, sp, { pomin: ['rodzaj'] }) }]} wyczysc={adresFiltrow(BAZA, sp, { pomin: ['rodzaj'] })} /> : undefined}
            licznik={q && wszystkie.length > 0 ? (
                <div className="szukaj-licznik">
                    <LicznikWynikow fraza={q} liczba={wybrane.length} formy={['wynik', 'wyniki', 'wyników']} strona={wyn.strona} stron={wyn.stron} dodatek="najpierw najlepiej pasujące" />
                    <p className="szukaj-legenda" aria-label="znaczenie kolorowych znaków">
                        {RODZINY.map((r) => <span key={r.id} className="szukaj-legenda-poz"><span className={`szukaj-znak szukaj-znak--${r.id}`} aria-hidden="true" />{r.nazwa}</span>)}
                    </p>
                </div>
            ) : undefined}
            tresc={<>
                {q && !wszystkie.length && (
                    <Komunikat rodzaj="pusto" tytul={`„${q}” – nic nie znaleziono.`}>
                        <ul className="szukaj-wskazowki">
                            {krotsze && <li>spróbuj krótszego zapytania: <Link href={`${BAZA}?q=${encodeURIComponent(krotsze)}`}>{krotsze}</Link></li>}
                            <li>sprawdź pisownię albo wpisz inny wariant nazwy (np. dawną nazwę wsi, nazwisko panieńskie)</li>
                            <li>osoby z drzewa: <Link href={`/osoby?krag=wszystkie&q=${encodeURIComponent(q)}`}>szukaj w dziale osoby</Link> · miejscowości: <Link href="/miejsca">mapa i spis</Link> · księgi metrykalne: <Link href="/biblioteka/ksiegi">spis ksiąg</Link></li>
                            <li>archiwum jest w opracowaniu – brak wyniku nie znaczy, że o tym nic nie ma</li>
                        </ul>
                    </Komunikat>
                )}
                {wyn.wyniki.length > 0 && (
                    <ul className="szukaj-lista">
                        {wyn.wyniki.map((w) => (
                            <li key={`${w.rodzaj}:${w.id}`} className="szukaj-wynik">
                                <div className="szukaj-wynik-gora">
                                    {/* SRCH-D-22 (odbiór P2, decyzja makiet 17.11): rodzaj za tytułem – kropka rodziny + rodzaj szarym drobnym tekstem */}
                                    <Link href={w.adres} className="szukaj-tytul">{w.tytul}</Link>
                                    <span className="szukaj-rodzaj"><span className={`szukaj-znak szukaj-znak--${rodzinaRodzaju(w.rodzaj)}`} aria-hidden="true" />{w.etykieta}</span>
                                </div>
                                {w.przez && <span className="szukaj-przez">powiązane z: {w.przez}</span>}
                                {w.fragment && <p className="szukaj-fragment">{w.fragment}</p>}
                            </li>
                        ))}
                    </ul>
                )}
            </>}
            stronicowanie={<NawigacjaStron strona={wyn.strona} stron={wyn.stron} adres={(n) => adresFiltrow(BAZA, sp, { ustaw: { strona: String(n) } })} etykieta="strony wyników" />}
        />
    )
}

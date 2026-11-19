import type { Metadata } from 'next'
import * as React from 'react'
import { Link } from 'next-view-transitions'
import { zakoduj } from '@/lib/email-ochrona'
import { adresKontaktowy, miejsca } from '@/lib/archiwum'
import { adresFiltrow, wartosc, type Parametry } from '@/lib/adres-filtrow'
import { stronicuj } from '@/lib/stronicowanie'
import { odmiana, porownajPl } from '@/lib/tekst'
import { pozycjaKadru } from '@/lib/kadr'
import { zadania as wczytajZadania } from '@/lib/wspoltworz-dane'
import { jestSiatka, KOLEJNOSC_GRUP, kontekstUzupelnienia, PROBKA, probkaDnia, type Zadanie } from '@/lib/wspoltworz'
import { POMOC, RODZAJE_ZADAN, ZGLOSZENIE_BRAKU, type RodzajFormularza, type RodzajZadania } from '@/lib/wspoltworz-reguly'
import { Strona, TytulStrony } from '../components/Uklad'
import { EtykietaBraku, GrupaZadan, KrokiDzialania, NawigacjaStron, PastylkaFiltra, RzadFiltrow, TytulSekcji } from '../components/Wzorce'
import SiatkaMiniatur from '../components/SiatkaMiniatur'
import Komunikat from '../components/Komunikat'
import Zgloszenie from '../components/Zgloszenie'

/**
 * WSP-01 (etap R) – strona „współtwórz” wg makiety przyjętej 16.11 (plansze „PO v2 · współtwórz”, treść właściciela).
 * Stan w adresie: ?zadanie= (rodzaj zadania) &miejscowosc= &jezyk= &strona= ; formularz: ?uzupelnij=<kolekcja:id:brak> albo ?pomoc=<rodzaj>#napisz.
 * Zadania wyłącznie z danych publicznych (lib/wspoltworz-dane.ts); „uzupełnij” sprawdzane z tą samą listą.
 */
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'współtwórz · odniepamieci.pl' }

const WSTEP = 'Tworzenie archiwum to przedsięwzięcie, które trudno zrealizować w pojedynkę. Chciałbym, aby z czasem stało się ono miejscem gromadzenia i zachowywania wspólnej pamięci o naszej małej ojczyźnie i jej mieszkańcach. Wiele cennych fotografii, dokumentów i wspomnień wciąż kryje się w domowych szufladach, rodzinnych albumach i pamięci starszych pokoleń. Dlatego tak ważna jest dla mnie współpraca. Czasem wystarczy jedno zdjęcie, rozpoznane nazwisko, krótka opowieść czy dopowiedziany szczegół, aby ocalić kolejny fragment lokalnej historii od zapomnienia.'
const KROKI = [
    { tytul: 'Przesłanie zgłoszenia', opis: 'przez formularz albo przyciskiem „uzupełnij” przy pozycji; pliki wysyłane są mailem.' },
    { tytul: 'Weryfikacja', opis: 'sprawdzenie adekwatności przypisania propozycji do konkretnego wpisu.' },
    { tytul: 'Uzupełnienie trafia na stronę', opis: 'z Twoim podpisem w „opracował(a)”, jeśli się zgodzisz.' },
]
const CO_MOZESZ: { pytanie: string; rodzaj: RodzajFormularza; etykieta: string }[] = [
    { pytanie: 'Masz stare zdjęcie, dokument, list albo nagranie?', rodzaj: 'material', etykieta: 'udostępnij →' },
    { pytanie: 'Masz wspomnienie, którym chciałbyś się podzielić?', rodzaj: 'wspomnienie', etykieta: 'opowiedz →' },
    { pytanie: 'Rozpoznajesz osobę, miejsce albo rok na zdjęciu?', rodzaj: 'rozpoznanie', etykieta: 'podpowiedz →' },
    { pytanie: 'Możesz przygotować transkrypcję dokumentu?', rodzaj: 'odczyt', etykieta: 'odczytaj →' },
    { pytanie: 'Znasz kapliczkę, krzyż, mogiłę albo miejsce po młynie, których nie ma na mapie?', rodzaj: 'miejsce', etykieta: 'dodaj do mapy →' },
    { pytanie: 'Widzisz błąd albo wiesz więcej?', rodzaj: 'poprawka', etykieta: 'popraw →' },
]
/** Pastylki miejscowości do tej liczby; więcej – pole wyboru (formularz bez JS). */
const PASTYLEK_MIEJSC = 10

export default async function Wspoltworz({ searchParams }: { searchParams: Promise<Parametry> }) {
    const sp = await searchParams
    const [wszystkie, msc, email] = await Promise.all([wczytajZadania(), miejsca('publiczne'), adresKontaktowy()])
    const nazwy = new Map(msc.map((m) => [m.id, m.nazwa]))
    const zadanieP = wartosc(sp.zadanie) as RodzajZadania
    const rodzaj: RodzajZadania | '' = KOLEJNOSC_GRUP.includes(zadanieP) ? zadanieP : ''
    const miejscowosc = nazwy.has(wartosc(sp.miejscowosc)) ? wartosc(sp.miejscowosc) : ''
    const jezyk = wartosc(sp.jezyk)
    const nrStrony = /^\d{1,4}$/.test(wartosc(sp.strona)) ? Number(wartosc(sp.strona)) : 1
    const uz = kontekstUzupelnienia(wszystkie, wartosc(sp.uzupelnij))
    const pomocP = wartosc(sp.pomoc) as RodzajFormularza
    const pomoc = POMOC.some((p) => p.rodzaj === pomocP) ? pomocP : null

    // filtry: miejscowość i język zawężają liczby rodzajów; rodzaj wybiera grupę
    const poMiejscu = miejscowosc ? wszystkie.filter((z) => z.miejsca.includes(miejscowosc)) : wszystkie
    const jezykiZadan = [...new Set(poMiejscu.flatMap((z) => z.jezyki))].sort(porownajPl)
    const poJezyku = jezyk && jezykiZadan.includes(jezyk) ? poMiejscu.filter((z) => z.jezyki.includes(jezyk)) : poMiejscu
    const wGrupie = (r: RodzajZadania) => poJezyku.filter((z) => z.rodzaj === r).sort((a, b) => porownajPl(a.tytul, b.tytul))
    const miejscaZadan = [...new Set(wszystkie.flatMap((z) => z.miejsca))].filter((id) => nazwy.has(id)).sort((a, b) => porownajPl(nazwy.get(a)!, nazwy.get(b)!))
    const ileW = (id: string) => wszystkie.filter((z) => z.miejsca.includes(id)).length

    const adres = (ustaw: Record<string, string>, pomin: string[] = []) => adresFiltrow('/wspoltworz', sp, { ustaw, pomin: ['uzupelnij', 'pomoc', ...pomin] })
    const uzupelnij = (z: Zadanie) => `${adresFiltrow('/wspoltworz', sp, { ustaw: { uzupelnij: z.klucz, ...(nrStrony > 1 ? { strona: String(nrStrony) } : {}) }, pomin: ['pomoc'] })}#napisz`
    const dodajMiejsce = `${adres({ pomoc: 'miejsce' })}#napisz`

    const przycisk = (z: Zadanie) => <Link href={uzupelnij(z)} className="k-btn k-btn--s lowercase" aria-label={`uzupełnij: ${z.tytul} – ${z.etykieta}`}>uzupełnij</Link>
    const pokazGrupe = (r: RodzajZadania, lista: Zadanie[]) => jestSiatka(r)
        ? <SiatkaMiniatur pozycje={lista.map((z) => ({
            klucz: z.klucz, href: z.href, tytul: z.tytul, linia: z.linia, znak: '▣',
            // eslint-disable-next-line @next/next/no-img-element
            obraz: z.obraz ? <img src={z.obraz} alt="" loading="lazy" decoding="async" style={{ '--kadr': pozycjaKadru(z.kadr ?? 'srodek') } as React.CSSProperties /* styl-dynamiczny: kadr miniatury zapisany w materiale */} /> : undefined,
            dol: <><EtykietaBraku>{z.etykieta}</EtykietaBraku>{przycisk(z)}</>,
        }))} />
        : <ul className="lista-pozycji wsp-lista">
            {lista.map((z) => (
                <li key={z.klucz} className="lista-pozycja wsp-pozycja">
                    <span className="lo-tresc"><Link href={z.href} className="lista-tytul">{z.tytul}</Link>{z.linia && <span className="lista-linia">{z.linia}</span>}</span>
                    <EtykietaBraku>{z.etykieta}</EtykietaBraku>
                    {przycisk(z)}
                </li>
            ))}
        </ul>
    const grupy = rodzaj ? [rodzaj] : KOLEJNOSC_GRUP

    const formRodzaj: RodzajFormularza = uz ? ZGLOSZENIE_BRAKU[uz.zadanie.brak] : pomoc ?? 'material'

    return (
        <Strona uklad="pelna">
            <TytulStrony>współtwórz</TytulStrony>
            <div className="wsp-wstep"><p>{WSTEP}</p></div>

            <section className="sekcja" aria-labelledby="jak-to-dziala">
                <TytulSekcji id="jak-to-dziala">jak to działa</TytulSekcji>
                <KrokiDzialania kroki={KROKI} />
            </section>

            {/* wzorzec sekcji „pomóż” ze strony głównej (JW-04) */}
            <section id="co-mozesz" aria-labelledby="co-mozesz-t" className="glowna-pomoz scroll-mt-6">
                <div className="glowna-pomoz-wstep">
                    <TytulSekcji id="co-mozesz-t">co możesz zrobić</TytulSekcji>
                    <p>Sprawdź, w czym możesz pomóc – formularz otworzy się od razu z właściwym pytaniem.</p>
                </div>
                <div className="glowna-pomoz-siatka">
                    {CO_MOZESZ.map((c) => (
                        <div key={c.rodzaj}><p>{c.pytanie}</p><Link href={`${adres({ pomoc: c.rodzaj })}#napisz`} className="odn">{c.etykieta}</Link></div>
                    ))}
                </div>
            </section>

            <section id="czego-brakuje" className="sekcja wsp-sekcja" aria-labelledby="czego-brakuje-t">
                <TytulSekcji id="czego-brakuje-t">braki wymagające uzupełnienia</TytulSekcji>
                <RzadFiltrow etykieta="rodzaj zadania">
                    <PastylkaFiltra href={adres({}, ['zadanie'])} aktywny={!rodzaj} liczba={poJezyku.length}>wszystkie</PastylkaFiltra>
                    {KOLEJNOSC_GRUP.map((r) => <PastylkaFiltra key={r} href={adres({ zadanie: r })} aktywny={rodzaj === r} liczba={poJezyku.filter((z) => z.rodzaj === r).length}>{RODZAJE_ZADAN[r].filtr}</PastylkaFiltra>)}
                </RzadFiltrow>
                {miejscaZadan.length > 1 && (miejscaZadan.length <= PASTYLEK_MIEJSC
                    ? <RzadFiltrow podpis="miejscowość:">
                        <PastylkaFiltra href={adres({}, ['miejscowosc'])} aktywny={!miejscowosc}>wszystkie miejscowości</PastylkaFiltra>
                        {miejscaZadan.map((id) => <PastylkaFiltra key={id} href={adres({ miejscowosc: id })} aktywny={miejscowosc === id} liczba={ileW(id)}>{nazwy.get(id)}</PastylkaFiltra>)}
                    </RzadFiltrow>
                    : <form method="get" action="/wspoltworz#czego-brakuje" className="filtry-rzad wsp-wybor-miejsca">
                        {rodzaj && <input type="hidden" name="zadanie" value={rodzaj} />}
                        {jezyk && <input type="hidden" name="jezyk" value={jezyk} />}
                        <label className="filtry-podpis" htmlFor="wsp-miejscowosc">miejscowość:</label>
                        <select id="wsp-miejscowosc" name="miejscowosc" defaultValue={miejscowosc} className="k-pole">
                            <option value="">wszystkie miejscowości</option>
                            {miejscaZadan.map((id) => <option key={id} value={id}>{nazwy.get(id)} ({ileW(id)})</option>)}
                        </select>
                        <button type="submit" className="k-btn k-btn--s">pokaż</button>
                    </form>)}
                {jezykiZadan.length > 1 && (
                    <RzadFiltrow podpis="język:">
                        <PastylkaFiltra href={adres({}, ['jezyk'])} aktywny={!jezyk}>wszystkie języki</PastylkaFiltra>
                        {jezykiZadan.map((j) => <PastylkaFiltra key={j} href={adres({ jezyk: j })} aktywny={jezyk === j} liczba={poMiejscu.filter((z) => z.jezyki.includes(j)).length}>{j}</PastylkaFiltra>)}
                    </RzadFiltrow>
                )}

                {grupy.map((r) => {
                    const lista = wGrupie(r)
                    const d = RODZAJE_ZADAN[r]
                    if (!rodzaj) {
                        const probka = probkaDnia(lista, jestSiatka(r) ? PROBKA.siatka : PROBKA.lista).sort((a, b) => porownajPl(a.tytul, b.tytul))
                        return (
                            <GrupaZadan key={r} id={r} tytul={d.nazwa} liczba={lista.length} opis={d.opis}>
                                {lista.length === 0
                                    ? <Komunikat rodzaj="ok" tytul={`gotowe: ${d.gotowe}`}><p>Dziękuję! Nowe pozycje pojawią się tu, gdy w archiwum przybędzie materiałów.</p></Komunikat>
                                    : pokazGrupe(r, probka)}
                                {lista.length > probka.length && <Link href={adres({ zadanie: r })} className="odn w-fit">pokaż wszystkie ({lista.length}) →</Link>}
                                {r === 'mapa' && <p className="wsp-drobne">Nie ma na mapie kapliczki, krzyża albo innego miejsca lub obiektu, które znasz? <Link href={dodajMiejsce} className="odn">dodaj miejsce →</Link></p>}
                            </GrupaZadan>
                        )
                    }
                    const s = stronicuj(lista, nrStrony)
                    return (
                        <GrupaZadan key={r} id={r} tytul={d.nazwa} liczba={lista.length} opis={d.opis}>
                            {lista.length === 0
                                ? <Komunikat rodzaj="ok" tytul={`gotowe: ${d.gotowe}`}><p>Dziękuję! Nowe pozycje pojawią się tu, gdy w archiwum przybędzie materiałów.</p></Komunikat>
                                : <>
                                    <p className="ot-drobne" aria-live="polite">{odmiana(s.razem, ['pozycja', 'pozycje', 'pozycji'])} · strona {s.strona} z {s.stron}</p>
                                    {pokazGrupe(r, s.wyniki)}
                                </>}
                            <NawigacjaStron strona={s.strona} stron={s.stron} adres={(n) => adres({ strona: String(n) })} etykieta={`strony grupy: ${d.nazwa}`} />
                            {r === 'mapa' && <p className="wsp-drobne">Nie ma na mapie kapliczki, krzyża albo innego miejsca lub obiektu, które znasz? <Link href={dodajMiejsce} className="odn">dodaj miejsce →</Link></p>}
                        </GrupaZadan>
                    )
                })}
            </section>

            <section id="napisz" className="sekcja wsp-sekcja scroll-mt-6" aria-labelledby="napisz-t">
                <TytulSekcji id="napisz-t">wyślij zgłoszenie</TytulSekcji>
                <Zgloszenie key={uz?.zadanie.klucz ?? pomoc ?? 'ogolne'} wariant="formularz" rodzaj={formRodzaj}
                    adres={uz ? uz.zadanie.href : '/wspoltworz'} tytul="współtwórz" brak={uz?.zadanie.brak}
                    czegoDotyczy={uz?.czegoDotyczy} zgoda email={email ? zakoduj(`${email.u}@${email.d}`) : undefined} />
            </section>
        </Strona>
    )
}

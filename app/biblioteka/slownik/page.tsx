import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { hasla, miejsca, poziomCzytelnika, RODZAJE_HASEL } from '@/lib/archiwum'
import { adresFiltrow, wartosc } from '@/lib/adres-filtrow'
import { stronicuj } from '@/lib/stronicowanie'
import { ALFABET, adresHasla, filtrujHasla, litery, liczbyRodzajow, skrocZnaczenie } from '@/lib/slownik'
import { TytulDzialu, WstepDzialu } from '@/app/components/WstepDzialu'
import StronaDzialu, { LicznikWynikow } from '../../components/StronaDzialu'
import FiltryKatalogu from '../../components/FiltryKatalogu'
import { NawigacjaStron, PastylkaFiltra, RzadFiltrow, TytulSekcji, WybraneFiltry } from '../../components/Wzorce'
import SiatkaMiniatur from '../../components/SiatkaMiniatur'
import KotwicaHasla from '../../components/KotwicaHasla'
import Komunikat from '../../components/Komunikat'
import SpisBiblioteki from '../SpisBiblioteki'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'słownik · biblioteka · odniepamieci.pl' }
type Parametry = Record<string, string | string[] | undefined>
const BAZA = '/biblioteka/slownik'

/** SLW-01 (P2): słownik jako siatka jednostronnych fiszek; pierwsza fiszka – zaproszenie do zgłaszania haseł. */
export default async function Slownik({ searchParams }: { searchParams: Promise<Parametry> }) {
    const sp = await searchParams
    const poziom = await poziomCzytelnika()
    const [wszystkie, msc] = await Promise.all([hasla(poziom), miejsca(poziom)])
    const q = wartosc(sp.q)
    const rodzaj = wartosc(sp.rodzaj) in RODZAJE_HASEL ? wartosc(sp.rodzaj) : ''
    // łatka P3 (plansza słownika): filtr „miejscowość” – z pola „występowanie” haseł, tylko miejscowości widoczne dla czytelnika
    const zWystepowaniem = new Set(wszystkie.flatMap((h) => h.wystepowanie ?? []))
    const opcjeMiejsc = msc.filter((m) => zWystepowaniem.has(m.id)).map((m) => ({ id: m.id, nazwa: m.nazwa }))
    const miejsce = opcjeMiejsc.some((m) => m.id === wartosc(sp.miejsce)) ? wartosc(sp.miejsce) : ''
    const poRodzaju = filtrujHasla(wszystkie, { q, rodzaj, miejsce })
    const litera = litery(poRodzaju).some((l) => l.litera === wartosc(sp.litera)) ? wartosc(sp.litera) : ''
    const wyn = stronicuj(filtrujHasla(poRodzaju, { litera }), /^\d{1,5}$/.test(wartosc(sp.strona)) ? Number(wartosc(sp.strona)) : 1)
    const liczby = liczbyRodzajow(wszystkie, q)
    const bez = (klucze: string[]) => adresFiltrow(BAZA, sp, { pomin: klucze })
    const wybrane = [
        q && { klucz: 'q', etykieta: `„${q}”`, href: bez(['q']) },
        rodzaj && { klucz: 'rodzaj', etykieta: RODZAJE_HASEL[rodzaj], href: bez(['rodzaj']) },
        miejsce && { klucz: 'miejsce', etykieta: opcjeMiejsc.find((m) => m.id === miejsce)!.nazwa, href: bez(['miejsce']) },
        litera && { klucz: 'litera', etykieta: `litera ${litera}`, href: bez(['litera']) },
    ].filter(Boolean) as { klucz: string; etykieta: string; href: string }[]
    const zaproszenie = {
        href: '/wspoltworz?pomoc=haslo#napisz', podpis: 'zgłoś nowe hasło',
        tekst: 'Znasz dawne słowo, powiedzenie albo nazwę z dokumentów lub z gwary? Zgłoś je z wyjaśnieniem – wspólnie budujemy ten słownik.',
        male: 'trafi do redakcji, opublikujemy z podpisem za Twoją zgodą', akcja: 'zgłoś hasło →',
    }
    return <StronaDzialu
        tytul={<TytulDzialu dzial="slownik" domyslny="słownik" />}
        sciezka={[{ tekst: 'biblioteka', href: '/biblioteka' }]}
        spis={<SpisBiblioteki wybrany="slownik" />}
        wstep={<WstepDzialu dzial="slownik" className="tekst-opis wstep-dzialu-tekst"
            domyslny="Dawne pojęcia, urzędy, miary i słowa z miejscowej gwary, które pojawiają się w dokumentach i wspomnieniach – każde ze źródłem znaczenia." />}
        panel={<FiltryKatalogu adresBazowy={BAZA} tytul="szukaj i filtruj w słowniku" etykietaFrazy="szukaj w hasłach, znaczeniach i formach"
            lata={false} sortowanie={false} poczatkowe={{ q, rodzaj, miejsce }} miejscowosci={opcjeMiejsc.length > 0 ? opcjeMiejsc : undefined}
            dodatek={<RzadFiltrow podpis="rodzaj hasła" etykieta="rodzaj hasła">
                <PastylkaFiltra href={adresFiltrow(BAZA, sp, { ustaw: { rodzaj: '' }, pomin: ['litera'] })} aktywny={!rodzaj} liczba={Object.values(liczby).reduce((a, b) => a + b, 0)}>wszystkie</PastylkaFiltra>
                {Object.entries(RODZAJE_HASEL).map(([id, nazwa]) => <PastylkaFiltra key={id} href={adresFiltrow(BAZA, sp, { ustaw: { rodzaj: id }, pomin: ['litera'] })} aktywny={rodzaj === id} liczba={liczby[id] ?? 0}>{nazwa}</PastylkaFiltra>)}
            </RzadFiltrow>} />}
        wybrane={<WybraneFiltry wybrane={wybrane} wyczysc={bez(['q', 'rodzaj', 'litera', 'miejsce'])} />}
        licznik={<>
            <LicznikWynikow liczba={wyn.razem} formy={['hasło', 'hasła', 'haseł']} strona={wyn.strona} stron={wyn.stron} />
            {/* łatka P3 (plansza): pełny alfabet; litery bez haseł wygaszone; wybrana – ponowny klik zdejmuje filtr */}
            {poRodzaju.length > 0 && <nav aria-label="litera hasła" className="slownik-litery">
                {ALFABET.map((l) => {
                    const ile = litery(poRodzaju).find((x) => x.litera === l)?.ile ?? 0
                    return ile ? <Link key={l} href={litera === l ? bez(['litera']) : adresFiltrow(BAZA, sp, { ustaw: { litera: l } })} className="lista-litera" aria-current={litera === l ? 'true' : undefined} title={`${l}: ${ile}`}>{l}</Link>
                        : <span key={l} className="lista-litera lista-litera--brak" aria-hidden="true">{l}</span>
                })}
            </nav>}
        </>}
        tresc={<><KotwicaHasla ids={wszystkie.map((h) => h.id)} />{wszystkie.length === 0
            ? <>
                <Komunikat rodzaj="pusto" tytul="słownik jest w przygotowaniu – hasła pojawią się po dodaniu w panelu." />
                <SiatkaMiniatur wariant="fiszka" pozycje={[]} zaproszenie={zaproszenie} />
            </>
            : wyn.razem === 0
                ? <Komunikat rodzaj="pusto" tytul="nic nie pasuje do wybranych filtrów.">
                    <p>Brak wyniku nie oznacza, że słowo nie istnieje – słownik jest w opracowaniu.</p>
                    <p className="k-kom-akcje">
                        {wybrane.length > 0 && <Link href={bez(['q', 'rodzaj', 'litera', 'miejsce'])}>wyczyść filtry</Link>}
                        <Link href="/wspoltworz?pomoc=haslo#napisz">zgłoś hasło</Link>
                        <Link href="/szukaj">szukaj w całym serwisie</Link>
                    </p>
                </Komunikat>
                : <><TytulSekcji>{wybrane.length ? 'znalezione hasła' : 'wszystkie hasła'} · {wyn.razem}</TytulSekcji><SiatkaMiniatur wariant="fiszka" zaproszenie={wyn.strona === 1 ? zaproszenie : undefined}
                    pozycje={wyn.wyniki.map((h) => ({ klucz: h.id, href: adresHasla(h.id), tytul: h.haslo, linia: RODZAJE_HASEL[h.rodzaj] ?? h.rodzaj, opis: skrocZnaczenie(h.znaczenie), zrodlo: h.zrodlo }))} /></>}</>}
        stronicowanie={<NawigacjaStron strona={wyn.strona} stron={wyn.stron} adres={(n) => adresFiltrow(BAZA, sp, { ustaw: { strona: String(n) } })} etykieta="strony słownika" />}
    />
}

import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { TytulDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { poziomCzytelnika, ksiegi, parafie, hasla, miejsca } from '@/lib/archiwum'
import { publikacje } from '@/lib/paczka5'
import { pozycjeBiblioteki, filtrujBiblioteke, dzialBiblioteki, DZIALY_BIBLIOTEKI } from '@/lib/biblioteka'
import { odmiana } from '@/lib/tekst'
import { adresFiltrow, wartosc, type Parametry } from '@/lib/adres-filtrow'
import { Strona, TytulStrony } from '../components/Uklad'
import FiltryKatalogu from '../components/FiltryKatalogu'
import { NawigacjaStron, WybraneFiltry } from '../components/Wzorce'
import Komunikat from '../components/Komunikat'
import SpisBiblioteki from './SpisBiblioteki'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'biblioteka · odniepamieci.pl' }

/**
 * Odbiór 16.11: biblioteka działa jak archiwum – tytuł, „szukaj i filtruj w bibliotece”, wstęp, spis działów
 * (dział filtruje listę), licznik, lista pozycji, strony. Te same komponenty co archiwum (FiltryKatalogu, SpisDzialow,
 * WybraneFiltry, NawigacjaStron) i ta sama reguła frazy i stronicowania (lib/biblioteka.ts).
 */
export default async function Biblioteka({ searchParams }: { searchParams: Promise<Parametry> }) {
    const sp = await searchParams
    const poziom = await poziomCzytelnika()
    const [pub, ks, par, has, msc] = await Promise.all([publikacje(poziom), ksiegi(poziom), parafie(), hasla(poziom), miejsca(poziom)])
    const dzial = dzialBiblioteki(wartosc(sp.dzial))
    const f = { q: wartosc(sp.q), dzial: dzial?.klucz ?? '', miejsce: wartosc(sp.miejsce), strona: /^\d{1,5}$/.test(wartosc(sp.strona)) ? Number(wartosc(sp.strona)) : 1 }
    const wyn = filtrujBiblioteke(pozycjeBiblioteki({ publikacje: pub, ksiegi: ks, parafie: par, hasla: has, miejsca: msc }), f)
    const bez = (klucze: string[]) => adresFiltrow('/biblioteka', sp, { pomin: klucze })
    const nazwaMsc = (id: string) => msc.find((m) => m.id === id)?.nazwa ?? id
    const wybrane = [
        f.q && { klucz: 'q', etykieta: `„${f.q}”`, href: bez(['q']) },
        f.miejsce && { klucz: 'miejsce', etykieta: nazwaMsc(f.miejsce), href: bez(['miejsce']) },
    ].filter(Boolean) as { klucz: string; etykieta: string; href: string }[]
    const nazwaPozycji = Object.fromEntries(DZIALY_BIBLIOTEKI.map((d) => [d.klucz, d.pozycja]))
    return (
        <Strona uklad="pelna">
            <TytulStrony><TytulDzialu dzial="biblioteka" domyslny="biblioteka" /></TytulStrony>
            <FiltryKatalogu adresBazowy="/biblioteka" tytul="szukaj i filtruj w bibliotece" etykietaFrazy="szukaj w tytułach, autorach i opisach"
                parametrDzialu="dzial" lata={false} sortowanie={false}
                poczatkowe={{ q: f.q, rodzaj: f.dzial, miejsce: f.miejsce }}
                miejscowosci={msc.map((m) => ({ id: m.id, nazwa: m.nazwa }))} />
            <WybraneFiltry wybrane={wybrane} wyczysc={bez(['q', 'miejsce'])} />
            <p className="tekst-opis wstep-dzialu-tekst">
                <WstepTekst dzial="biblioteka" domyslny={"Książki, artykuły i opracowania o historii Łosic, Olszanki, Międzyrzeca i okolicznych wsi – o unitach, kasacie unii, bieżeństwie i ludziach tego terenu – z opisem, gdzie je znaleźć, i odnośnikami do wersji cyfrowych."} />
            </p>
            <SpisBiblioteki wybrany={f.dzial} sp={sp} zwiniety={false} />
            <p className="ot-drobne" aria-live="polite">
                {odmiana(wyn.razem, ['pozycja', 'pozycje', 'pozycji'])} · strona {wyn.strona} z {wyn.stron}
                {dzial && <> · <Link href={dzial.pelny} className="odn">pełny widok działu „{dzial.nazwa}” →</Link></>}
            </p>
            {wyn.razem === 0
                ? <Komunikat rodzaj="pusto" tytul="nic nie pasuje do wybranych filtrów.">
                    <p>Brak wyniku nie oznacza, że pozycja nie istnieje – biblioteka jest w opracowaniu.</p>
                    <p className="k-kom-akcje">
                        {wybrane.length > 0 && <Link href={bez(['q', 'miejsce'])}>wyczyść filtry</Link>}
                        {dzial && <Link href={bez(['dzial'])}>wszystkie działy</Link>}
                        <Link href="/szukaj">szukaj w całym serwisie</Link>
                    </p>
                </Komunikat>
                : <ul className="lista-pozycji">
                    {wyn.wyniki.map((p) => (
                        <li key={`${p.dzial}:${p.id}`} className="lista-pozycja">
                            <Link href={p.href} className="lista-tytul">{p.tytul}</Link>
                            <span className="lista-linia">{[!dzial && nazwaPozycji[p.dzial], p.linia].filter(Boolean).join(' · ')}</span>
                        </li>
                    ))}
                </ul>}
            <NawigacjaStron strona={wyn.strona} stron={wyn.stron} adres={(n) => adresFiltrow('/biblioteka', sp, { ustaw: { strona: String(n) } })} etykieta="strony biblioteki" />
        </Strona>
    )
}

import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { miejsca, materialy, poziomCzytelnika } from '@/lib/archiwum'
import { wszystkiePlanyDlaCzytelnika } from '@/lib/plany/serwer'
import { wczytajUstawienia } from '@/lib/plany/dane'
import { katalog } from '@/lib/plany/typy'
import { PROG_FILTROW_DOMYSLNY, RODZAJE_PLANU, planyWKolejnosci, rodzajPlanu, type RodzajPlanu } from '@/lib/plany/metadane'
import { adresPlanu, opisPlanu } from '@/lib/plany/katalog'
import { adresFiltrow, wartosc, type Parametry } from '@/lib/adres-filtrow'
import { odmiana } from '@/lib/tekst'
import { Strona, TytulStrony } from '../components/Uklad'
import { PastylkaFiltra, RzadFiltrow } from '../components/Wzorce'
import SiatkaMiniatur from '../components/SiatkaMiniatur'
import MiniaturaPlanu from '../components/plan/MiniaturaPlanu'
import Komunikat from '../components/Komunikat'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'plany i schematy · odniepamieci.pl' }

/**
 * PH-10/14/23: spis „wszystkie plany” – siatka miniatur (wzorzec „siatka”, jak katalog archiwum).
 * ?miejsce=<id> zawęża do miejscowości (odnośnik z karty miejscowości). Pastylki rodzaju i miejscowości – od progu planów (domyślnie 7).
 * Plany w wersji dla czytelnika: miniatury i liczby bez elementów ukrytych.
 */
export default async function SpisPlanow({ searchParams }: { searchParams: Promise<Parametry> }) {
    const sp = await searchParams
    const poziom = await poziomCzytelnika()
    const [plany, u, msc, mat] = await Promise.all([wszystkiePlanyDlaCzytelnika(), wczytajUstawienia(), miejsca(poziom), materialy(poziom)])
    const typy = katalog(u), skany = new Map(mat.map((m) => [m.id, m.strony[0]?.adres])), widoczne = new Set(skany.keys())
    const nazwaMsc = new Map(msc.map((m) => [m.id, m.nazwa]))
    const miejsce = nazwaMsc.has(wartosc(sp.miejsce)) ? wartosc(sp.miejsce) : ''
    const rodzaj = (wartosc(sp.rodzaj) in RODZAJE_PLANU ? wartosc(sp.rodzaj) : '') as RodzajPlanu | ''
    const filtry = plany.length >= (u.progFiltrow ?? PROG_FILTROW_DOMYSLNY)
    const wMiejscu = miejsce ? plany.filter((p) => p.miejsce === miejsce) : plany
    const wynik = planyWKolejnosci(rodzaj ? wMiejscu.filter((p) => rodzajPlanu(p) === rodzaj) : wMiejscu)
    const href = (zmiana: Record<string, string>) => adresFiltrow('/plany', sp, { ustaw: zmiana })
    const miejscaPlanow = [...new Set(plany.map((p) => p.miejsce).filter((x): x is string => !!x && nazwaMsc.has(x)))]
    return (
        <Strona uklad="pelna">
            <TytulStrony sciezka={[{ tekst: 'miejsca', href: '/miejsca' }, ...(miejsce ? [{ tekst: nazwaMsc.get(miejsce)!, href: `/miejsca/${miejsce}` }] : [])]}>
                {miejsce ? `plany i schematy – ${nazwaMsc.get(miejsce)}` : 'plany i schematy'}
            </TytulStrony>
            <p className="tekst-opis wstep-dzialu-tekst">Plany cmentarzy, plany historyczne miejscowości i schematy wsi. Plan odtworzony ze skanu otwiera się na stronie materiału w archiwum – razem z oryginałem.</p>
            {filtry && (
                <>
                    <RzadFiltrow etykieta="rodzaj planu">
                        <PastylkaFiltra href={href({ rodzaj: '' })} aktywny={!rodzaj} liczba={wMiejscu.length}>wszystkie</PastylkaFiltra>
                        {(Object.keys(RODZAJE_PLANU) as RodzajPlanu[]).map((r) => (
                            <PastylkaFiltra key={r} href={href({ rodzaj: r })} aktywny={rodzaj === r} liczba={wMiejscu.filter((p) => rodzajPlanu(p) === r).length}>{RODZAJE_PLANU[r].split(' (')[0]}</PastylkaFiltra>
                        ))}
                    </RzadFiltrow>
                    {miejscaPlanow.length > 1 && (
                        <RzadFiltrow podpis="miejscowość:">
                            <PastylkaFiltra href={href({ miejsce: '' })} aktywny={!miejsce}>wszystkie</PastylkaFiltra>
                            {miejscaPlanow.map((id) => <PastylkaFiltra key={id} href={href({ miejsce: id })} aktywny={miejsce === id} liczba={plany.filter((p) => p.miejsce === id).length}>{nazwaMsc.get(id)}</PastylkaFiltra>)}
                        </RzadFiltrow>
                    )}
                </>
            )}
            <p className="ot-drobne" aria-live="polite">
                {odmiana(wynik.length, ['plan', 'plany', 'planów'])}
                {miejsce && !filtry && <> · <Link href="/plany" className="odn">wszystkie miejscowości</Link></>}
            </p>
            {wynik.length === 0
                ? <Komunikat rodzaj="pusto" tytul="brak planów do pokazania.">
                    <p>Plany są w opracowaniu – część jest jeszcze widoczna tylko dla autora.</p>
                </Komunikat>
                : <SiatkaMiniatur pozycje={wynik.map((p) => {
                    const o = opisPlanu(p, typy)
                    return {
                        klucz: p.slug, href: adresPlanu(p, widoczne), tytul: p.tytul,
                        linia: [o.linia, !miejsce && p.miejsce && nazwaMsc.get(p.miejsce)].filter(Boolean).join(' · '),
                        obraz: <MiniaturaPlanu slug={p.slug} skan={p.zrodlo?.material ? skany.get(p.zrodlo.material) : undefined} />,
                    }
                })} />}
        </Strona>
    )
}

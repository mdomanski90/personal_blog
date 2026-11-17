import type { Metadata } from 'next'
import { ksiegi, miejsca, parafie, poziomCzytelnika } from '@/lib/archiwum'
import { WYZNANIA_PARAFII } from '@/lib/ksiegi'
import { TytulDzialu, WstepDzialu } from '@/app/components/WstepDzialu'
import StronaDzialu from '../../components/StronaDzialu'
import KatalogKsiegiNaZywo from '../../components/KatalogKsiegiNaZywo'
import SpisBiblioteki from '../SpisBiblioteki'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'księgi metrykalne · biblioteka · odniepamieci.pl' }
type Parametry = { searchParams: Promise<{ widok?: string; wyznanie?: string; miejsce?: string; skany?: string; q?: string }> }

export default async function KsiegiMetrykalne({ searchParams }: Parametry) {
    const p = await searchParams
    const poziom = await poziomCzytelnika()
    // Prywatnych ksiąg nie przekazujemy do przeglądarki. Filtrowanie na żywo
    // odbywa się WYŁĄCZNIE na danych wcześniej odfiltrowanych przez serwer.
    const [wszystkieKsiegi, wszystkieParafie, wszystkieMiejsca] = await Promise.all([ksiegi(poziom), parafie(), miejsca(poziom)])
    const parafiePoId = new Map(wszystkieParafie.map((par) => [par.id, par]))
    const wyznaniaObecne = Object.keys(WYZNANIA_PARAFII).filter((w) => wszystkieKsiegi.some((k) =>
        k.wyznania.includes(w) || k.instytucje.some((id) => parafiePoId.get(id)?.wyznanie === w),
    ))
    const wyszukiwanie = typeof p.q === 'string' ? p.q.slice(0, 120) : undefined
    return (
        <StronaDzialu
            tytul={<TytulDzialu dzial="ksiegi" domyslny="księgi metrykalne" />}
            sciezka={[{ tekst: 'biblioteka', href: '/biblioteka' }]}
            spis={<SpisBiblioteki wybrany="ksiegi" />}
            wstep={<WstepDzialu dzial="ksiegi" className="tekst-opis wstep-dzialu-tekst"
                domyslny="Zachowane księgi metrykalne i jednostki archiwalne – także te bez skanów online. Księgi możesz przeglądać według miejscowości albo parafii i urzędu. Te same materiały występują w obu widokach." />}
            tresc={<KatalogKsiegiNaZywo
                key={[p.widok, p.wyznanie, p.miejsce, p.skany, p.q].join('|')}
                ksiegi={wszystkieKsiegi}
                parafie={wszystkieParafie.map((x) => ({ id: x.id, nazwa: x.nazwa, wyznanie: x.wyznanie, siedziba: x.siedziba, czas: x.czas, diecezja: x.diecezja }))}
                miejscowosci={wszystkieMiejsca.map((x) => ({ id: x.id, nazwa: x.nazwa, inneNazwy: x.inneNazwy, formy: x.formy, parafie: x.parafie }))}
                wyznaniaObecne={wyznaniaObecne}
                widokPoczatkowy={p.widok}
                wyznaniePoczatkowe={p.wyznanie}
                skanyPoczatkowe={p.skany === '1'}
                miejscePoczatkowe={p.miejsce}
                frazaPoczatkowa={wyszukiwanie}
            />}
        />
    )
}

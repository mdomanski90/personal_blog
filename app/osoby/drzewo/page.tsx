// PK (uwagi i decyzje właściciela 18.11): „całe drzewo” w układzie przeglądarki planu – aplet do 1600 px: drzewo osoby
// w środku z rodzinami ojca i matki (5 pokoleń w górę i w dół, rodzeństwo), panel z szukaniem i kartą wybranej osoby.
// Osoba w środku z adresu (?od=), domyślnie z połowy najdłuższej linii największego rodu. Tylko osoby widoczne dla czytelnika.
import type { Metadata } from 'next'
import { poziomCzytelnika, widoczne } from '@/lib/archiwum'
import { stanOsob } from '@/lib/osoby/dane'
import { drzewoHtml, rozwinieciaZAdresu } from '@/lib/osoby/drzewo'
import { DOMYSLNE_CALEGO_DRZEWA, parametryDrzewa } from '@/lib/osoby/drzewo-adres'
import { lataZycia, nazwaOsoby, nazwaOsobyKatalog, zdarzenie } from '@/lib/osoby/model'
import { osobaWSrodku, rodyDrzewa } from '@/lib/osoby/rody'
import { normalizuj } from '@/lib/tekst'
import { Strona, TytulStrony } from '../../components/Uklad'
import PrzegladarkaDrzewa, { type OsobaPanelu } from './PrzegladarkaDrzewa'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'całe drzewo · osoby · odniepamieci.pl' }

export default async function CaleDrzewo({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const sp = await searchParams
    const poziom = await poziomCzytelnika()
    const s = await stanOsob()
    const widac = (x: string) => widoczne(s.widocznosc(x), poziom)
    const rody = rodyDrzewa(s.drzewo, widac)
    const od = osobaWSrodku(s.drzewo, rody, widac, sp.od)
    const p = parametryDrzewa(sp, DOMYSLNE_CALEGO_DRZEWA)
    const zakres = sp.rodzenstwo === '0' ? 'malzonkowie' as const : 'rodzenstwo' as const
    const boczni = sp.boczni !== '0'
    // DRZ-12: rozwinięcia z plakietek (?rozwin=g.id,b.id,d.id) – tylko przy rodzinach rodziców
    const html = od ? drzewoHtml(s, od, { ...p, zakres, wTabeli: true, idFigury: 'cale-drzewo', boczni, rozwin: rozwinieciaZAdresu(sp.rozwin) }, poziom) : ''

    // dane panelu i szukania – tylko osoby widoczne dla czytelnika (zasada 1.5)
    const jest = (x: string | undefined): x is string => !!x && s.drzewo.osoby.has(x) && widac(x)
    const opisZd = (o: Parameters<typeof zdarzenie>[0], ...r: Parameters<typeof zdarzenie>[1][]) => {
        const z = zdarzenie(o, ...r)
        return z ? [z.data, z.miejsce?.split(',')[0]].filter(Boolean).join(', ') : ''
    }
    const osoby: OsobaPanelu[] = [...s.drzewo.osoby.values()].filter((x) => widac(x.id)).map((x) => {
        const rel = s.relacje.get(x.id)
        const fr = rel?.rodzice[0]
        const miejsce = zdarzenie(x, 'urodzenie', 'chrzest')?.miejsce?.split(',')[0] ?? ''
        return {
            id: x.id, nazwa: nazwaOsoby(x), katalog: nazwaOsobyKatalog(x), plec: x.plec, lata: lataZycia(x),
            ur: opisZd(x, 'urodzenie', 'chrzest'), zm: opisZd(x, 'zgon', 'pogrzeb'),
            rodzice: fr ? [fr.maz, fr.zona].filter(jest) : [],
            malzonkowie: (rel?.malzenstwa ?? []).map((f) => (f.maz === x.id ? f.zona : f.maz)).filter(jest),
            dzieci: (rel?.malzenstwa ?? []).flatMap((f) => f.dzieci).filter(jest),
            rodzenstwo: fr ? fr.dzieci.filter((c) => c !== x.id).filter(jest) : [],
            szukaj: normalizuj(`${x.imiona} ${x.nazwisko} ${(x.inneNazwiska ?? []).join(' ')} ${lataZycia(x)} ${miejsce}`),
        }
    })
    const o = od ? s.drzewo.osoby.get(od)! : null
    return (
        <Strona uklad="przegladarka">
            <TytulStrony sciezka={[{ tekst: 'osoby', href: '/osoby' }]} obok={[{ tekst: 'osoby', href: '/osoby', przed: true }]}>całe drzewo</TytulStrony>
            <p className="przegladarka-opis">Wszystkie powiązania między osobami w jednym widoku: przodkowie ze strony ojca (po lewej) i matki (po prawej), rodzeństwo rodziców z rodzinami, kuzynostwo, rodzeństwo i potomkowie. Kliknij osobę – jej karta otworzy się w panelu obok; drzewo przesuwasz suwakami albo przeciągając.</p>
            {o && <PrzegladarkaDrzewa key={`${od}-${boczni}-${zakres}-${p.wstecz}-${p.naprzod}`} html={html} osoby={osoby} od={o.id}
                rody={rody.length > 1 ? rody.map((r) => ({ id: r.korzen, nazwa: r.nazwa, osob: r.osob })) : []}
                wstecz={p.wstecz} naprzod={p.naprzod} boczni={boczni} rodzenstwo={zakres === 'rodzenstwo'} />}
        </Strona>
    )
}

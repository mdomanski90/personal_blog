import type { Metadata } from 'next'
import ListaOsob, { type KragNaLiscie, type OsobaNaLiscie } from './ListaOsob'
import { Link } from 'next-view-transitions'
import { biogramy, miejsca, poziomCzytelnika, rozwiazOdnosniki, widoczne } from '@/lib/archiwum'
import { KREGI, kluczMiejsca } from '@/lib/kregi'
import { bezNawiasow } from '@/lib/odnosniki'
import { stanOsob } from '@/lib/osoby/dane'
import { lataZycia, nazwaOsoby, zdarzenie, type Osoba } from '@/lib/osoby/model'
import { normalizuj, odmiana, porownajPl } from '@/lib/tekst'
import { Strona, TytulStrony } from '../components/Uklad'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'osoby · odniepamieci.pl' }

export default async function Osoby({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const sp = await searchParams
    const poziom = await poziomCzytelnika()
    const s = await stanOsob()
    const rozwiaz = await rozwiazOdnosniki(poziom)
    const bio = new Map((await biogramy(poziom)).map((b) => [b.id, { ...b, lead: bezNawiasow(b.lead, rozwiaz) }]))
    const wszystkie = [...s.drzewo.osoby.values()].filter((o) => widoczne(s.widocznosc(o.id), poziom))
    const ukryte = s.drzewo.osoby.size - wszystkie.length
    // kręgi: osoba należy do kręgu, gdy którekolwiek jej zdarzenie (także ślub) miało miejsce w jednej z jego wsi
    const msc = await miejsca('ja')
    const kregi = KREGI.map((k) => {
        const nazwy = new Set(k.miejsca.map(kluczMiejsca))
        return { ...k, nazwy, ids: new Set(msc.filter((m) => nazwy.has(kluczMiejsca(m.nazwa))).map((m) => m.id)) }
    })
    const miejscaOsoby = (o: Osoba) => [...o.zdarzenia, ...(s.relacje.get(o.id)?.malzenstwa ?? []).flatMap((f) => f.zdarzenia)]
    const wKregu = (o: Osoba, k: (typeof kregi)[number]) => miejscaOsoby(o).some((z) => (z.miejsceId && k.ids.has(z.miejsceId)) || (z.miejsce && k.nazwy.has(kluczMiejsca(z.miejsce.split(',')[0]))))
    const krag = sp.krag === 'wszystkie' ? 'wszystkie' : kregi.find((k) => k.id === sp.krag)?.id ?? '1'
    const ileWKregu = Object.fromEntries(kregi.map((k) => [k.id, wszystkie.filter((o) => wKregu(o, k)).length]))
    // cała lista kręgu idzie do przeglądarki – wyszukiwanie zawęża ją na żywo (ListaOsob)
    const lista: OsobaNaLiscie[] = wszystkie
        .filter((o) => krag === 'wszystkie' || wKregu(o, kregi.find((k) => k.id === krag)!))
        .sort((a, b) => porownajPl(a.nazwisko, b.nazwisko) || porownajPl(a.imiona, b.imiona))
        .map((o) => {
            const miejsce = zdarzenie(o, 'urodzenie', 'chrzest')?.miejsce?.split(',')[0] ?? ''
            const b = bio.get(o.id)
            return {
                id: o.id, nazwa: nazwaOsoby(o), plec: o.plec, litera: (o.nazwisko || '?').charAt(0).toLocaleUpperCase('pl'),
                opis: `${o.przydomek ? `„${o.przydomek}” · ` : ''}${lataZycia(o)}${miejsce ? ` · ${miejsce}` : ''}`,
                ...(b ? { biogram: b.lead } : {}),
                szukaj: normalizuj(`${o.imiona} ${o.nazwisko} ${(o.inneNazwiska ?? []).join(' ')} ${(o.inneZapisy ?? []).join(' ')} ${o.przydomek ?? ''} ${lataZycia(o)} ${miejsce} ${b?.lead ?? ''}`),
            }
        })
    const kregiListy: KragNaLiscie[] = [...kregi.map((k) => ({ id: k.id, nazwa: k.nazwa, opis: k.opis, ile: ileWKregu[k.id] })), { id: 'wszystkie', nazwa: 'wszyscy', opis: 'całe drzewo', ile: wszystkie.length }]
    return (
        <Strona>
            <TytulStrony>osoby</TytulStrony>
            <div className="flex flex-col leading-relaxed" style={{ gap: '0.8rem', fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                <p>Ludzie z tych wsi: przodkowie, sąsiedzi, księża, wójtowie – każdy ze swoją stroną, drzewem przodków i potomków oraz dokumentami, które potwierdzają daty i więzi.</p>
                {s.drzewo.osoby.size === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">Ten dział jest w przygotowaniu – osoby pojawią się po wczytaniu drzewa genealogicznego. Dane osób urodzonych w ostatnich 100 latach (i zmarłych w ostatnich 25) będą widoczne tylko dla zalogowanych bliskich.</p>
                ) : (
                    <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                        {odmiana(wszystkie.length, ['osoba', 'osoby', 'osób'])}
                        {ukryte > 0 && poziom === 'publiczne' && <> · dane {odmiana(ukryte, ['osoby', 'osób', 'osób'])} widzą tylko <Link href="/zaloguj?wroc=/osoby">zalogowani bliscy</Link></>}
                    </p>
                )}
            </div>
            {wszystkie.length > 0 && <ListaOsob key={krag} osoby={lista} kregi={kregiListy} krag={krag} poczatek={sp.q ?? ''} />}
        </Strona>
    )
}

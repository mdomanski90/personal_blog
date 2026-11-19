import type { Metadata } from 'next'
import { TytulDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import ListaOsob, { type KragNaLiscie, type OsobaNaLiscie } from './ListaOsob'
import { Link } from 'next-view-transitions'
import { biogramy, miejsca, parafie, poziomCzytelnika, rozwiazOdnosniki, widoczne } from '@/lib/archiwum'
import { wczytajKregi, kluczMiejsca } from '@/lib/kregi'
import { bezNawiasow } from '@/lib/odnosniki'
import { stanOsob } from '@/lib/osoby/dane'
import { fasetyOsoby, filtryZAdresu, opcjeFiltrow, opisOsoby, pasujeDoFiltrow, type FasetyOsoby } from '@/lib/osoby/fasety'
import { lataZycia, nazwaOsobyKatalog, type Osoba } from '@/lib/osoby/model'
import { funkcjeOsoby } from '@/lib/parafie-powiazania'
import { miejscaGrobowOsob } from '@/lib/plany/serwer'
import { naTekst } from '@/lib/markdoc'
import { normalizujDoSzukania, odmiana, porownajPl } from '@/lib/tekst'
import { Strona, TytulStrony } from '../components/Uklad'

export const dynamic = 'force-dynamic'

// nazwiska nieczytelne / nieznane („?”, „.”, „…”) – grupy za ostatnią literą alfabetu (uwaga właściciela 16.11)
const zaLiterami = (nazwisko: string) => (/^\p{L}/u.test(nazwisko.trim()) ? 0 : 1)
export const metadata: Metadata = { title: 'osoby · odniepamieci.pl' }

export default async function Osoby({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const sp = await searchParams
    const poziom = await poziomCzytelnika()
    const s = await stanOsob()
    const rozwiaz = await rozwiazOdnosniki(poziom)
    const bio = new Map((await biogramy(poziom)).map((b) => [b.id, { ...b, lead: bezNawiasow(b.lead, rozwiaz), pelny: bezNawiasow(naTekst(b.tresc), rozwiaz) }]))
    const wszystkie = [...s.drzewo.osoby.values()].filter((o) => widoczne(s.widocznosc(o.id), poziom))
    const ukryte = s.drzewo.osoby.size - wszystkie.length
    // kręgi: osoba należy do kręgu, gdy którekolwiek jej zdarzenie (także ślub) miało miejsce w jednej z jego wsi
    const msc = await miejsca('ja')
    const kregi = (await wczytajKregi()).kregi.map((k) => {
        const nazwy = new Set(k.miejsca.map(kluczMiejsca))
        return { ...k, nazwy, ids: new Set(msc.filter((m) => nazwy.has(kluczMiejsca(m.nazwa))).map((m) => m.id)) }
    })
    const miejscaOsoby = (o: Osoba) => [...o.zdarzenia, ...(s.relacje.get(o.id)?.malzenstwa ?? []).flatMap((f) => f.zdarzenia)]
    const wKregu = (o: Osoba, k: (typeof kregi)[number]) => miejscaOsoby(o).some((z) => (z.miejsceId && k.ids.has(z.miejsceId)) || (z.miejsce && k.nazwy.has(kluczMiejsca(z.miejsce.split(',')[0]))))
    const krag = kregi.find((k) => k.id === sp.krag)?.id ?? 'wszystkie' // decyzja 15.11 (F03): domyślnie wszystkie
    // P6b (PPL-02/03): zajęcie, miejscowość z rodzajem związku, wyznanie – tylko z osób widocznych dla czytelnika
    const filtry = filtryZAdresu(sp)
    const nazwyWidocznych = new Map((await miejsca(poziom)).map((m) => [m.id, m.nazwa]))
    const [instytucje, groby] = await Promise.all([parafie(), miejscaGrobowOsob()])
    const fasety = new Map<string, FasetyOsoby>(wszystkie.map((o) => [o.id, fasetyOsoby(o, {
        zdarzeniaMalzenstw: (s.relacje.get(o.id)?.malzenstwa ?? []).flatMap((f) => f.zdarzenia),
        funkcje: funkcjeOsoby(o.id, instytucje), groby: groby.get(o.id) ?? [], nazwaMiejsca: (id) => nazwyWidocznych.get(id),
    })]))
    const wybranyKrag = kregi.find((k) => k.id === krag)
    const wKreguWybranym = wszystkie.filter((o) => !wybranyKrag || wKregu(o, wybranyKrag))
    const opcje = opcjeFiltrow(wKreguWybranym.map((o) => fasety.get(o.id)!), filtry)
    const poFiltrach = wszystkie.filter((o) => pasujeDoFiltrow(fasety.get(o.id)!, filtry))
    const ileWKregu = Object.fromEntries(kregi.map((k) => [k.id, poFiltrach.filter((o) => wKregu(o, k)).length]))
    // cała lista po filtrach idzie do przeglądarki – wyszukiwanie zawęża ją na żywo (ListaOsob)
    const lista: OsobaNaLiscie[] = poFiltrach
        .filter((o) => !wybranyKrag || wKregu(o, wybranyKrag))
        .sort((a, b) => zaLiterami(a.nazwisko) - zaLiterami(b.nazwisko) || porownajPl(a.nazwisko, b.nazwisko) || porownajPl(a.imiona, b.imiona))
        .map((o) => {
            const f = fasety.get(o.id)!
            const b = bio.get(o.id)
            return {
                id: o.id, nazwa: nazwaOsobyKatalog(o), plec: o.plec, litera: (o.nazwisko || '?').charAt(0).toLocaleUpperCase('pl'),
                opis: opisOsoby(o, f, filtry),
                ...(b ? { biogram: b.lead } : {}),
                // PPL-07: pełny biogram, zajęcia, miejscowości i warianty zapisu (cyrylica ↔ łacinka – ta sama postać w ListaOsob)
                szukaj: normalizujDoSzukania(`${o.imiona} ${o.nazwisko} ${(o.inneNazwiska ?? []).join(' ')} ${(o.inneZapisy ?? []).join(' ')} ${o.przydomek ?? ''} ${lataZycia(o)} ${f.miejsca.map((m) => m.nazwa).join(' ')} ${f.zajecia.map((z) => z.nazwa).join(' ')} ${b?.lead ?? ''} ${b?.pelny ?? ''}`),
            }
        })
    // „wszyscy” jako pierwszy filtr (decyzja 16.11)
    const kregiListy: KragNaLiscie[] = [{ id: 'wszystkie', nazwa: 'wszyscy', opis: 'całe drzewo', ile: poFiltrach.length }, ...kregi.map((k) => ({ id: k.id, nazwa: k.nazwa, opis: k.opis, ile: ileWKregu[k.id] }))]
    const wstep = (
        <div className="wstep-dzialu-tekst">
            <p><WstepTekst dzial="osoby" domyslny={"Ludzie z tych wsi: przodkowie, sąsiedzi, księża, wójtowie – każdy ze swoją stroną, drzewem przodków i potomków oraz dokumentami, które potwierdzają daty i więzi."} /></p>
            {s.drzewo.osoby.size === 0 ? (
                <p className="text-[var(--tekst-opis)]">Ten dział jest w przygotowaniu – osoby pojawią się po wczytaniu drzewa genealogicznego. Dane osób urodzonych w ostatnich 100 latach (i zmarłych w ostatnich 25) będą widoczne tylko dla zalogowanych bliskich.</p>
            ) : (
                <p className="tekst-opis-maly text-[var(--tekst-opis)]">
                    {odmiana(wszystkie.length, ['osoba', 'osoby', 'osób'])}
                    {ukryte > 0 && poziom === 'publiczne' && <> · dane {odmiana(ukryte, ['osoby', 'osób', 'osób'])} widzą tylko <Link href="/zaloguj?wroc=/osoby">zalogowani bliscy</Link></>}
                </p>
            )}
            {/* PK (uwaga 18.11): strona z całym drzewem – potomkowie najstarszej znanej pary */}
            {wszystkie.length > 1 && <p><Link href="/osoby/drzewo" className="k-btn">całe drzewo →</Link></p>}
        </div>
    )
    return (
        <Strona uklad="pelna">
            <TytulStrony><TytulDzialu dzial="osoby" domyslny="osoby" /></TytulStrony>
            {wszystkie.length > 0 ? <ListaOsob key={[krag, ...Object.values(filtry)].join('|')} osoby={lista} kregi={kregiListy} krag={krag} filtry={filtry} opcje={opcje} poczatek={sp.q ?? ''} wstep={wstep} /> : wstep}
        </Strona>
    )
}

import type { Metadata } from 'next'
import PoleSzukania from '../components/PoleSzukania'
import { Link } from 'next-view-transitions'
import { biogramy, miejsca, poziomCzytelnika, rozwiazOdnosniki, widoczne } from '@/lib/archiwum'
import { KREGI, kluczMiejsca } from '@/lib/kregi'
import { bezNawiasow } from '@/lib/odnosniki'
import { stanOsob } from '@/lib/osoby/dane'
import { lataZycia, nazwaOsoby, zdarzenie, type Osoba } from '@/lib/osoby/model'
import { normalizuj, odmiana, porownajPl } from '@/lib/tekst'
import { RAMKA, Strona, TytulStrony } from '../components/Uklad'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'osoby · odniepamieci.pl' }

export default async function Osoby({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const sp = await searchParams
    const q = normalizuj(sp.q ?? '')
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
    const lista = wszystkie
        .filter((o) => krag === 'wszystkie' || wKregu(o, kregi.find((k) => k.id === krag)!))
        .filter((o) => !q || q.split(' ').every((w) => normalizuj(`${o.imiona} ${o.nazwisko} ${(o.inneNazwiska ?? []).join(' ')} ${lataZycia(o)} ${zdarzenie(o, 'urodzenie', 'chrzest')?.miejsce ?? ''} ${bio.get(o.id)?.lead ?? ''}`).includes(w)))
        .sort((a, b) => porownajPl(a.nazwisko, b.nazwisko) || porownajPl(a.imiona, b.imiona))
    const grupy = new Map<string, typeof lista>()
    for (const o of lista) {
        const k = (o.nazwisko || '?').charAt(0).toLocaleUpperCase('pl')
        grupy.set(k, [...(grupy.get(k) ?? []), o])
    }
    return (
        <Strona>
            <TytulStrony>osoby</TytulStrony>
            <div className="flex flex-col leading-relaxed" style={{ gap: '0.8rem', fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                <p>Ludzie z tych wsi: przodkowie, sąsiedzi, księża, wójtowie – każdy ze swoją stroną, drzewem przodków i potomków oraz dokumentami, które potwierdzają daty i więzi.</p>
                {s.drzewo.osoby.size === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">Ten dział jest w przygotowaniu – osoby pojawią się po wczytaniu drzewa genealogicznego. Dane osób żyjących będą widoczne tylko dla bliskich.</p>
                ) : (
                    <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                        {odmiana(wszystkie.length, ['osoba', 'osoby', 'osób'])}
                        {ukryte > 0 && poziom === 'publiczne' && <> · dane {odmiana(ukryte, ['osoby żyjącej', 'osób żyjących', 'osób żyjących'])} widzą tylko <Link href="/zaloguj?wroc=/osoby">zalogowani bliscy</Link></>}
                    </p>
                )}
            </div>
            {wszystkie.length > 0 && (
                <div className="flex flex-col" style={{ gap: 10 }}>
                    <div className="flex flex-wrap items-center" style={{ gap: 8 }} role="group" aria-label="krąg miejscowości">
                        {[...kregi.map((k) => ({ id: k.id, nazwa: k.nazwa, opis: k.opis, ile: ileWKregu[k.id] })), { id: 'wszystkie', nazwa: 'wszyscy', opis: 'całe drzewo', ile: wszystkie.length }].map((k) => (
                            <Link key={k.id} href={`/osoby?krag=${k.id}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ''}`} aria-current={krag === k.id ? 'true' : undefined} className={`osoby-krag ${RAMKA}`} title={k.opis}>
                                <b>{k.nazwa}</b> <span className="text-gray-600 dark:text-gray-400">· {k.opis} · {k.ile}</span>
                            </Link>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <PoleSzukania action="/osoby" defaultValue={sp.q ?? ''} ukryte={{ krag }} placeholder="nazwisko, imię, wieś, rok…" style={{ flex: '1 1 16rem', maxWidth: 480 }} />
                        {q && <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: 13 }}>{odmiana(lista.length, ['wynik', 'wyniki', 'wyników'])}</span>}
                    </div>
                </div>
            )}
            {wszystkie.length > 0 && lista.length === 0 && <p className="text-gray-600 dark:text-gray-400">Nikogo tu nie ma{q ? ' dla tego wyszukiwania' : ''} – spróbuj „wszyscy”.</p>}
            <div className="osoby-litery">
                {[...grupy].map(([litera, os], i) => (
                    <details key={litera} className="osoby-litera" open={!!q || i === 0}>
                        <summary><b>{litera}</b> <span className="text-gray-600 dark:text-gray-400">· {odmiana(os.length, ['osoba', 'osoby', 'osób'])}</span></summary>
                        <ul className="osoby-lista">
                            {os.map((o) => (
                                <li key={o.id}>
                                    <Link href={`/osoby/${o.id}`} className={`osoba-link osoba-${o.plec}`}>{nazwaOsoby(o)}</Link>
                                    <span className="text-gray-600 dark:text-gray-400"> {lataZycia(o)}{zdarzenie(o, 'urodzenie', 'chrzest')?.miejsce ? ` · ${zdarzenie(o, 'urodzenie', 'chrzest')!.miejsce!.split(',')[0]}` : ''}</span>
                                    {bio.has(o.id) && <span className="osoba-biogram"> · {bio.get(o.id)!.lead || 'biogram'}</span>}
                                </li>
                            ))}
                        </ul>
                    </details>
                ))}
            </div>
        </Strona>
    )
}

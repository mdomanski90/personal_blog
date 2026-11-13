import type { Metadata } from 'next'
import PoleSzukania from '../components/PoleSzukania'
import { Link } from 'next-view-transitions'
import { biogramy, poziomCzytelnika, rozwiazOdnosniki, widoczne } from '@/lib/archiwum'
import { bezNawiasow } from '@/lib/odnosniki'
import { stanOsob } from '@/lib/osoby/dane'
import { lataZycia, nazwaOsoby, zdarzenie } from '@/lib/osoby/model'
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
    const lista = wszystkie
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
                <div className="flex flex-wrap gap-2 items-center">
                    <PoleSzukania action="/osoby" defaultValue={sp.q ?? ''} placeholder="nazwisko, imię, wieś, rok…" style={{ flex: '1 1 16rem', maxWidth: 480 }} />
                    {q && <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: 13 }}>{odmiana(lista.length, ['wynik', 'wyniki', 'wyników'])}</span>}
                </div>
            )}
            <div className="flex flex-col" style={{ gap: '1.2rem' }}>
                {[...grupy].map(([litera, os]) => (
                    <section key={litera} className="flex flex-col" style={{ gap: 4 }}>
                        <h2 className="font-bold" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>{litera}</h2>
                        <ul className="osoby-lista">
                            {os.map((o) => (
                                <li key={o.id}>
                                    <Link href={`/osoby/${o.id}`} className={`osoba-link osoba-${o.plec}`}>{nazwaOsoby(o)}</Link>
                                    <span className="text-gray-600 dark:text-gray-400"> {lataZycia(o)}{zdarzenie(o, 'urodzenie', 'chrzest')?.miejsce ? ` · ${zdarzenie(o, 'urodzenie', 'chrzest')!.miejsce!.split(',')[0]}` : ''}</span>
                                    {bio.has(o.id) && <span className="osoba-biogram"> · {bio.get(o.id)!.lead || 'biogram'}</span>}
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </Strona>
    )
}

import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { ksiegi, miejsca, parafie, poziomCzytelnika } from '@/lib/archiwum'
import { WYZNANIA_PARAFII } from '@/lib/ksiegi'
import { formatujEdtf } from '@/lib/edtf'
import { Metki, Sekcja, Strona, TytulStrony, Kreski } from '../../components/Uklad'
import { PasekLat, TabelaKsiag, zakresOsi } from '../../components/Ksiegi'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'księgi metrykalne · biblioteka · odniepamieci.pl' }

type Parametry = { searchParams: Promise<{ wyznanie?: string; miejsce?: string }> }

const lata = (od: number | null, doRoku: number | null) =>
    od == null && doRoku == null ? '' : ` (${od ?? '…'}–${doRoku ?? '…'})`

export default async function KsiegiMetrykalne({ searchParams }: Parametry) {
    const { wyznanie, miejsce } = await searchParams
    const poziom = await poziomCzytelnika()
    const [wszystkieKsiegi, wszystkieParafie, wszystkieMiejsca] = await Promise.all([ksiegi(poziom), parafie(), miejsca(poziom)])

    const wybraneMiejsce = miejsce ? wszystkieMiejsca.find((m) => m.id === miejsce) : null
    const parafieMiejsca = wybraneMiejsce ? new Set(wybraneMiejsce.parafie.map((p) => p.parafia)) : null
    const widoczneParafie = wszystkieParafie
        .filter((p) => !wyznanie || p.wyznanie === wyznanie)
        .filter((p) => !parafieMiejsca || parafieMiejsca.has(p.id))
        .filter((p) => wszystkieKsiegi.some((k) => k.parafia === p.id) || wszystkieMiejsca.some((m) => m.parafie.some((x) => x.parafia === p.id)))
    const os = zakresOsi(wszystkieKsiegi.filter((k) => widoczneParafie.some((p) => p.id === k.parafia)))
    const miejscaZParafiami = wszystkieMiejsca.filter((m) => m.parafie.length > 0)
    const wyznaniaObecne = Object.keys(WYZNANIA_PARAFII).filter((w) => wszystkieParafie.some((p) => p.wyznanie === w))
    const adres = (zmiany: Record<string, string | undefined>) => {
        const q = new URLSearchParams()
        const stan = { wyznanie, miejsce, ...zmiany }
        for (const [k, v] of Object.entries(stan)) if (v) q.set(k, v)
        const s = q.toString()
        return `/biblioteka/ksiegi${s ? `?${s}` : ''}`
    }

    return (
        <Strona>
            <TytulStrony sciezka={[{ tekst: 'biblioteka', href: '/biblioteka' }]}>księgi metrykalne</TytulStrony>
            <p className="leading-relaxed" style={{ fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                Spis ksiąg metrykalnych parafii, do których należały nasze wsie: jakie roczniki się zachowały, gdzie są przechowywane i gdzie obejrzeć skany lub indeksy.
                Pasek pokazuje, z których lat są księgi danego rodzaju.
            </p>

            <div className="flex flex-col" style={{ gap: 10 }}>
                {wyznaniaObecne.length > 1 && (
                    <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
                        <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>wyznanie:</span>
                        <Metki elementy={[
                            { tekst: wyznanie ? 'wszystkie' : <b>wszystkie</b>, href: adres({ wyznanie: undefined }) },
                            ...wyznaniaObecne.map((w) => ({ tekst: w === wyznanie ? <b>{WYZNANIA_PARAFII[w]}</b> : WYZNANIA_PARAFII[w], href: adres({ wyznanie: w }) })),
                        ]} />
                    </div>
                )}
                {miejscaZParafiami.length > 0 && (
                    <form action="/biblioteka/ksiegi" method="get" className="flex flex-wrap items-center" style={{ gap: 10, fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                        {wyznanie && <input type="hidden" name="wyznanie" value={wyznanie} />}
                        <label htmlFor="ks-miejsce" className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>miejscowość:</label>
                        <select id="ks-miejsce" name="miejsce" defaultValue={miejsce ?? ''} className="border border-[#d6d1c6] dark:border-[#4b5563] bg-transparent text-current" style={{ height: 28, borderRadius: 7, padding: '0 8px', fontSize: 'inherit' }}>
                            <option value="">wszystkie</option>
                            {miejscaZParafiami.map((m) => <option key={m.id} value={m.id}>{m.nazwa}</option>)}
                        </select>
                        <button type="submit" className="border border-[#d6d1c6] dark:border-[#4b5563]" style={{ height: 28, borderRadius: 7, padding: '0 10px', fontSize: 'inherit' }}>pokaż</button>
                    </form>
                )}
            </div>

            {widoczneParafie.length === 0 && (
                <p className="text-gray-600 dark:text-gray-400">Spis jest w przygotowaniu – pierwsze parafie i księgi pojawią się wkrótce.</p>
            )}

            {widoczneParafie.map((p, i) => {
                const ks = wszystkieKsiegi.filter((k) => k.parafia === p.id)
                const siedziba = p.siedziba ? wszystkieMiejsca.find((m) => m.id === p.siedziba) : null
                const wsie = wszystkieMiejsca
                    .map((m) => ({ m, w: m.parafie.find((x) => x.parafia === p.id) }))
                    .filter((x) => x.w)
                return (
                    <div key={p.id} className="flex flex-col" style={{ gap: 12 }}>
                        {i > 0 && <Kreski />}
                        <Sekcja tytul={p.nazwa} id={p.id}>
                            <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                                {[
                                    WYZNANIA_PARAFII[p.wyznanie] ?? p.wyznanie,
                                    p.czas && formatujEdtf(p.czas),
                                    p.diecezja,
                                ].filter(Boolean).join(' · ')}
                                {siedziba && <> · siedziba: <Link href={`/miejsca/${siedziba.id}`}>{siedziba.nazwa}</Link></>}
                                {p.sameAs && <> · <a href={p.sameAs} target="_blank" rel="noopener noreferrer">więcej ↗</a></>}
                            </p>
                            {p.opis && <p className="leading-relaxed" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>{p.opis}</p>}
                            {wsie.length > 0 && (
                                <p style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                                    <span className="text-gray-600 dark:text-gray-400">miejscowości: </span>
                                    {wsie.map(({ m, w }, j) => (
                                        <span key={m.id}>{j > 0 && ', '}<Link href={`/miejsca/${m.id}`}>{m.nazwa}</Link>{lata(w!.od, w!.do)}</span>
                                    ))}
                                </p>
                            )}
                            <PasekLat ksiegi={ks} os={os} />
                            {ks.length > 0 ? <TabelaKsiag ksiegi={ks} /> : <p className="text-gray-500" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>księgi tej parafii nie zostały jeszcze opisane.</p>}
                        </Sekcja>
                    </div>
                )
            })}
        </Strona>
    )
}

import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { notFound } from 'next/navigation'
import { biogram, kontekstTresci, miejsca, parafie, poziomCzytelnika, powiazania, widoczne } from '@/lib/archiwum'
import { naHtml } from '@/lib/markdoc'
import { bezNawiasow } from '@/lib/odnosniki'
import { formatujEdtf } from '@/lib/edtf'
import { obrzadekZdarzenia, stanOsob } from '@/lib/osoby/dane'
import { drzewoHtml } from '@/lib/osoby/drzewo'
import { adresAncestry, lataZycia, nazwaOsoby, OBRZADKI, RODZAJE_ZDARZEN, sortujZdarzenia, type Obrzadek, type Zdarzenie } from '@/lib/osoby/model'
import { pochowkiOsoby } from '@/lib/plany/serwer'
import { logowanieWlaczone } from '@/lib/sesja'
import CopyLinkButton from '../../components/CopyLinkButton'
import Zgloszenie from '../../components/Zgloszenie'
import { Kreski, Sekcja, Strona, Tresc, TytulStrony, Wiersz } from '../../components/Uklad'
import Powiazania from '../../components/Powiazania'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params
    const s = await stanOsob()
    const o = s.drzewo.osoby.get(id)
    const poziom = await poziomCzytelnika()
    if (!o || !widoczne(s.widocznosc(id), poziom)) return { title: 'osoba · odniepamieci.pl', robots: { index: false } }
    return { title: `${nazwaOsoby(o)} · osoby · odniepamieci.pl`, robots: s.widocznosc(id) === 'publiczne' ? undefined : { index: false } }
}

function Obrz({ o, wywnioskowany }: { o: Obrzadek; wywnioskowany: boolean }) {
    return (
        <span className="obrzadek" style={{ ['--kolor' as string]: OBRZADKI[o].kolor, opacity: wywnioskowany ? 0.75 : 1 }} title={wywnioskowany ? 'wywnioskowany z wyznania parafii' : undefined}>
            {OBRZADKI[o].nazwa}{wywnioskowany && ' ?'}
        </span>
    )
}

export default async function KartaOsoby({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const poziom = await poziomCzytelnika()
    const s = await stanOsob()
    const o = s.drzewo.osoby.get(id)
    if (!o) notFound()
    if (!widoczne(s.widocznosc(id), poziom)) {
        return (
            <Strona>
                <TytulStrony sciezka={[{ tekst: 'osoby', href: '/osoby' }]}>dane niedostępne</TytulStrony>
                <p>Karta tej osoby jest widoczna tylko dla zalogowanych bliskich (dane osób żyjących nie są publiczne).</p>
                {logowanieWlaczone() && poziom === 'publiczne' && <p><Link href={`/zaloguj?wroc=/osoby/${id}`}>zaloguj się →</Link></p>}
            </Strona>
        )
    }
    const [par, msc, pochowki, bio, siec, kontekst] = await Promise.all([parafie(), miejsca(poziom), pochowkiOsoby(id), biogram(id, poziom), powiazania('osoba', id, poziom), kontekstTresci(poziom)])
    const miejsceId = new Map(msc.map((m) => [m.id, m.nazwa]))
    const rel = s.relacje.get(id) ?? { rodzice: [], malzenstwa: [] }
    const widac = (x?: string) => !!x && s.drzewo.osoby.has(x) && widoczne(s.widocznosc(x), poziom)

    const Osobka = ({ x, rola }: { x?: string; rola?: string }) => {
        if (!x || !s.drzewo.osoby.has(x)) return <span className="text-gray-500">{rola ? `${rola} nieznany` : 'nieznany'}</span>
        if (!widac(x)) return <span className="osoba-ukryta">osoba żyjąca</span>
        const p = s.drzewo.osoby.get(x)!
        return <span><Link href={`/osoby/${p.id}`} className={`osoba-link osoba-${p.plec}`}>{nazwaOsoby(p)}</Link>{lataZycia(p) && <span className="text-gray-600 dark:text-gray-400"> {lataZycia(p)}</span>}</span>
    }
    const Miejsce = ({ z }: { z: Zdarzenie }) => {
        if (z.miejsceId && miejsceId.has(z.miejsceId)) return <Link href={`/miejsca/${z.miejsceId}`}>{z.miejsce?.split(',')[0] || miejsceId.get(z.miejsceId)}</Link>
        return <>{z.miejsce}</>
    }

    // zdarzenia osoby i jej śluby (z rodzin) w jednym porządku
    const sluby = rel.malzenstwa.flatMap((f) => f.zdarzenia.map((z) => ({ z, z_kim: f.maz === id ? f.zona : f.maz })))
    const wszystkie = sortujZdarzenia([...o.zdarzenia, ...sluby.map((x) => x.z)])
    const zKim = new Map(sluby.map((x) => [x.z.id, x.z_kim]))
    const obrzadki = new Map(wszystkie.map((z) => [z.id, obrzadekZdarzenia(z, par)]))
    // przebieg obrządku w ciągu życia
    const przebieg: { o: Obrzadek; z: Zdarzenie; w: boolean }[] = []
    for (const z of wszystkie) {
        const ob = obrzadki.get(z.id)
        if (ob && przebieg[przebieg.length - 1]?.o !== ob.obrzadek) przebieg.push({ o: ob.obrzadek, z, w: ob.wywnioskowany })
    }
    const cytaty = [...(o.cytaty ?? []), ...wszystkie.flatMap((z) => z.cytaty ?? [])]
    const zrodlaUnik = new Map<string, { tytul: string; strony: Set<string>; linki: Set<string> }>()
    for (const c of cytaty) {
        const t = (c.zrodlo && s.drzewo.zrodla.get(c.zrodlo)?.tytul) || 'źródło'
        const w = zrodlaUnik.get(t) ?? { tytul: t, strony: new Set(), linki: new Set() }
        if (c.strona) w.strony.add(c.strona)
        const a = adresAncestry(c.apid)
        if (a) w.linki.add(a)
        if (c.www) w.linki.add(c.www)
        zrodlaUnik.set(t, w)
    }
    const html = drzewoHtml(s, id, { wstecz: 3, naprzod: 2, zakres: 'malzonkowie' }, poziom)
    const tytul = nazwaOsoby(o)
    const rodzenstwo = rel.rodzice.flatMap((f) => f.dzieci).filter((c) => c !== id)

    return (
        <Strona akcje={<CopyLinkButton sciezka={`/osoby/${id}`} />}>
            <TytulStrony sciezka={[{ tekst: 'osoby', href: '/osoby' }]}>{tytul}</TytulStrony>
            {(o.inneNazwiska?.length || lataZycia(o)) ? (
                <p className="text-gray-600 dark:text-gray-400" style={{ marginTop: '-0.6rem' }}>
                    {lataZycia(o)}{o.inneNazwiska?.length ? `${lataZycia(o) ? ' · ' : ''}${o.plec === 'K' ? 'z domu / także' : 'także'}: ${o.inneNazwiska.join(', ')}` : ''}
                </p>
            ) : null}

            {bio?.lead && <p style={{ fontSize: 'var(--blog-font-size, 18px)', lineHeight: 1.6, margin: 0 }}>{bezNawiasow(bio.lead, kontekst.rozwiaz)}</p>}
            {bio?.tresc && <Tresc html={naHtml(bio.tresc, kontekst)} pusta={null} />}

            <Sekcja tytul="życie">
                <div className="flex flex-col">
                    {wszystkie.map((z) => {
                        const ob = obrzadki.get(z.id)
                        return (
                            <Wiersz key={z.id} etykieta={z.rodzaj === 'inne' ? z.nazwa || 'zdarzenie' : RODZAJE_ZDARZEN[z.rodzaj]}>
                                <span className="flex flex-col" style={{ gap: 2 }}>
                                    <span>
                                        {z.data ? formatujEdtf(z.data) : z.dataTekst}
                                        {z.miejsce && <>{(z.data || z.dataTekst) && ', '}<Miejsce z={z} /></>}
                                        {zKim.get(z.id) && <> · z: <Osobka x={zKim.get(z.id)} /></>}
                                        {ob && <> <Obrz o={ob.obrzadek} wywnioskowany={ob.wywnioskowany} /></>}
                                    </span>
                                    {z.chrzestni?.length ? <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: '0.92em' }}>chrzestni: {z.chrzestni.map((c, i) => <span key={i}>{i > 0 && ', '}{c.osoba && s.drzewo.osoby.has(c.osoba) ? <Osobka x={c.osoba} /> : c.tekst}</span>)}</span> : null}
                                    {z.opis && <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: '0.92em', whiteSpace: 'pre-line' }}>{z.opis}</span>}
                                </span>
                            </Wiersz>
                        )
                    })}
                    {pochowki.map((g) => (
                        <Wiersz key={`${g.slug}/${g.elementId}`} etykieta="pochówek">
                            <span><Link href={`/plany/${g.slug}?grob=${encodeURIComponent(g.elementId)}`}>{g.tytul}</Link>{g.numer ? ` – ${g.numer.kwatera ? `kwatera ${g.numer.kwatera}, ` : ''}rząd ${g.numer.rzad}, miejsce ${g.numer.miejsce}` : ''}</span>
                        </Wiersz>
                    ))}
                    {wszystkie.length === 0 && !pochowki.length && <p className="text-gray-500 italic">brak dat i miejsc.</p>}
                </div>
                {przebieg.length > 1 && (
                    <p style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                        obrządek w ciągu życia: {przebieg.map((p, i) => <span key={i}>{i > 0 && ' → '}<Obrz o={p.o} wywnioskowany={p.w} /> <span className="text-gray-600 dark:text-gray-400">({RODZAJE_ZDARZEN[p.z.rodzaj]}{p.z.data ? ` ${formatujEdtf(p.z.data)}` : ''})</span></span>)}
                    </p>
                )}
            </Sekcja>

            <Sekcja tytul="rodzina">
                <div className="flex flex-col">
                    {rel.rodzice.map((f) => (
                        <Wiersz key={f.id} etykieta="rodzice"><span><Osobka x={f.maz} rola="ojciec" /> i <Osobka x={f.zona} rola="matka" /></span></Wiersz>
                    ))}
                    {rodzenstwo.length > 0 && <Wiersz etykieta="rodzeństwo"><span className="flex flex-wrap" style={{ gap: '0 0.8rem' }}>{rodzenstwo.map((c) => <Osobka key={c} x={c} />)}</span></Wiersz>}
                    {rel.malzenstwa.map((f) => {
                        const sp = f.maz === id ? f.zona : f.maz
                        return (
                            <div key={f.id}>
                                {sp && <Wiersz etykieta={o.plec === 'K' ? 'mąż' : o.plec === 'M' ? 'żona' : 'małżonek'}><Osobka x={sp} /></Wiersz>}
                                {f.dzieci.length > 0 && <Wiersz etykieta="dzieci"><span className="flex flex-wrap" style={{ gap: '0 0.8rem' }}>{f.dzieci.map((c) => <Osobka key={c} x={c} />)}</span></Wiersz>}
                            </div>
                        )
                    })}
                    {rel.rodzice.length + rel.malzenstwa.length === 0 && <p className="text-gray-500 italic">rodzina nie została jeszcze wpisana.</p>}
                </div>
            </Sekcja>

            {html && (
                <Sekcja tytul="drzewo">
                    <div dangerouslySetInnerHTML={{ __html: html }} />
                </Sekcja>
            )}

            {o.notatki && poziom !== 'publiczne' && (
                <Sekcja tytul="notatki">
                    <p style={{ whiteSpace: 'pre-line' }}>{o.notatki}</p>
                </Sekcja>
            )}

            {zrodlaUnik.size > 0 && (
                <Sekcja tytul="źródła">
                    <ul className="flex flex-col" style={{ gap: 6, fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                        {[...zrodlaUnik.values()].map((z) => (
                            <li key={z.tytul}>
                                {z.tytul}
                                {z.strony.size > 0 && <span className="text-gray-600 dark:text-gray-400"> – {[...z.strony].join('; ')}</span>}
                                {[...z.linki].map((l, i) => <span key={l}> · <a href={l} target="_blank" rel="noreferrer">{l.includes('ancestry.com') ? 'rekord w Ancestry' : `link ${i + 1}`} ↗</a></span>)}
                            </li>
                        ))}
                    </ul>
                </Sekcja>
            )}

            {(siec.odnosniki.length > 0 || siec.wzmianki.length > 0) && <Kreski />}
            <Powiazania dane={siec} />

            <Zgloszenie rodzaj="poprawka" adres={`/osoby/${id}`} tytul={tytul} />
        </Strona>
    )
}

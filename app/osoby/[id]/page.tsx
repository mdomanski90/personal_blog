import * as React from 'react'
import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { notFound } from 'next/navigation'
import { biogram, kontekstTresci, miejsca, parafie, poziomCzytelnika, powiazania, widoczne } from '@/lib/archiwum'
import { naHtml } from '@/lib/markdoc'
import { bezNawiasow } from '@/lib/odnosniki'
import { formatujEdtf } from '@/lib/edtf'
import { obrzadekZdarzenia, stanOsob } from '@/lib/osoby/dane'
import { drzewoHtml } from '@/lib/osoby/drzewo'
import { adresAncestry, lataZycia, nazwaOsoby, OBRZADKI, RODZAJE_ZDARZEN, sortujZdarzenia, type Cytat, type Obrzadek, type Zdarzenie } from '@/lib/osoby/model'
import { odmiana } from '@/lib/tekst'
import { pochowkiOsoby } from '@/lib/plany/serwer'
import { logowanieWlaczone } from '@/lib/sesja'
import CopyLinkButton from '../../components/CopyLinkButton'
import Zgloszenie from '../../components/Zgloszenie'
import { Strona, Tresc, TytulStrony } from '../../components/Uklad'
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

// Karta osoby jako jedna tabela: wiersze-nagłówki z tłem (życie, rodzina, drzewo, źródła, w archiwum i wpisach),
// w każdym wierszu etykieta w kolumnie 150 px i treść – drzewo też jest wierszem tej tabeli.
function Naglowek({ tytul, id, children }: { tytul: string; id?: string; children?: React.ReactNode }) {
    return (
        <div role="row" className="ot-nagl" id={id}>
            <b role="columnheader">{tytul}</b>
            {children && <span className="ot-nagl-prawa">{children}</span>}
        </div>
    )
}
function W({ e, children }: { e: string; children: React.ReactNode }) {
    return (
        <div role="row" className="ot-w">
            <span role="rowheader" className="ot-e">{e}</span>
            <span role="cell" className="ot-t">{children}</span>
        </div>
    )
}

const RODZAJ_POWIAZANIA: Record<string, string> = { wpis: 'wpis', miejsce: 'miejsce', temat: 'temat', obiekt: 'obiekt', material: 'materiał', osoba: 'biogram' }

export default async function KartaOsoby({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ wstecz?: string }> }) {
    const { id } = await params
    const sp = await searchParams
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
    const etykietaZdarzenia = (z: Zdarzenie) => (z.rodzaj === 'inne' ? z.nazwa || 'zdarzenie' : RODZAJE_ZDARZEN[z.rodzaj])
    // źródła przy zdarzeniach, których dotyczą (te same źródło i strony – raz)
    const zrodlaZ = (cytaty: Cytat[]) => {
        const m = new Map<string, { tytul: string; strony: Set<string>; linki: Set<string> }>()
        for (const c of cytaty) {
            const t = (c.zrodlo && s.drzewo.zrodla.get(c.zrodlo)?.tytul) || 'źródło'
            const w = m.get(t) ?? { tytul: t, strony: new Set(), linki: new Set() }
            if (c.strona) w.strony.add(c.strona)
            const a = adresAncestry(c.apid)
            if (a) w.linki.add(a)
            if (c.www) w.linki.add(c.www)
            m.set(t, w)
        }
        return [...m.values()]
    }
    const wierszeZrodel = [
        ...wszystkie.filter((z) => z.cytaty?.length).map((z) => ({ e: etykietaZdarzenia(z), z: zrodlaZ(z.cytaty!) })),
        ...(o.cytaty?.length ? [{ e: 'osoba', z: zrodlaZ(o.cytaty) }] : []),
    ]
    const wstecz = sp.wstecz === '1' || sp.wstecz === '3' ? Number(sp.wstecz) : 2
    const html = drzewoHtml(s, id, { wstecz, naprzod: 2, zakres: 'malzonkowie', wTabeli: true, idFigury: 'drzewo-osoby' }, poziom)
    const tytul = nazwaOsoby(o)
    const rodzenstwo = rel.rodzice.flatMap((f) => f.dzieci).filter((c) => c !== id)
    const ileDzieci = rel.malzenstwa.reduce((a, f) => a + f.dzieci.length, 0)
    const etMalz = o.plec === 'K' ? 'mąż' : o.plec === 'M' ? 'żona' : 'małżonek'
    const podsumowanieRodziny = [
        rel.rodzice.length ? 'rodzice' : '',
        rodzenstwo.length ? odmiana(rodzenstwo.length, ['rodzeństwo', 'rodzeństwa', 'rodzeństwa']).replace(/^1 rodzeństwo$/, 'brat lub siostra') : '',
        rel.malzenstwa.length ? (rel.malzenstwa.length > 1 ? `${rel.malzenstwa.length} małżeństwa` : etMalz) : '',
        ileDzieci ? odmiana(ileDzieci, ['dziecko', 'dzieci', 'dzieci']) : '',
    ].filter(Boolean).join(' · ')
    const podpisPortretu = o.portret && [o.portret.podpis, o.portret.zrodlo && `źródło: ${o.portret.zrodlo}`].filter(Boolean).join(' · ')

    return (
        <Strona akcje={<CopyLinkButton sciezka={`/osoby/${id}`} />}>
            <p className="text-gray-600 dark:text-gray-400 lowercase" style={{ fontSize: 'calc(13px * var(--font-scale, 1))', margin: 0 }}>
                <Link href="/osoby" className="!no-underline hover:underline">osoby</Link> /
            </p>
            {/* karta osoby: zdjęcie | imię i nazwisko, lata, z domu, opis */}
            <div className="osoba-karta z-portretem">
                {o.portret ? (
                    <figure className="osoba-portret">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/pliki/osoby/${id}/${o.portret.plik}?w=480`} alt={`${tytul}${o.portret.podpis ? ` – ${o.portret.podpis}` : ''}`} />
                        {podpisPortretu && <figcaption>{podpisPortretu}</figcaption>}
                    </figure>
                ) : (
                    // bez zdjęcia: puste pole z prośbą – może ktoś z rodziny ma fotografię
                    <div className="osoba-bez-zdjecia">
                        <span className="osoba-bez-zdjecia-napis">brak zdjęcia</span>
                        <span className="osoba-bez-zdjecia-prosba">Masz zdjęcie tej osoby i chcesz je udostępnić?</span>
                        <Zgloszenie rodzaj="material" adres={`/osoby/${id}`} tytul={`zdjęcie: ${tytul}`} etykieta="skontaktuj się" podpowiedz="Jakie to zdjęcie (kto na nim jest, z którego mniej więcej roku, skąd pochodzi)? Odezwę się i umówimy, jak je przekazać – oryginał zostaje u Ciebie." />
                    </div>
                )}
                <div className="osoba-karta-opis">
                    <h1 className="font-bold break-words leading-tight" style={{ fontSize: 'calc(1.75rem * var(--font-scale, 1))', margin: 0 }}>{tytul}</h1>
                    {(lataZycia(o) || o.inneNazwiska?.length || o.przydomek) ? (
                        <p className="text-gray-600 dark:text-gray-400" style={{ margin: 0 }}>
                            {[
                                lataZycia(o),
                                o.przydomek && `${o.plec === 'K' ? 'zwana' : o.plec === 'M' ? 'zwany' : 'zwany(-a)'} „${o.przydomek}”`,
                                o.inneNazwiska?.length && `${o.plec === 'K' ? 'z domu / także' : 'także'}: ${o.inneNazwiska.join(', ')}`,
                            ].filter(Boolean).join(' · ')}
                        </p>
                    ) : null}
                    {o.inneZapisy?.length ? <p className="text-gray-600 dark:text-gray-400" style={{ margin: 0, fontSize: 'calc(14px * var(--font-scale, 1))' }}>w źródłach także: {o.inneZapisy.join(' · ')}</p> : null}
                    {bio?.lead && <p className="osoba-lead">{bezNawiasow(bio.lead, kontekst.rozwiaz)}</p>}
                    {bio?.tresc && <Tresc html={naHtml(bio.tresc, kontekst)} pusta={null} />}
                </div>
            </div>

            <div role="table" aria-label={`${tytul} – dane`} className="osoba-tabela">
                <Naglowek tytul="życie">
                    {przebieg.length > 1 && <>obrządek {przebieg.map((p, i) => <span key={i}>{i > 0 && ' → '}<Obrz o={p.o} wywnioskowany={p.w} /></span>)}</>}
                </Naglowek>
                {wszystkie.map((z) => {
                    const ob = obrzadki.get(z.id)
                    return (
                        <W key={z.id} e={etykietaZdarzenia(z)}>
                            <span className="flex flex-col" style={{ gap: 2 }}>
                                <span>
                                    {z.data ? formatujEdtf(z.data) : z.dataTekst}
                                    {z.miejsce && <>{(z.data || z.dataTekst) && ', '}<Miejsce z={z} /></>}
                                    {zKim.get(z.id) && <> · z: <Osobka x={zKim.get(z.id)} /></>}
                                    {ob && <> <Obrz o={ob.obrzadek} wywnioskowany={ob.wywnioskowany} /></>}
                                </span>
                                {z.chrzestni?.length ? <span className="ot-drobne">chrzestni: {z.chrzestni.map((c, i) => <span key={i}>{i > 0 && ', '}{c.osoba && s.drzewo.osoby.has(c.osoba) ? <Osobka x={c.osoba} /> : c.tekst}</span>)}</span> : null}
                                {z.opis && <span className="ot-drobne" style={{ whiteSpace: 'pre-line' }}>{z.opis}</span>}
                            </span>
                        </W>
                    )
                })}
                {pochowki.map((g) => (
                    <W key={`${g.slug}/${g.elementId}`} e="grób">
                        <span className="ot-grob">
                            <span className="flex flex-col" style={{ gap: 4 }}>
                                <Link href={`/plany/${g.slug}?grob=${encodeURIComponent(g.elementId)}`}>{g.tytul}</Link>
                                <span className="ot-drobne">{g.numer ? `${g.numer.kwatera ? `kwatera ${g.numer.kwatera}, ` : ''}rząd ${g.numer.rzad}, miejsce ${g.numer.miejsce} · ` : ''}<Link href={`/plany/${g.slug}?grob=${encodeURIComponent(g.elementId)}`}>pokaż na planie →</Link></span>
                            </span>
                            {g.zdjecie && (
                                <Link href={`/plany/${g.slug}?grob=${encodeURIComponent(g.elementId)}`} title="zdjęcie grobu – pokaż na planie">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={g.zdjecie} alt={`grób: ${tytul}`} loading="lazy" />
                                </Link>
                            )}
                        </span>
                    </W>
                ))}
                {wszystkie.length === 0 && !pochowki.length && <W e="—"><span className="text-gray-500">brak dat i miejsc</span></W>}

                <Naglowek tytul="rodzina">{podsumowanieRodziny}</Naglowek>
                {rel.rodzice.map((f) => (
                    <W key={f.id} e="rodzice"><span className="ot-osoby"><Osobka x={f.maz} rola="ojciec" /><Osobka x={f.zona} rola="matka" /></span></W>
                ))}
                {rodzenstwo.length > 0 && <W e="rodzeństwo"><span className="ot-osoby">{rodzenstwo.map((c) => <Osobka key={c} x={c} />)}</span></W>}
                {rel.malzenstwa.map((f, i) => {
                    const mz = f.maz === id ? f.zona : f.maz
                    const nr = rel.malzenstwa.length > 1 ? ` (${i + 1}°)` : ''
                    const slub = f.zdarzenia.find((z) => z.rodzaj === 'slub' && z.data)?.data
                    return (
                        <React.Fragment key={f.id}>
                            {mz && <W e={`${etMalz}${nr}`}><span><Osobka x={mz} />{slub && <span className="text-gray-600 dark:text-gray-400"> · ślub {formatujEdtf(slub)}</span>}</span></W>}
                            {f.dzieci.length > 0 && <W e={`dzieci${nr}`}><span className="ot-osoby">{f.dzieci.map((c) => <Osobka key={c} x={c} />)}</span></W>}
                        </React.Fragment>
                    )
                })}
                {rel.rodzice.length + rel.malzenstwa.length === 0 && <W e="—"><span className="text-gray-500">rodzina nie została jeszcze wpisana</span></W>}

                {html && (
                    <>
                        <Naglowek tytul="drzewo" id="drzewo">
                            <span className="ot-seg" role="group" aria-label="pokolenia w górę">
                                <span className="ot-seg-podpis">pokolenia w górę</span>
                                {[1, 2, 3].map((n) => <Link key={n} href={`/osoby/${id}?wstecz=${n}#drzewo`} aria-current={wstecz === n ? 'true' : undefined} scroll={false}>{n}</Link>)}
                            </span>
                            <button type="button" className="ot-przycisk" data-drzewo-pelny="drzewo-osoby">pełny ekran ⤢</button>
                        </Naglowek>
                        <div role="row" className="ot-drzewo" dangerouslySetInnerHTML={{ __html: html }} />
                    </>
                )}

                {o.notatki && poziom !== 'publiczne' && (
                    <>
                        <Naglowek tytul="notatki">tylko dla zalogowanych</Naglowek>
                        <W e="notatki"><span style={{ whiteSpace: 'pre-line' }}>{o.notatki}</span></W>
                    </>
                )}

                {wierszeZrodel.length > 0 && (
                    <>
                        <Naglowek tytul="źródła">{odmiana(new Set(wierszeZrodel.flatMap((w) => w.z.map((x) => x.tytul))).size, ['źródło', 'źródła', 'źródeł'])}</Naglowek>
                        {wierszeZrodel.map((w, i) => (
                            <W key={i} e={w.e}>
                                <span className="flex flex-col" style={{ gap: 2 }}>
                                    {w.z.map((z) => (
                                        <span key={z.tytul}>
                                            {z.tytul}
                                            {z.strony.size > 0 && <span className="text-gray-600 dark:text-gray-400"> – {[...z.strony].join('; ')}</span>}
                                            {[...z.linki].map((l, j) => <span key={l}> · <a href={l} target="_blank" rel="noreferrer">{l.includes('ancestry.com') ? 'rekord w Ancestry' : `link ${j + 1}`} ↗</a></span>)}
                                        </span>
                                    ))}
                                </span>
                            </W>
                        ))}
                    </>
                )}

                {siec.odnosniki.length > 0 && (
                    <>
                        <Naglowek tytul="w archiwum i wpisach">{siec.odnosniki.length}</Naglowek>
                        {siec.odnosniki.map((z) => (
                            <W key={`${z.zrodlo.rodzaj}:${z.zrodlo.id}`} e={RODZAJ_POWIAZANIA[z.zrodlo.rodzaj] ?? z.zrodlo.rodzaj}>
                                <span>
                                    <Link href={z.zrodlo.adres}>{z.zrodlo.nazwa}</Link>
                                    {z.fragmenty[0] && <span className="ot-drobne"> · „…{z.fragmenty[0].przed.slice(-60)}<mark className="powiazanie-odnosnik">{z.fragmenty[0].trafienie}</mark>{z.fragmenty[0].po.slice(0, 60)}…”</span>}
                                </span>
                            </W>
                        ))}
                    </>
                )}
            </div>

            <Powiazania dane={{ odnosniki: [], wzmianki: siec.wzmianki }} />

            <Zgloszenie rodzaj="poprawka" adres={`/osoby/${id}`} tytul={tytul} />
        </Strona>
    )
}

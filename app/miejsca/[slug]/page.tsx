import type { Metadata } from 'next'
import OtworzWMapach from '../../components/OtworzWMapach'
import { notFound } from 'next/navigation'
import { Link } from 'next-view-transitions'
import { licznikiMiejsc, materialy, miejsca, miejsce, obiekty, obiektyDlaMiejsca, OBSZARY, opowiesciDlaMiejsca, poziomCzytelnika, RODZAJE_MIEJSC, RODZAJE_OBIEKTOW, tematyDlaMiejsca, opisWyznan, materialyDla, powiazania, kontekstTresci, ksiegiDlaMiejsca, parafie } from '@/lib/archiwum'
import { WYZNANIA_PARAFII } from '@/lib/ksiegi'
import { punktyMapy } from '@/lib/punkty-mapy'
import { dolaczPlany, planyNaMape } from '@/lib/plany/serwer'
import { tarczaObiektu } from '@/lib/tarcze'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml, zajawka } from '@/lib/markdoc'
import { Strona, Tresc, maTekst } from '../../components/Uklad'
import { Czesc, KrotkieMaterialy, KrotkieWpisy, LiniaKarty, NaglowekKarty, Tabela, W, WCaly, ZAdresami, Zrodla, ZglosPoprawke } from '../../components/Karta'
import MapaKarty from '../../components/MapaKarty'
import Zgloszenie from '../../components/Zgloszenie'
import MapaMiejscLeniwa from '../../components/MapaMiejscLeniwa'
import CopyLinkButton from '../../components/CopyLinkButton'
import Powiazania from '../../components/Powiazania'
import { TabelaKsiag } from '../../components/Ksiegi'
import ListaPlanow from '../../components/plan/ListaPlanow'
import { planyDlaCzytelnika } from '@/lib/plany/serwer'

export const dynamic = 'force-dynamic'

type Parametry = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Parametry): Promise<Metadata> {
    const { slug } = await params
    const m = await miejsce(slug, await poziomCzytelnika())
    return { title: m ? `${m.nazwa} · miejsca · odniepamieci.pl` : 'odniepamieci.pl' }
}

export default async function MiejsceStrona({ params }: Parametry) {
    const { slug } = await params
    const poziom = await poziomCzytelnika()
    const m = await miejsce(slug, poziom)
    if (!m) notFound()

    const wszystkie = await miejsca(poziom)
    const nadrzedne = m.nalezyDo ? wszystkie.find((x) => x.id === m.nalezyDo) : null
    const podrzedne = wszystkie.filter((x) => x.nalezyDo === m.id)
    const tematy = await tematyDlaMiejsca(m.id, poziom)
    const zData = tematy.filter((t) => t.czas)
    const bezDaty = tematy.filter((t) => !t.czas)
    const opow = await opowiesciDlaMiejsca(m.id, poziom)
    const opisHtml = naHtml(m.opis, await kontekstTresci(poziom))
    const swiatynie = await obiektyDlaMiejsca(m.id, poziom)
    const punkty = m.wspolrzedne || m.rodzaj === 'gmina' ? await dolaczPlany(punktyMapy(wszystkie, await obiekty(poziom))) : []
    const planyGeo = await planyNaMape()
    const obszar = OBSZARY.includes(m.rodzaj)
    const siec = await powiazania('miejsce', m.id, poziom)
    const mat = await materialyDla('miejsce', m.id, poziom)
    const ksiegiWsi = await ksiegiDlaMiejsca(m, poziom)
    const planyWsi = await planyDlaCzytelnika('miejsce', m.id)
    const wszystkieParafie = await parafie()
    // gmina: najbliższy nadrzędny obszar typu „gmina”
    let gmina = nadrzedne
    while (gmina && gmina.rodzaj !== 'gmina') gmina = gmina.nalezyDo ? wszystkie.find((x) => x.id === gmina!.nalezyDo) ?? null : null
    // formy zapisu nazwy: bez form z przyimkiem („w Olszance”), które służą tylko wyszukiwarce
    const formyZapisu = m.inneNazwy.filter((n) => !/^(w|we|na|z|ze|do|od)\s/i.test(n))
    const zrodlo = m.zrodloOpisu

    // ścieżka: miejsca / ziemia / gmina / … (wszystkie obszary nadrzędne)
    const przodkowie: typeof wszystkie = []
    for (let p = nadrzedne; p && przodkowie.length < 6; p = p.nalezyDo ? wszystkie.find((x) => x.id === p!.nalezyDo) ?? null : null) przodkowie.unshift(p)
    // gmina: wszystkie wsie w obrębie (także pośrednio), liczniki i mapa przybliżona do granicy gminy
    const potomkowie: typeof wszystkie = []
    if (m.rodzaj === 'gmina') {
        const kolejka = [m.id]
        while (kolejka.length) { const id = kolejka.shift()!; for (const x of wszystkie) if (x.nalezyDo === id) { potomkowie.push(x); kolejka.push(x.id) } }
        potomkowie.sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'))
    }
    const liczniki = m.rodzaj === 'gmina' ? await licznikiMiejsc(poziom) : new Map()
    const wszystkieObiekty = m.rodzaj === 'gmina' ? await obiekty(poziom) : []
    const idsGminy = new Set([m.id, ...potomkowie.map((x) => x.id)])
    const obiektyGminy = wszystkieObiekty.filter((o) => o.miejsce && idsGminy.has(o.miejsce))
    const materialyGminy = m.rodzaj === 'gmina' ? (await materialy(poziom)).filter((x) => x.miejsca.some((id) => idsGminy.has(id))) : []
    const tematyGminy = m.rodzaj === 'gmina' ? [...new Map((await Promise.all([...idsGminy].map((id) => tematyDlaMiejsca(id, poziom)))).flat().map((t) => [t.id, t])).values()] : []

    const ktx = await kontekstTresci(poziom)
    const lead = zajawka(m.opis, 240, ktx.rozwiaz)
    const mapa = !(m.wspolrzedne || (m.rodzaj === 'gmina' && punkty.length > 0)) ? null : m.rodzaj === 'gmina'
        ? <MapaMiejscLeniwa punkty={punkty} planyGeo={planyGeo} wysokosc="100%" obrys={{ url: '/granice/gminy-okolic.geojson', nazwa: m.nazwa.replace(/^gmina /i, '') }} wyroznione={[...idsGminy]} />
        : <MapaMiejscLeniwa punkty={punkty} planyGeo={planyGeo} srodek={m.wspolrzedne ?? undefined} wysokosc="100%" />
    const zGminy = gmina && gmina.id !== m.id ? gmina : null
    const ksiegiSa = ksiegiWsi.some((p) => p.ksiegi.length > 0)
    const odnosnikiWTekstach = siec.odnosniki.filter((z) => !(z.zrodlo.rodzaj === 'wpis' && opow.some((o) => o.id === z.zrodlo.id)))

    return (
        <Strona akcje={<><CopyLinkButton sciezka={`/miejsca/${m.id}`} /></>}>
            <NaglowekKarty
                sciezka={[{ tekst: 'miejsca', href: '/miejsca' }, ...przodkowie.map((p) => ({ tekst: p.nazwa, href: `/miejsca/${p.id}` }))]}
                tytul={m.nazwa}
                obraz={mapa ? <MapaKarty mapa={mapa} wysokosc={m.rodzaj === 'gmina' ? 260 : 200} podpis="mapa okolicy" /> : undefined}
                szerokiObraz={m.rodzaj === 'gmina'}
                linia={[
                    RODZAJE_MIEJSC[m.rodzaj] ?? m.rodzaj,
                    zGminy ? { tekst: zGminy.nazwa, href: `/miejsca/${zGminy.id}` } : null,
                    obszar && nadrzedne && (!gmina || nadrzedne.id !== gmina.id) ? { tekst: nadrzedne.nazwa, href: `/miejsca/${nadrzedne.id}` } : null,
                ]}
                lead={lead ? <p style={{ margin: 0 }}>{lead}</p> : undefined}
            >
                {maTekst(opisHtml) && <a href="#historia" className="odn w-fit" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>{obszar ? 'cały opis' : 'historia'} ↓</a>}
            </NaglowekKarty>

            <Tabela etykieta={`${m.nazwa} – dane`}>
                <Czesc tytul="podstawowe" />
                {!obszar && <W e="gmina">{zGminy ? <Link href={`/miejsca/${zGminy.id}`} className="odn">{zGminy.nazwa.replace(/^gmina /i, '')}</Link> : <span className="text-gray-600 dark:text-gray-400">w opracowaniu</span>}</W>}
                {nadrzedne && (!gmina || nadrzedne.id !== gmina.id) && obszar && <W e="należy do"><Link href={`/miejsca/${nadrzedne.id}`} className="odn">{nadrzedne.nazwa}</Link></W>}
                {!obszar && (
                    <W e={m.parafie.length > 1 ? 'parafie' : 'parafia'}>
                        {m.parafie.length === 0 ? <span className="text-gray-600 dark:text-gray-400">przynależność parafialna w opracowaniu</span> : m.parafie.map((p, i) => {
                            const par = wszystkieParafie.find((x) => x.id === p.parafia)
                            if (!par) return null
                            const okres = p.od != null || p.do != null ? `${p.od ? `od ${p.od}` : ''}${p.od && p.do ? ' ' : ''}${p.do ? `do ${p.do}` : ''}` : ''
                            return (
                                <span key={p.parafia + i} className="block">
                                    <Link href={`/biblioteka/ksiegi#${par.id}`} className="odn">{par.nazwa}</Link>
                                    <span className="ot-drobne"> – {WYZNANIA_PARAFII[par.wyznanie] ?? par.wyznanie}{okres && ` · ${okres}`}</span>
                                </span>
                            )
                        })}
                    </W>
                )}
                {!obszar && <W e={m.wyznania.length > 1 ? 'wyznania przed 1875' : 'wyznanie przed 1875'}>{m.wyznania.length ? opisWyznan(m.wyznania, m.wyznaniaRowne) : <span className="text-gray-600 dark:text-gray-400">w opracowaniu</span>}</W>}
                <W e="formy zapisu nazwy">{formyZapisu.length > 0 ? formyZapisu.join(' · ') : null}</W>
                <W e="wsie">{m.rodzaj === 'gmina' && potomkowie.length > 0 ? potomkowie.length : null}</W>
                <W e="obejmuje">{podrzedne.length > 0 && m.rodzaj !== 'gmina' && <LiniaKarty className="karta-linia-w" elementy={[podrzedne.map((p) => ({ tekst: p.nazwa, href: `/miejsca/${p.id}` }))]} />}</W>
                <W e="położenie">{m.wspolrzedne && !obszar && <OtworzWMapach wspolrzedne={m.wspolrzedne} />}</W>
                <W e="zobacz też">{m.sameAs && <a href={m.sameAs} target="_blank" rel="noopener noreferrer" className="odn">{m.sameAs.replace(/^https?:\/\//, '')}</a>}</W>

                {m.rodzaj === 'gmina' && potomkowie.length > 0 && (
                    <>
                        <Czesc tytul="wsie gminy">{`obiekty w terenie: ${obiektyGminy.length} · materiały: ${materialyGminy.length}`}</Czesc>
                        <WCaly>
                            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(13rem, 1fr))', gap: '0 1.5rem' }}>
                                {potomkowie.map((w) => {
                                    const l = liczniki.get(w.id), ob = wszystkieObiekty.filter((o) => o.miejsce === w.id).length
                                    const meta = [l?.opowiesci ? `${l.opowiesci} ${l.opowiesci === 1 ? 'wpis' : l.opowiesci < 5 ? 'wpisy' : 'wpisów'}` : '', ob ? `${ob} ${ob === 1 ? 'obiekt' : ob < 5 ? 'obiekty' : 'obiektów'}` : ''].filter(Boolean).join(' · ')
                                    return (
                                        <div key={w.id} className="flex justify-between border-b border-[#e7e2d8] dark:border-[#374151] py-2" style={{ gap: 8 }}>
                                            <Link href={`/miejsca/${w.id}`} className="odn">{w.nazwa}</Link>
                                            <span className="ot-drobne">{meta || '—'}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </WCaly>
                        <W e="tematy w gminie">{tematyGminy.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[tematyGminy.map((t) => ({ tekst: t.nazwa, href: `/tematy/${t.id}` }))]} />}</W>
                    </>
                )}

                {(swiatynie.length > 0 || !obszar) && (
                    <>
                        <Czesc tytul="w terenie">{swiatynie.length ? `${swiatynie.length} ${swiatynie.length === 1 ? 'obiekt' : swiatynie.length < 5 ? 'obiekty' : 'obiektów'}` : 'kapliczki, krzyże, cmentarze, szkoły, młyny…'}</Czesc>
                        <WCaly>
                            {swiatynie.length > 0 && (
                                <ul className="flex flex-col" style={{ gap: 6, marginBottom: 8 }}>
                                    {swiatynie.map((o) => (
                                        <li key={o.id} className="flex items-center" style={{ gap: 8 }}>
                                            <span style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: tarczaObiektu(o.rodzaj, RODZAJE_OBIEKTOW[o.rodzaj] ?? o.rodzaj, 24, o.istnieje) }} />
                                            <Link href={`/obiekty/${o.id}`} className="odn">{o.nazwa}</Link>
                                            <span className="ot-drobne">{[RODZAJE_OBIEKTOW[o.rodzaj] ?? o.rodzaj, o.czas && formatujEdtf(o.czas), !o.istnieje && 'nie istnieje'].filter(Boolean).join(' · ')}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <span className="ot-drobne">{swiatynie.length ? 'Brakuje miejsca pamięci, kapliczki albo zabytku? ' : 'Nie ma tu jeszcze żadnych obiektów. Znasz miejsce pamięci, kapliczkę albo zabytek? '}<Zgloszenie rodzaj="miejsce" adres={`/miejsca/${m.id}`} tytul={m.nazwa} wariant="link" etykieta="zgłoś brakujące miejsce" /></span>
                        </WCaly>
                    </>
                )}

                {(ksiegiSa || m.parafie.length > 0) && (
                    <>
                        <Czesc tytul="księgi metrykalne">zachowane roczniki</Czesc>
                        <WCaly>
                            <div className="flex flex-col" style={{ gap: 12 }}>
                                {!ksiegiSa && <span className="ot-drobne">Spis ksiąg parafii tej wsi jest w przygotowaniu.</span>}
                                {ksiegiWsi.filter((p) => p.ksiegi.length > 0).map((p) => (
                                    <div key={p.parafia.id} className="flex flex-col" style={{ gap: 6 }}>
                                        <span><Link href={`/biblioteka/ksiegi#${p.parafia.id}`} className="odn">{p.parafia.nazwa}</Link><span className="ot-drobne"> · {WYZNANIA_PARAFII[p.parafia.wyznanie] ?? p.parafia.wyznanie}</span></span>
                                        <TabelaKsiag ksiegi={p.ksiegi} nazwyMiejsc={Object.fromEntries(wszystkie.map((x) => [x.id, x.nazwa]))} />
                                    </div>
                                ))}
                                <Link href={`/biblioteka/ksiegi?miejsce=${m.id}`} className="odn w-fit" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>pełny spis z paskiem lat →</Link>
                            </div>
                        </WCaly>
                    </>
                )}
            </Tabela>

            <section id="historia" className="flex flex-col scroll-mt-6" style={{ gap: 10 }}>
                <h2 className="font-bold lowercase" style={{ fontSize: 'calc(20px * var(--font-scale, 1))' }}>{obszar ? 'opis' : 'historia'}</h2>
                {maTekst(opisHtml) ? <Tresc html={opisHtml} /> : (
                    <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                        Opis historii {obszar ? 'tego obszaru' : 'tej miejscowości'} jest w przygotowaniu.
                    </p>
                )}
            </section>

            <Tabela etykieta={`${m.nazwa} – powiązane i źródła`}>
                <Czesc tytul="powiązane">{[opow.length && 'wpisy', mat.length && 'materiały', tematy.length && 'tematy'].filter(Boolean).join(' · ')}</Czesc>
                <W e="wpisy">{opow.length > 0 && <KrotkieWpisy wpisy={opow} />}</W>
                <W e="materiały">{mat.length > 0 && <KrotkieMaterialy materialy={mat} />}</W>
                <W e="tematy">{bezDaty.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[bezDaty.map((t) => ({ tekst: t.nazwa, href: `/tematy/${t.id}` }))]} />}</W>
                <W e="oś czasu">{zData.length > 0 && (
                    <ol className="karta-os">
                        {zData.map((t) => <li key={t.id}><b>{formatujEdtf(t.czas)}</b> <Link href={`/tematy/${t.id}`} className="odn">{t.nazwa}</Link></li>)}
                    </ol>
                )}</W>
                <W e="plany i schematy">{planyWsi.length > 0 && <ListaPlanow plany={planyWsi} />}</W>
                <WCaly>
                    <span className="ot-drobne">{opow.length === 0 && mat.length === 0 ? `Nie ma jeszcze wpisów ani materiałów o ${obszar ? 'tym obszarze' : 'tej miejscowości'}. ` : ''}Masz zdjęcie, dokument albo wspomnienie? <Zgloszenie rodzaj="material" adres={`/miejsca/${m.id}`} tytul={m.nazwa} wariant="link" etykieta="przyślij materiał" /></span>
                </WCaly>
                <Zrodla pozycje={[
                    ...m.zrodla.map((z, i) => <ZAdresami key={`z${i}`} tekst={z} />),
                    zrodlo && <ZAdresami key="opis" tekst={zrodlo} />,
                ]} />
            </Tabela>

            <Powiazania dane={{ odnosniki: odnosnikiWTekstach, wzmianki: siec.wzmianki }} />

            <ZglosPoprawke adres={`/miejsca/${m.id}`} tytul={m.nazwa} pytanie="Coś się nie zgadza albo wiesz więcej o tym miejscu?" />
        </Strona>
    )
}

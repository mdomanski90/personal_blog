import { odmiana } from '@/lib/tekst'
import type { Metadata } from 'next'
import { brakLubPrzekierowanie } from '@/lib/przekierowania'
import OtworzWMapach from '../../components/OtworzWMapach'
import { Link } from 'next-view-transitions'
import { licznikiMiejsc, materialy, miejsca, miejsce, obiekty, obiektyDlaMiejsca, OBSZARY, opowiesciDlaMiejsca, poziomCzytelnika, RODZAJE_MIEJSC, RODZAJE_OBIEKTOW, tematyDlaMiejsca, opisWyznan, materialyDla, powiazania, kontekstTresci, ksiegiDlaMiejsca, parafie, hasla } from '@/lib/archiwum'
import { adresHasla, skrocZnaczenie } from '@/lib/slownik'
import { PastylkaFiltra } from '../../components/Wzorce'
import { WYZNANIA } from '@/lib/tarcze'
import { zapiszOkres } from '@/lib/parafie-powiazania'
import { WYZNANIA_PARAFII } from '@/lib/ksiegi'
import { punktyMapy } from '@/lib/punkty-mapy'
import { dolaczPlany, planyNaMape } from '@/lib/plany/serwer'
import ListaObiektow from '../../components/ListaObiektow'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml } from '@/lib/markdoc'
import { Sekcja, Strona, Tresc, maTekst } from '../../components/Uklad'
import { wystapieniaKarty } from '@/lib/plany/wystapienia'
import { Czesc, CzescJakCytowac, WierszZglosil, KrotkieMaterialy, KrotkieWpisy, LiniaKarty, WierszeWystapien, NaglowekKarty, Tabela, W, WCaly, ZAdresami, Zrodla, ZglosPoprawke, idCzesci, spisCzesci } from '../../components/Karta'
import { daneCytatu } from '@/lib/cytowanie'
import SpisTresci from '../../components/SpisTresci'
import SpisDzialow from '../../archiwum/SpisDzialow'
import { pozycjeMiejsc } from '../../components/SpisMiejsc'
import { PrzyciskDrukuj, PrzyciskDrukujCalosc } from '../../components/Druk'
import MapaKarty from '../../components/MapaKarty'
import Zgloszenie from '../../components/Zgloszenie'
import { brakiDoPomocy } from '@/lib/wspoltworz-dane'
import MapaMiejscLeniwa from '../../components/MapaMiejscLeniwa'
import CopyLinkButton from '../../components/CopyLinkButton'
import Powiazania, { czesciPowiazan } from '../../components/Powiazania'
import { TabelaKsiag } from '../../components/Ksiegi'
import ListaPlanow from '../../components/plan/ListaPlanow'
import { planyDlaCzytelnika } from '@/lib/plany/serwer'
import { numerKat } from '@/lib/katalog/dane'
import { WierszNrKat } from '../../components/NrKat'

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
    if (!m) return brakLubPrzekierowanie('miejsca', slug)

    const wszystkie = await miejsca(poziom)
    const nadrzedne = m.nalezyDo ? wszystkie.find((x) => x.id === m.nalezyDo) : null
    const podrzedne = wszystkie.filter((x) => x.nalezyDo === m.id)
    const tematy = await tematyDlaMiejsca(m.id, poziom)
    const zData = tematy.filter((t) => t.czas)
    const bezDaty = tematy.filter((t) => !t.czas)
    const opow = await opowiesciDlaMiejsca(m.id, poziom)
    const opisHtml = naHtml(m.opis, await kontekstTresci(poziom))
    // WSP-04: pusta historia – „pomóż uzupełnić” (decyzje redakcji jak w „współtwórz”)
    const pomoc = await brakiDoPomocy('miejsca', m.id, maTekst(opisHtml) ? [] : ['bez-opisu'], m.bezWspoltworz)
    const swiatynie = await obiektyDlaMiejsca(m.id, poziom)
    const punkty = m.wspolrzedne || m.rodzaj === 'gmina' ? await dolaczPlany(punktyMapy(wszystkie, await obiekty(poziom))) : []
    const planyGeo = await planyNaMape()
    const obszar = OBSZARY.includes(m.rodzaj)
    const siec = await powiazania('miejsce', m.id, poziom)
    const mat = await materialyDla('miejsce', m.id, poziom)
    const ksiegiWsi = await ksiegiDlaMiejsca(m, poziom)
    const planyWsi = await planyDlaCzytelnika('miejsce', m.id)
    const wszystkieParafie = await parafie()
    const slowaMiejsca = (await hasla(poziom)).filter((h) => h.wystepowanie?.includes(m.id))
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
    const obiektyGminy = wszystkieObiekty.filter((o) => o.miejsca.some((id) => idsGminy.has(id)))
    const materialyGminy = m.rodzaj === 'gmina' ? (await materialy(poziom)).filter((x) => x.miejsca.some((id) => idsGminy.has(id))) : []
    const tematyGminy = m.rodzaj === 'gmina' ? [...new Map((await Promise.all([...idsGminy].map((id) => tematyDlaMiejsca(id, poziom)))).flat().map((t) => [t.id, t])).values()] : []

    const ktx = await kontekstTresci(poziom)
    // ankieta 2 (17.11): nad tabelą osobne pole wstępu (pisane ręcznie); bez pola – nic, bez skrótu historii
    const lead = m.wstep
    const mapa = !(m.wspolrzedne || (m.rodzaj === 'gmina' && punkty.length > 0)) ? null : m.rodzaj === 'gmina'
        ? <MapaMiejscLeniwa punkty={punkty} planyGeo={planyGeo} wysokosc="100%" obrys={{ url: '/granice/gminy-okolic.geojson', nazwa: m.nazwa.replace(/^gmina /i, '') }} wyroznione={[...idsGminy]} />
        : <MapaMiejscLeniwa punkty={punkty} planyGeo={planyGeo} srodek={m.wspolrzedne ?? undefined} wysokosc="100%" />
    const zGminy = gmina && gmina.id !== m.id ? gmina : null
    const ksiegiSa = ksiegiWsi.some((p) => p.ksiegi.length > 0)
    const odnosnikiWTekstach = siec.odnosniki.filter((z) => !(z.zrodlo.rodzaj === 'wpis' && opow.some((o) => o.id === z.zrodlo.id)))

    const nrKat = numerKat('miejsce', m.id)
    const jestTeren = swiatynie.length > 0 || !obszar
    const jestKsiegi = ksiegiSa || m.parafie.length > 0
    const tytulHistorii = obszar ? 'opis' : 'historia'
    const daneSieci = { odnosniki: odnosnikiWTekstach, wzmianki: siec.wzmianki }
    const spis = spisCzesci(['podstawowe', m.rodzaj === 'gmina' && potomkowie.length > 0 && 'wsie gminy', tytulHistorii, jestTeren && 'w terenie', planyWsi.length > 0 && 'plany i schematy', jestKsiegi && 'księgi metrykalne', 'powiązane', ...czesciPowiazan(daneSieci), 'jak cytować', (m.zrodla.length > 0 || !!zrodlo) && 'źródła'], { wstep: !!lead })
    const naglowek = (
        <NaglowekKarty
            sciezka={[]}
            tytul={m.nazwa}
            linia={[
                RODZAJE_MIEJSC[m.rodzaj] ?? m.rodzaj,
                zGminy ? { tekst: zGminy.nazwa, href: `/miejsca/${zGminy.id}` } : null,
                obszar && nadrzedne && (!gmina || nadrzedne.id !== gmina.id) ? { tekst: nadrzedne.nazwa, href: `/miejsca/${nadrzedne.id}` } : null,
            ]}
            lead={lead || undefined}
        />
    )
    // JW-2 (makiety v2): lead → podstawowe → pełna historia → w terenie, księgi → powiązane, źródła; mapa i spis treści w pasku bocznym
    return (
        <Strona uklad="karta" nrKat={nrKat} sciezka={[{ tekst: 'miejsca', href: '/miejsca' }, ...przodkowie.map((p) => ({ tekst: p.nazwa, href: `/miejsca/${p.id}` }))]} akcje={<><CopyLinkButton sciezka={`/miejsca/${m.id}`} /><PrzyciskDrukuj /><PrzyciskDrukujCalosc rodzaj="miejsce" id={m.id} /></>} naglowek={naglowek}
            bok={mapa ? <MapaKarty mapa={mapa} wysokosc={300} podpis="mapa okolicy" /> : undefined} spis={<SpisTresci pozycje={spis} />}>
            <Tabela etykieta={`${m.nazwa} – dane`}>
                <Czesc tytul="podstawowe" />
                <WierszNrKat nr={nrKat} />
                {!obszar && <W e="gmina">{zGminy ? <Link href={`/miejsca/${zGminy.id}`} className="odn">{zGminy.nazwa.replace(/^gmina /i, '')}</Link> : <span className="text-[var(--tekst-opis)]">w opracowaniu</span>}</W>}
                {nadrzedne && (!gmina || nadrzedne.id !== gmina.id) && obszar && <W e="należy do"><Link href={`/miejsca/${nadrzedne.id}`} className="odn">{nadrzedne.nazwa}</Link></W>}
                {!obszar && m.parafie.length > 0 && (
                    <W e="przynależność parafialna / USC">
                        {m.parafie.map((p, i) => {
                            const par = wszystkieParafie.find((x) => x.id === p.parafia)
                            if (!par) return null
                            const okres = p.od != null && p.do != null ? `${p.od}–${p.do}` : p.od != null ? `od ${p.od}` : p.do != null ? `do ${p.do}` : ''
                            return (
                                <span key={p.parafia + i} className="block">
                                    <Link href={`/parafie/${par.id}`} className="odn">{par.nazwa}</Link>
                                    <span className="ot-drobne"> – {WYZNANIA_PARAFII[par.wyznanie] ?? par.wyznanie}{okres && ` · ${okres}`}</span>
                                </span>
                            )
                        })}
                    </W>
                )}
                {!obszar && <W e={m.wyznania.length > 1 ? 'wyznania przed 1875' : 'wyznanie przed 1875'}>{m.wyznania.length ? opisWyznan(m.wyznania, m.wyznaniaRowne) : <span className="text-[var(--tekst-opis)]">w opracowaniu</span>}</W>}
                {/* okresy przy wyznaniach (P3): osobne pole – „przed 1875” (znak na mapie) bez zmian */}
                {!obszar && (m.wyznaniaWCzasie?.length ?? 0) > 0 && (
                    <W e="wyznania w czasie">
                        {m.wyznaniaWCzasie!.map((w, i) => (
                            <span key={i} className="block">
                                {WYZNANIA[w.wyznanie as keyof typeof WYZNANIA]?.nazwa ?? w.wyznanie}
                                {(w.od != null || w.do != null) && <span className="ot-drobne"> · {zapiszOkres(w.od, w.do)}</span>}
                                {w.zrodlo && <span className="ot-drobne"> · źródło: <ZAdresami tekst={w.zrodlo} /></span>}
                            </span>
                        ))}
                    </W>
                )}
                <W e="formy zapisu nazwy">{formyZapisu.length > 0 ? formyZapisu.join(' · ') : null}</W>
                {/* KRT-02 (P3): pochodzenie nazwy ze źródłem */}
                <W e="pochodzenie nazwy">{m.pochodzenieNazwy && <span className="flex flex-col gap-0.5"><span className="whitespace-pre-line">{m.pochodzenieNazwy}</span>{m.pochodzenieNazwyZrodlo && <span className="ot-drobne">źródło: <ZAdresami tekst={m.pochodzenieNazwyZrodlo} /></span>}</span>}</W>
                <W e="wsie">{m.rodzaj === 'gmina' && potomkowie.length > 0 ? potomkowie.length : null}</W>
                <W e="obejmuje">{podrzedne.length > 0 && m.rodzaj !== 'gmina' && <LiniaKarty className="karta-linia-w" elementy={[podrzedne.map((p) => ({ tekst: p.nazwa, href: `/miejsca/${p.id}` }))]} />}</W>
                <W e="położenie">{m.wspolrzedne && !obszar && <OtworzWMapach wspolrzedne={m.wspolrzedne} />}</W>
                <W e="zobacz też">{m.sameAs && <a href={m.sameAs} target="_blank" rel="noopener noreferrer" className="odn">{m.sameAs.replace(/^https?:\/\//, '')}</a>}</W>
                <WierszZglosil v={m.zglosil} />

                {m.rodzaj === 'gmina' && potomkowie.length > 0 && (
                    <>
                        <Czesc tytul="wsie gminy">{`obiekty w terenie: ${obiektyGminy.length} · materiały: ${materialyGminy.length}`}</Czesc>
                        <WCaly>
                            <SpisDzialow dzialy={pozycjeMiejsc(potomkowie, new Map(potomkowie.map((w) => [w.id, { wpisy: liczniki.get(w.id)?.opowiesci, obiekty: wszystkieObiekty.filter((o) => o.miejsca.includes(w.id)).length }])))} wybrany="" numeracja={false} etykieta="wsie gminy" />
                        </WCaly>
                        <W e="tematy w gminie">{tematyGminy.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[tematyGminy.map((t) => ({ tekst: t.nazwa, href: `/tematy/${t.id}` }))]} />}</W>
                    </>
                )}

            </Tabela>

            <Sekcja tytul={tytulHistorii} id={idCzesci(tytulHistorii)}>
                {maTekst(opisHtml) ? <Tresc html={opisHtml} /> : (
                    // tekst właściciela (komentarz na makiecie 17.11)
                    <p className="tekst-opis">Opis {obszar ? 'tego obszaru' : 'tej miejscowości'} jest w opracowaniu.{pomoc.has('bez-opisu') && <>
                        {' '}Jeśli masz na ten temat wiedzę –{' '}
                        <Zgloszenie rodzaj="poprawka" wariant="link" etykieta="pomóż go uzupełnić" adres={`/miejsca/${m.id}`} tytul={`${m.nazwa} – historia`} brak="bez-opisu" zgoda
                            podpowiedz={`Co wiesz o dziejach ${obszar ? 'tego obszaru' : 'tej miejscowości'}? Wystarczy kilka zdań, wspomnienie albo wskazanie źródła.`} />
                        . Wspólnie możemy tworzyć ten serwis.
                    </>}</p>
                )}
            </Sekcja>

            {(jestTeren || jestKsiegi || planyWsi.length > 0) && <Tabela etykieta={`${m.nazwa} – w terenie, plany i księgi`}>
                {(swiatynie.length > 0 || !obszar) && (
                    <>
                        <Czesc tytul="w terenie">{swiatynie.length ? `${swiatynie.length} ${swiatynie.length === 1 ? 'obiekt' : swiatynie.length < 5 ? 'obiekty' : 'obiektów'}` : 'kapliczki, krzyże, cmentarze, szkoły, młyny…'}</Czesc>
                        <WCaly>
                            {swiatynie.length > 0 && (
                                <ListaObiektow zwijajPo={8} pozycje={swiatynie.map((o) => ({ id: o.id, nazwa: o.nazwa, rodzaj: o.rodzaj, nazwaRodzaju: RODZAJE_OBIEKTOW[o.rodzaj] ?? o.rodzaj, istnieje: o.istnieje }))} />
                            )}
                            <span className="ot-drobne">{swiatynie.length ? 'Brakuje miejsca pamięci, kapliczki albo zabytku? ' : 'Nie ma tu jeszcze żadnych obiektów. Znasz miejsce pamięci, kapliczkę albo zabytek? '}<Zgloszenie rodzaj="miejsce" adres={`/miejsca/${m.id}`} tytul={m.nazwa} wariant="link" etykieta="zgłoś brakujące miejsce" /></span>
                        </WCaly>
                    </>
                )}

                {planyWsi.length > 0 && (
                    // PH-23: plany jako „pozycja w karcie” z miniaturą; w tabeli 2 między „w terenie” a księgami (decyzja właściciela 16.11)
                    <>
                        <Czesc tytul="plany i schematy">{odmiana(planyWsi.length, ['plan', 'plany', 'planów'])}</Czesc>
                        <WCaly><ListaPlanow plany={planyWsi} wszystkie={`/plany?miejsce=${m.id}`} /></WCaly>
                    </>
                )}
                {(ksiegiSa || m.parafie.length > 0) && (
                    <>
                        <Czesc tytul="księgi metrykalne">zachowane roczniki</Czesc>
                        <WCaly>
                            <div className="flex flex-col gap-3">
                                {!ksiegiSa && <span className="ot-drobne">Spis ksiąg parafii tej wsi jest w przygotowaniu.</span>}
                                {ksiegiWsi.filter((p) => p.ksiegi.length > 0).map((p) => (
                                    <div key={p.parafia.id} className="flex flex-col gap-1.5">
                                        <span>{p.parafia.id === 'nieustalona-instytucja'
                                            ? <span>{p.parafia.nazwa}</span>
                                            : <Link href={`/parafie/${p.parafia.id}`} className="odn">{p.parafia.nazwa}</Link>}<span className="ot-drobne"> · {WYZNANIA_PARAFII[p.parafia.wyznanie] ?? p.parafia.wyznanie}</span></span>
                                        <TabelaKsiag ksiegi={p.ksiegi} nazwyMiejsc={Object.fromEntries(wszystkie.map((x) => [x.id, x.nazwa]))} kontekst={{ miejsce: m.id }} wariant="wiersze" />
                                    </div>
                                ))}
                                <Link href={`/biblioteka/ksiegi?miejsce=${m.id}`} className="odn w-fit tekst-opis-maly">pełny spis z paskiem lat →</Link>
                            </div>
                        </WCaly>
                    </>
                )}
            </Tabela>}

            <Tabela etykieta={`${m.nazwa} – powiązane i źródła`}>
                <Czesc tytul="powiązane">{[opow.length && 'wpisy', mat.length && 'materiały', tematy.length && 'tematy'].filter(Boolean).join(' · ')}</Czesc>
                <W e="wpisy">{opow.length > 0 && <KrotkieWpisy wpisy={opow} />}</W>
                <W e="materiały">{mat.length > 0 && <KrotkieMaterialy materialy={mat} />}</W>
                <WierszeWystapien w={await wystapieniaKarty('miejsce', m.id)} />
                {/* SLW-02 (P3): hasła słownika z „występowaniem” w tej miejscowości */}
                <W e="słowa z tej miejscowości">{slowaMiejsca.length > 0 && <span className="karta-pastylki">{slowaMiejsca.map((h) => <PastylkaFiltra key={h.id} href={adresHasla(h.id)} title={skrocZnaczenie(h.znaczenie, 160)}>{h.haslo}</PastylkaFiltra>)}</span>}</W>
                <W e="tematy">{bezDaty.length > 0 && <LiniaKarty className="karta-linia-w" elementy={[bezDaty.map((t) => ({ tekst: t.nazwa, href: `/tematy/${t.id}` }))]} />}</W>
                <W e="oś czasu">{zData.length > 0 && (
                    <ol className="karta-os">
                        {zData.map((t) => <li key={t.id}><b>{formatujEdtf(t.czas)}</b> <Link href={`/tematy/${t.id}`} className="odn">{t.nazwa}</Link></li>)}
                    </ol>
                )}</W>
                <WCaly>
                    <span className="ot-drobne">{opow.length === 0 && mat.length === 0 ? `Nie ma jeszcze wpisów ani materiałów o ${obszar ? 'tym obszarze' : 'tej miejscowości'}. ` : ''}Masz zdjęcie, dokument albo wspomnienie? <Zgloszenie rodzaj="material" adres={`/miejsca/${m.id}`} tytul={m.nazwa} wariant="link" etykieta="przyślij materiał" /></span>
                </WCaly>
                <Powiazania dane={daneSieci} />
                <CzescJakCytowac plik={m.id} dane={daneCytatu({ tytul: m.nazwa, sciezka: `/miejsca/${m.id}`, nrKat, rodzaj: 'miejsce' })} />
                <Zrodla pozycje={[
                    ...m.zrodla.map((z, i) => <ZAdresami key={`z${i}`} tekst={z} />),
                    zrodlo && <ZAdresami key="opis" tekst={zrodlo} />,
                ]} />
            </Tabela>

            <ZglosPoprawke adres={`/miejsca/${m.id}`} tytul={m.nazwa} pytanie="Coś się nie zgadza albo wiesz więcej o tym miejscu?" />
        </Strona>
    )
}

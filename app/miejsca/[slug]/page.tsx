import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from 'next-view-transitions'
import { licznikiMiejsc, materialy, miejsca, miejsce, nazwy, obiekty, obiektyDlaMiejsca, OBSZARY, opowiesciDlaMiejsca, poziomCzytelnika, RODZAJE_MIEJSC, RODZAJE_OBIEKTOW, tematyDlaMiejsca, WYZNANIA_MIEJSC, materialyDla, powiazania, kontekstTresci, ksiegiDlaMiejsca, parafie } from '@/lib/archiwum'
import { WYZNANIA_PARAFII } from '@/lib/ksiegi'
import { punktyMapy } from '@/lib/punkty-mapy'
import { dolaczPlany, planyNaMape } from '@/lib/plany/serwer'
import { tarczaObiektu } from '@/lib/tarcze'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml } from '@/lib/markdoc'
import { Metki, Sekcja, Strona, Tresc, TytulStrony, Wiersz, Kreski, maTekst } from '../../components/Uklad'
import Zgloszenie from '../../components/Zgloszenie'
import ListaOpowiesci from '../../components/ListaOpowiesci'
import MapaMiejscLeniwa from '../../components/MapaMiejscLeniwa'
import CopyLinkButton from '../../components/CopyLinkButton'
import Powiazania from '../../components/Powiazania'
import ListaMaterialow from '../../components/ListaMaterialow'
import PowrotDoMapy from '../../components/PowrotDoMapy'
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
    const { miejsca: nazwyMiejsc } = await nazwy(poziom)
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
    const brak = <span className="text-gray-400 dark:text-gray-500">—</span>
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

    return (
        <Strona akcje={<><PowrotDoMapy /><CopyLinkButton sciezka={`/miejsca/${m.id}`} /></>}>
            <div className="grid" style={{ gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(17rem, 1fr))', alignItems: 'stretch' }}>
                <div className="flex flex-col" style={{ gap: '0.9rem' }}>
                    <TytulStrony sciezka={[{ tekst: 'miejsca', href: '/miejsca' }, ...przodkowie.map((p) => ({ tekst: p.nazwa, href: `/miejsca/${p.id}` }))]}>{m.nazwa}</TytulStrony>
                    <div>
                        <Wiersz etykieta="typ">{RODZAJE_MIEJSC[m.rodzaj] ?? m.rodzaj}</Wiersz>
                        {!obszar && <Wiersz etykieta="gmina">{gmina && gmina.id !== m.id ? <Link href={`/miejsca/${gmina.id}`}>{gmina.nazwa.replace(/^gmina /i, '')}</Link> : brak}</Wiersz>}
                        {nadrzedne && (!gmina || nadrzedne.id !== gmina.id) && obszar && <Wiersz etykieta="należy do"><Link href={`/miejsca/${nadrzedne.id}`}>{nadrzedne.nazwa}</Link></Wiersz>}
                        {!obszar && (
                            <Wiersz etykieta={m.parafie.length > 1 ? 'parafie' : 'parafia'}>
                                {m.parafie.length === 0 ? brak : m.parafie.map((p, i) => {
                                    const par = wszystkieParafie.find((x) => x.id === p.parafia)
                                    if (!par) return null
                                    const okres = p.od != null || p.do != null ? `${p.od ? `od ${p.od}` : ''}${p.od && p.do ? ' ' : ''}${p.do ? `do ${p.do}` : ''}` : ''
                                    return (
                                        <span key={p.parafia + i} className="block">
                                            <Link href={`/biblioteka/ksiegi#${par.id}`}>{par.nazwa}</Link>
                                            <span className="text-gray-500" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}> – {WYZNANIA_PARAFII[par.wyznanie] ?? par.wyznanie}{okres && ` · ${okres}`}</span>
                                        </span>
                                    )
                                })}
                            </Wiersz>
                        )}
                        {!obszar && <Wiersz etykieta="przeważające wyznanie przed 1875">{m.wyznanie ? (WYZNANIA_MIEJSC[m.wyznanie] ?? m.wyznanie) : brak}</Wiersz>}
                        {(!obszar || formyZapisu.length > 0) && <Wiersz etykieta="formy zapisu nazwy">{formyZapisu.length > 0 ? formyZapisu.join(' · ') : brak}</Wiersz>}
                        {m.rodzaj === 'gmina' && potomkowie.length > 0 && <Wiersz etykieta="wsie">{potomkowie.length}</Wiersz>}
                        {podrzedne.length > 0 && m.rodzaj !== 'gmina' && (
                            <Wiersz etykieta="obejmuje">
                                {podrzedne.map((p, i) => (
                                    <span key={p.id}>{i > 0 && ', '}<Link href={`/miejsca/${p.id}`}>{p.nazwa}</Link></span>
                                ))}
                            </Wiersz>
                        )}
                        {m.sameAs && <Wiersz etykieta="zobacz też"><a href={m.sameAs} target="_blank" rel="noopener noreferrer">{m.sameAs.replace(/^https?:\/\//, '')}</a></Wiersz>}
                    </div>
                </div>
                {(m.wspolrzedne || (m.rodzaj === 'gmina' && punkty.length > 0)) && <div style={{ position: 'relative', minHeight: m.rodzaj === 'gmina' ? 340 : 300 }}><div style={{ position: 'absolute', inset: 0 }}>
                    {m.rodzaj === 'gmina'
                        ? <MapaMiejscLeniwa punkty={punkty} planyGeo={planyGeo} wysokosc="100%" obrys={{ url: '/granice/gminy-okolic.geojson', nazwa: m.nazwa.replace(/^gmina /i, '') }} wyroznione={[...idsGminy]} />
                        : <MapaMiejscLeniwa punkty={punkty} planyGeo={planyGeo} srodek={m.wspolrzedne ?? undefined} wysokosc="100%" />}
                </div></div>}
            </div>

            <Kreski />

            {m.rodzaj === 'gmina' && potomkowie.length > 0 && (
                <Sekcja tytul="wsie gminy">
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(13rem, 1fr))', gap: '0 1.5rem' }}>
                        {potomkowie.map((w) => {
                            const l = liczniki.get(w.id), ob = wszystkieObiekty.filter((o) => o.miejsce === w.id).length
                            const meta = [l?.opowiesci ? `${l.opowiesci} ${l.opowiesci === 1 ? 'wpis' : l.opowiesci < 5 ? 'wpisy' : 'wpisów'}` : '', ob ? `${ob} ${ob === 1 ? 'obiekt' : ob < 5 ? 'obiekty' : 'obiektów'}` : ''].filter(Boolean).join(' · ')
                            return (
                                <div key={w.id} className="flex justify-between border-b border-[#e5e7eb] dark:border-[#374151] py-2" style={{ gap: 8, fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                                    <Link href={`/miejsca/${w.id}`}>{w.nazwa}</Link>
                                    <span className="text-gray-500" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>{meta || '—'}</span>
                                </div>
                            )
                        })}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 flex flex-col" style={{ gap: 2, fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                        <b className="text-current" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>w gminie także</b>
                        {tematyGminy.length > 0 && <span>tematy: {tematyGminy.map((t, i) => <span key={t.id}>{i > 0 && ' · '}<Link href={`/tematy/${t.id}`}>{t.nazwa}</Link></span>)}</span>}
                        <span>obiekty w terenie: {obiektyGminy.length} · materiały w archiwum: {materialyGminy.length}</span>
                    </div>
                </Sekcja>
            )}

            <Sekcja tytul={obszar ? 'opis' : 'historia'}>
                {maTekst(opisHtml) ? (
                    <>
                        <Tresc html={opisHtml} />
                        {zrodlo && (
                            <p className="text-gray-500" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>
                                {zrodlo.split(/(https?:\/\/\S+)/).map((cz, i) => (/^https?:\/\//.test(cz) ? <a key={i} href={cz} target="_blank" rel="noopener noreferrer">{decodeURI(cz.replace(/^https?:\/\//, ''))}</a> : cz))}
                            </p>
                        )}
                    </>
                ) : (
                    <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                        Opis historii {obszar ? 'tego obszaru' : 'tej miejscowości'} jest w przygotowaniu.
                    </p>
                )}
            </Sekcja>

            {(swiatynie.length > 0 || !obszar) && (
                <Sekcja tytul="w terenie">
                    <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(13px * var(--font-scale, 1))', marginTop: '-0.4rem' }}>kapliczki, krzyże, cmentarze, szkoły, młyny…</p>
                    {swiatynie.length > 0 && (
                        <ul className="flex flex-col" style={{ gap: 6 }}>
                            {swiatynie.map((o) => (
                                <li key={o.id} className="flex items-center" style={{ gap: 8, fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                                    <span style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: tarczaObiektu(o.rodzaj, RODZAJE_OBIEKTOW[o.rodzaj] ?? o.rodzaj, 26, o.istnieje) }} />
                                    <Link href={`/obiekty/${o.id}`}>{o.nazwa}</Link>
                                    <span className="text-gray-500" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>
                                        {[o.czas && formatujEdtf(o.czas), !o.istnieje && 'nie istnieje'].filter(Boolean).join(' · ')}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="text-gray-600 dark:text-gray-400 flex flex-wrap items-baseline" style={{ fontSize: 'calc(14px * var(--font-scale, 1))', gap: '0 6px' }}>
                        <span>{swiatynie.length ? 'Znasz inne miejsce we wsi (mogiłę, młyn, figurę)?' : 'Nie ma tu jeszcze żadnych miejsc. Znasz kapliczkę, krzyż, mogiłę albo dawny młyn?'}</span>
                        <Zgloszenie rodzaj="miejsce" adres={`/miejsca/${m.id}`} tytul={m.nazwa} wariant="link" />
                    </div>
                </Sekcja>
            )}

            {planyWsi.length > 0 && (
                <Sekcja tytul="plany i schematy">
                    <ListaPlanow plany={planyWsi} />
                </Sekcja>
            )}

            {zData.length > 0 && (
                <Sekcja tytul="oś czasu">
                    <ol className="border-l-2 border-[#d1d5db] dark:border-[#4b5563] ml-1">
                        {zData.map((t) => (
                            <li key={t.id} className="flex flex-wrap gap-x-4 py-1 pl-4" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                                <span className="font-bold" style={{ minWidth: '7rem' }}>{formatujEdtf(t.czas)}</span>
                                <Link href={`/tematy/${t.id}`}>{t.nazwa}</Link>
                            </li>
                        ))}
                    </ol>
                </Sekcja>
            )}

            {bezDaty.length > 0 && (
                <Sekcja tytul="tematy">
                    <Metki elementy={bezDaty.map((t) => ({ tekst: t.nazwa, href: `/tematy/${t.id}` }))} />
                </Sekcja>
            )}

            {(ksiegiWsi.some((p) => p.ksiegi.length > 0) || m.parafie.length > 0) && (
                <Sekcja tytul="księgi metrykalne">
                    {!ksiegiWsi.some((p) => p.ksiegi.length > 0) && <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>Spis ksiąg parafii tej wsi jest w przygotowaniu.</p>}
                    {ksiegiWsi.filter((p) => p.ksiegi.length > 0).map((p) => (
                        <div key={p.parafia.id} className="flex flex-col" style={{ gap: 6 }}>
                            <p style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                                <Link href={`/biblioteka/ksiegi#${p.parafia.id}`}>{p.parafia.nazwa}</Link>
                                <span className="text-gray-500"> · {WYZNANIA_PARAFII[p.parafia.wyznanie] ?? p.parafia.wyznanie}</span>
                            </p>
                            <TabelaKsiag ksiegi={p.ksiegi} />
                        </div>
                    ))}
                    <Link href={`/biblioteka/ksiegi?miejsce=${m.id}`} style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>pełny spis z paskiem lat →</Link>
                </Sekcja>
            )}

            <Kreski />
            <Sekcja tytul="wpisy i materiały">
                {opow.length > 0 && <ListaOpowiesci opowiesci={opow} nazwyMiejsc={nazwyMiejsc} />}
                {mat.length > 0 && <ListaMaterialow materialy={mat} />}
                {opow.length === 0 && mat.length === 0 && (
                    <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                        Nie ma jeszcze wpisów ani materiałów o {obszar ? 'tym obszarze' : 'tej miejscowości'}. Masz zdjęcie, dokument albo wspomnienie?
                    </p>
                )}
                <div><Zgloszenie rodzaj="material" adres={`/miejsca/${m.id}`} tytul={m.nazwa} /></div>
            </Sekcja>

            {(siec.odnosniki.length > 0 || siec.wzmianki.length > 0) && <Kreski />}
            <Powiazania dane={siec} />

            <div className="border-t border-[#e5e7eb] dark:border-[#374151] flex flex-wrap items-center" style={{ paddingTop: '1rem', gap: '0.6rem 1rem' }}>
                <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>Coś się nie zgadza albo wiesz więcej o tym miejscu?</span>
                <Zgloszenie rodzaj="poprawka" adres={`/miejsca/${m.id}`} tytul={m.nazwa} />
            </div>
        </Strona>
    )
}

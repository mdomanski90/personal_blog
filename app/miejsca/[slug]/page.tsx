import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from 'next-view-transitions'
import { miejsca, miejsce, nazwy, obiekty, obiektyDlaMiejsca, OBSZARY, opowiesciDlaMiejsca, poziomCzytelnika, RODZAJE_MIEJSC, RODZAJE_OBIEKTOW, tematyDlaMiejsca, WYZNANIA_MIEJSC, materialyDla, powiazania, kontekstTresci, ksiegiDlaMiejsca, parafie } from '@/lib/archiwum'
import { WYZNANIA_PARAFII } from '@/lib/ksiegi'
import { punktyMapy } from '@/lib/punkty-mapy'
import { tarczaObiektu } from '@/lib/tarcze'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml } from '@/lib/markdoc'
import { Metki, Sekcja, Strona, Tresc, TytulStrony, Wiersz, Kreski } from '../../components/Uklad'
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
    const punkty = m.wspolrzedne ? punktyMapy(wszystkie, await obiekty(poziom)) : []
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

    return (
        <Strona>
            <TytulStrony sciezka={[{ tekst: 'miejsca', href: '/miejsca' }]} akcje={<><PowrotDoMapy /><CopyLinkButton sciezka={`/miejsca/${m.id}`} /></>}>{m.nazwa}</TytulStrony>
            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))' }}>
                <div>
                    <Wiersz etykieta="typ">{RODZAJE_MIEJSC[m.rodzaj] ?? m.rodzaj}</Wiersz>
                    {gmina && gmina.id !== m.id && <Wiersz etykieta="gmina"><Link href={`/miejsca/${gmina.id}`}>{gmina.nazwa}</Link></Wiersz>}
                    {nadrzedne && (!gmina || nadrzedne.id !== gmina.id) && <Wiersz etykieta="należy do"><Link href={`/miejsca/${nadrzedne.id}`}>{nadrzedne.nazwa}</Link></Wiersz>}
                    {m.parafie.length > 0 && (
                        <Wiersz etykieta={m.parafie.length > 1 ? 'parafie' : 'parafia'}>
                            {m.parafie.map((p, i) => {
                                const par = wszystkieParafie.find((x) => x.id === p.parafia)
                                if (!par) return null
                                const okres = p.od != null || p.do != null ? ` (${p.od ?? '…'}–${p.do ?? '…'})` : ''
                                return (
                                    <span key={p.parafia + i} className="block">
                                        <Link href={`/biblioteka/ksiegi#${par.id}`}>{par.nazwa}</Link>
                                        <span className="text-gray-500" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}> {WYZNANIA_PARAFII[par.wyznanie] ?? par.wyznanie}{okres}</span>
                                    </span>
                                )
                            })}
                        </Wiersz>
                    )}
                    {m.wyznanie && <Wiersz etykieta="przeważające wyznanie przed 1875">{WYZNANIA_MIEJSC[m.wyznanie] ?? m.wyznanie}</Wiersz>}
                    {formyZapisu.length > 0 && <Wiersz etykieta="formy zapisu nazwy">{formyZapisu.join(' · ')}</Wiersz>}
                    {podrzedne.length > 0 && (
                        <Wiersz etykieta="obejmuje">
                            {podrzedne.map((p, i) => (
                                <span key={p.id}>{i > 0 && ', '}<Link href={`/miejsca/${p.id}`}>{p.nazwa}</Link></span>
                            ))}
                        </Wiersz>
                    )}
                    {m.sameAs && <Wiersz etykieta="zobacz też"><a href={m.sameAs} target="_blank" rel="noopener noreferrer">{m.sameAs.replace(/^https?:\/\//, '')}</a></Wiersz>}
                </div>
                {m.wspolrzedne && <MapaMiejscLeniwa punkty={punkty} srodek={m.wspolrzedne} wysokosc={300} />}
            </div>

            <Sekcja tytul={obszar ? 'opis' : 'historia'}>
                {opisHtml ? (
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

            {swiatynie.length > 0 && (
                <Sekcja tytul="w terenie">
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

            {ksiegiWsi.some((p) => p.ksiegi.length > 0) && (
                <Sekcja tytul="księgi metrykalne">
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

            {opow.length > 0 && (
                <>
                    <Kreski />
                    <Sekcja tytul="wpisy">
                        <ListaOpowiesci opowiesci={opow} nazwyMiejsc={nazwyMiejsc} />
                    </Sekcja>
                </>
            )}

            {mat.length > 0 && (
                <Sekcja tytul="materiały w archiwum">
                    <ListaMaterialow materialy={mat} />
                </Sekcja>
            )}

            {(siec.odnosniki.length > 0 || siec.wzmianki.length > 0) && <Kreski />}
            <Powiazania dane={siec} />
        </Strona>
    )
}

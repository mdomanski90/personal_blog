import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from 'next-view-transitions'
import { miejsca, miejsce, nazwy, obiekty, obiektyDlaMiejsca, OBSZARY, opowiesciDlaMiejsca, poziomCzytelnika, RODZAJE_MIEJSC, RODZAJE_OBIEKTOW, tematyDlaMiejsca, WYZNANIA_MIEJSC } from '@/lib/archiwum'
import { punktyMapy } from '@/lib/punkty-mapy'
import { tarczaSwiatyni, type RodzajSwiatyni } from '@/lib/tarcze'
import { formatujEdtf } from '@/lib/edtf'
import { naHtml } from '@/lib/markdoc'
import { Metki, Sekcja, Strona, Tresc, TytulStrony, Wiersz, Kreski } from '../../components/Uklad'
import ListaOpowiesci from '../../components/ListaOpowiesci'
import MapaMiejscLeniwa from '../../components/MapaMiejscLeniwa'
import CopyLinkButton from '../../components/CopyLinkButton'

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
    const opisHtml = naHtml(m.opis)
    const swiatynie = await obiektyDlaMiejsca(m.id, poziom)
    const punkty = m.wspolrzedne ? punktyMapy(wszystkie, await obiekty(poziom)) : []
    const obszar = OBSZARY.includes(m.rodzaj)

    return (
        <Strona>
            <TytulStrony sciezka={[{ tekst: 'miejsca', href: '/miejsca' }]}>{m.nazwa}</TytulStrony>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Metki elementy={[RODZAJE_MIEJSC[m.rodzaj] ?? m.rodzaj, ...m.inneNazwy]} />
                <CopyLinkButton sciezka={`/miejsca/${m.id}`} />
            </div>

            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))' }}>
                <div>
                    {nadrzedne && <Wiersz etykieta="należy do"><Link href={`/miejsca/${nadrzedne.id}`}>{nadrzedne.nazwa}</Link></Wiersz>}
                    {podrzedne.length > 0 && (
                        <Wiersz etykieta="obejmuje">
                            {podrzedne.map((p, i) => (
                                <span key={p.id}>{i > 0 && ', '}<Link href={`/miejsca/${p.id}`}>{p.nazwa}</Link></span>
                            ))}
                        </Wiersz>
                    )}
                    {m.wyznanie && <Wiersz etykieta="wyznanie przed 1875">{WYZNANIA_MIEJSC[m.wyznanie] ?? m.wyznanie}</Wiersz>}
                    {!obszar && (
                        <Wiersz etykieta="współrzędne">
                            {m.wspolrzedne ? `${m.wspolrzedne[0]}, ${m.wspolrzedne[1]}${m.przyblizone ? ' (przybliżone)' : ''}` : <span className="text-gray-500">brak</span>}
                        </Wiersz>
                    )}
                    {m.sameAs && <Wiersz etykieta="zobacz też"><a href={m.sameAs} target="_blank" rel="noopener noreferrer">{m.sameAs.replace(/^https?:\/\//, '')}</a></Wiersz>}
                </div>
                {m.wspolrzedne && <MapaMiejscLeniwa punkty={punkty} srodek={m.wspolrzedne} wysokosc={300} />}
            </div>

            {opisHtml && <Tresc html={opisHtml} />}

            {swiatynie.length > 0 && (
                <Sekcja tytul="świątynie">
                    <ul className="flex flex-col" style={{ gap: 6 }}>
                        {swiatynie.map((o) => (
                            <li key={o.id} className="flex items-center" style={{ gap: 8, fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                                <span style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: tarczaSwiatyni(o.rodzaj as RodzajSwiatyni, RODZAJE_OBIEKTOW[o.rodzaj] ?? o.rodzaj, 26, o.istnieje) }} />
                                <Link href={`/obiekty/${o.id}`}>{o.nazwa}</Link>
                                <span className="text-gray-500" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>
                                    {[o.czas && formatujEdtf(o.czas), !o.istnieje && 'nie istnieje'].filter(Boolean).join(' · ')}
                                </span>
                            </li>
                        ))}
                    </ul>
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

            {opow.length > 0 && (
                <>
                    <Kreski />
                    <Sekcja tytul="wpisy">
                        <ListaOpowiesci opowiesci={opow} nazwyMiejsc={nazwyMiejsc} />
                    </Sekcja>
                </>
            )}
        </Strona>
    )
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { kontekstTresci, materialyDla, miejsce, obiektyDlaMiejsca, opowiesciDlaMiejsca, opowiesciDlaTematu, poziomCzytelnika, RODZAJE_OBIEKTOW, temat, type Material, type Obiekt, type Opowiesc } from '@/lib/archiwum'
import { materialyZbioru, zbior } from '@/lib/paczka5'
import { naHtml, rozdzielZrodla } from '@/lib/markdoc'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { formatujEdtf } from '@/lib/edtf'
import { odmiana } from '@/lib/tekst'
import { numerKat } from '@/lib/katalog/dane'
import type { RodzajKat } from '@/lib/katalog/model'
import { dataWpisu, Strona, Tresc, TytulStrony } from '../../../components/Uklad'
import { TytulSekcji } from '../../../components/Wzorce'
import { PrzyciskDrukuj } from '../../../components/Druk'
import { obrazStrony } from '@/lib/pliki'

// KAT-05: „drukuj całość” – miejscowość, temat albo zbiór w jednym wydruku: strona tytułowa, spis z numerami
// katalogowymi, logiczna kolejność, ciągła numeracja stron (@page), każda pozycja od nowej kartki ze swoim nr kat.
// Tylko pozycje widoczne dla czytelnika (te same funkcje co strony – zasada 1.5).
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false } }

type Rodzaj = 'miejsce' | 'temat' | 'zbior'
const RODZAJE: Record<string, Rodzaj> = { miejsce: 'miejsce', temat: 'temat', zbior: 'zbior' }
const ADRES_KARTY: Record<Rodzaj, string> = { miejsce: '/miejsca', temat: '/tematy', zbior: '/archiwum/zbiory' }
const SCIEZKA: Record<Rodzaj, { tekst: string; href: string }> = { miejsce: { tekst: 'miejsca', href: '/miejsca' }, temat: { tekst: 'tematy', href: '/tematy' }, zbior: { tekst: 'zbiory', href: '/archiwum/zbiory' } }

type Pozycja =
    | { rodzaj: 'wpis'; x: Opowiesc }
    | { rodzaj: 'material'; x: Material }
    | { rodzaj: 'obiekt'; x: Obiekt }
const ETYKIETA: Record<Pozycja['rodzaj'], string> = { wpis: 'wpis', material: 'materiał archiwalny', obiekt: 'obiekt w terenie' }
const idPozycji = (p: Pozycja) => `poz-${p.rodzaj}-${p.x.id}`
const nazwaPozycji = (p: Pozycja) => (p.rodzaj === 'wpis' ? p.x.tytul : p.x.nazwa)

export default async function DrukujCalosc({ params }: { params: Promise<{ rodzaj: string; id: string }> }) {
    const pr = await params
    const rodzaj = RODZAJE[pr.rodzaj]
    if (!rodzaj) notFound()
    const poziom = await poziomCzytelnika()
    const ktx = await kontekstTresci(poziom)

    let tytul = '', opis = '', linia = ''
    let pozycje: Pozycja[] = []
    if (rodzaj === 'miejsce') {
        const m = await miejsce(pr.id, poziom)
        if (!m) notFound()
        tytul = m.nazwa; opis = naHtml(m.opis, ktx); linia = 'miejscowość'
        // kolejność: obiekty w terenie → wpisy (od najstarszego) → materiały
        pozycje = [
            ...(await obiektyDlaMiejsca(m.id, poziom)).map((x) => ({ rodzaj: 'obiekt' as const, x })),
            ...[...(await opowiesciDlaMiejsca(m.id, poziom))].reverse().map((x) => ({ rodzaj: 'wpis' as const, x })),
            ...(await materialyDla('miejsce', m.id, poziom)).map((x) => ({ rodzaj: 'material' as const, x })),
        ]
    } else if (rodzaj === 'temat') {
        const t = await temat(pr.id, poziom)
        if (!t) notFound()
        tytul = t.nazwa; opis = naHtml(t.opis, ktx); linia = ['temat', t.czas ? formatujEdtf(t.czas) : ''].filter(Boolean).join(' · ')
        pozycje = [
            ...[...(await opowiesciDlaTematu(t.id, poziom))].reverse().map((x) => ({ rodzaj: 'wpis' as const, x })),
            ...(await materialyDla('temat', t.id, poziom)).map((x) => ({ rodzaj: 'material' as const, x })),
        ]
    } else {
        const z = await zbior(pr.id, poziom)
        if (!z) notFound()
        tytul = z.nazwa; opis = naHtml(z.opis); linia = 'zbiór'
        pozycje = (await materialyZbioru(z.id, poziom)).map((x) => ({ rodzaj: 'material' as const, x }))
    }
    const nrCalosci = numerKat(rodzaj as RodzajKat, pr.id)
    const nr = (p: Pozycja) => numerKat(p.rodzaj, p.x.id)

    return (
        <Strona nrKat={nrCalosci}>
            {/* strona tytułowa */}
            <section className="druk-calosc-tytulowa">
                <TytulStrony sciezka={[SCIEZKA[rodzaj], { tekst: tytul, href: `${ADRES_KARTY[rodzaj]}/${pr.id}` }]} akcje={<PrzyciskDrukuj />}>{tytul} – całość</TytulStrony>
                <p className="karta-linia">{[linia, nrCalosci && `nr kat. ${nrCalosci}`, odmiana(pozycje.length, ['pozycja', 'pozycje', 'pozycji'])].filter(Boolean).join(' · ')}</p>
                <p className="tekst-opis druk-calosc-uwaga">Wersja do druku: każda pozycja zaczyna się od nowej kartki; w spisie – numery katalogowe. Drukowane są tylko pozycje widoczne na stronie.</p>
                <nav aria-label="spis treści wydruku" className="druk-calosc-spis">
                    <TytulSekcji>spis treści</TytulSekcji>
                    <ol>
                        {opis && <li><a href="#poz-opis" className="odn">{rodzaj === 'miejsce' ? 'historia' : 'opis'}</a></li>}
                        {pozycje.map((p) => (
                            <li key={idPozycji(p)}>
                                <span className="nr-kat">{nr(p) ?? '—'}</span> <a href={`#${idPozycji(p)}`} className="odn">{nazwaPozycji(p)}</a> <span className="ot-drobne">· {ETYKIETA[p.rodzaj]}</span>
                            </li>
                        ))}
                    </ol>
                </nav>
            </section>

            {opis && (
                <section id="poz-opis" className="druk-calosc-pozycja">
                    <TytulSekcji>{rodzaj === 'miejsce' ? 'historia' : 'opis'}</TytulSekcji>
                    <Tresc html={opis} pusta={null} />
                </section>
            )}

            {pozycje.map((p) => {
                const n = nr(p)
                return (
                    <section key={idPozycji(p)} id={idPozycji(p)} className="druk-calosc-pozycja">
                        <p className="karta-linia">{[n && `nr kat. ${n}`, ETYKIETA[p.rodzaj], p.rodzaj === 'wpis' ? dataWpisu(p.x.data) : p.rodzaj === 'material' ? (RODZAJE_MATERIALOW[p.x.rodzaj] ?? p.x.rodzaj) : (RODZAJE_OBIEKTOW[p.x.rodzaj] ?? p.x.rodzaj)].filter(Boolean).join(' · ')}</p>
                        <h2 className="druk-calosc-tytul">{nazwaPozycji(p)}</h2>
                        {p.rodzaj === 'wpis' && <Tresc html={naHtml(p.x.tresc, ktx)} pusta={null} />}
                        {p.rodzaj === 'obiekt' && <Tresc html={naHtml(p.x.opis, ktx)} pusta="opis obiektu jest w przygotowaniu." />}
                        {p.rodzaj === 'material' && <MaterialDoDruku m={p.x} ktx={ktx} />}
                    </section>
                )
            })}
        </Strona>
    )
}

function MaterialDoDruku({ m, ktx }: { m: Material; ktx: Awaited<ReturnType<typeof kontekstTresci>> }) {
    const cz = rozdzielZrodla(m.opis)
    const teksty: [string, string][] = [['transkrypcja', naHtml(cz.transkrypcja, ktx)], ['oryginał', naHtml(cz.oryginal, ktx)], ['tłumaczenie', naHtml(cz.tlumaczenie, ktx)]]
    const zrodlo = [m.miejscePrzechowywania, m.sygnatura, m.prawa].filter(Boolean).join(' · ')
    return (
        <>
            <Tresc html={naHtml(cz.reszta, ktx)} pusta={null} />
            {m.strony.map((s) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={s.adres} src={obrazStrony(s.adres, 1200)} alt={`${m.nazwa}${s.podpis ? ` – ${s.podpis}` : ''}`} className="szt-druk-skan druk-calosc-skan" />
            ))}
            {zrodlo && <p className="podpis-zrodla"><span>źródło:</span> {zrodlo}</p>}
            {teksty.filter(([, h]) => h).map(([t, h]) => (
                <div key={t} className="szt-druk-tekst">
                    <h3 className="tytul-sekcji">{t}{m.opracowal && t !== 'oryginał' ? ` (${m.opracowal})` : ''}</h3>
                    <div className="post-content" dangerouslySetInnerHTML={{ __html: h }} />
                </div>
            ))}
        </>
    )
}

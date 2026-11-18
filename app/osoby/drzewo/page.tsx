// PK (uwaga właściciela 18.11): „całe drzewo” – potomkowie najstarszej znanej pary, ten sam rysunek, pasek i pełny ekran co na karcie osoby.
// Przy kilku niepowiązanych częściach drzewa – wybór rodu (?od=<osoba>). Liczby i korzenie tylko z osób widocznych dla czytelnika.
import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { poziomCzytelnika, widoczne } from '@/lib/archiwum'
import { stanOsob } from '@/lib/osoby/dane'
import { drzewoHtml } from '@/lib/osoby/drzewo'
import { DOMYSLNE_CALEGO_DRZEWA, parametryDrzewa } from '@/lib/osoby/drzewo-adres'
import { rodyDrzewa, wybranyRod } from '@/lib/osoby/rody'
import { odmiana } from '@/lib/tekst'
import { PastylkaFiltra, RzadFiltrow } from '@/app/components/Wzorce'
import DrzewoKarty from '../../components/DrzewoKarty'
import { Strona, TytulStrony } from '../../components/Uklad'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'całe drzewo · osoby · odniepamieci.pl' }

export default async function CaleDrzewo({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const sp = await searchParams
    const poziom = await poziomCzytelnika()
    const s = await stanOsob()
    const rody = rodyDrzewa(s.drzewo, (x) => widoczne(s.widocznosc(x), poziom))
    const rod = wybranyRod(rody, sp.od)
    const html = rod ? drzewoHtml(s, rod.korzen, { ...parametryDrzewa(sp, DOMYSLNE_CALEGO_DRZEWA), wTabeli: true, idFigury: 'cale-drzewo' }, poziom) : ''
    const adres = (id: string) => `/osoby/drzewo?od=${encodeURIComponent(id)}`
    return (
        <Strona uklad="pelna">
            <TytulStrony sciezka={[{ tekst: 'osoby', href: '/osoby' }]}>całe drzewo</TytulStrony>
            <div className="wstep-dzialu-tekst">
                <p className="tekst-opis-maly text-[var(--tekst-opis)]">
                    {rod
                        ? <>Potomkowie najstarszej znanej pary: <Link href={`/osoby/${rod.korzen}`}>{rod.nazwa}</Link>{rod.lata && ` (${rod.lata})`}. Przodków małżonków zobaczysz na ich kartach – kliknij osobę na drzewie.</>
                        : 'Drzewo nie zostało jeszcze wczytane albo żadna jego część nie jest widoczna publicznie.'}
                </p>
            </div>
            {rody.length > 1 && (
                <div className="katalog-filtry">
                    <RzadFiltrow etykieta="ród – osobne części drzewa">
                        {rody.map((r) => (
                            <PastylkaFiltra key={r.korzen} href={adres(r.korzen)} aktywny={r.korzen === rod?.korzen} title={odmiana(r.osob, ['osoba', 'osoby', 'osób'])} liczba={r.osob}>{r.nazwa}</PastylkaFiltra>
                        ))}
                    </RzadFiltrow>
                </div>
            )}
            {/* ramka jak tabela karty osoby – pasek drzewa widoczny także poza pełnym ekranem (P4) */}
            {html && <div className="osoba-tabela"><DrzewoKarty html={html} domyslne={DOMYSLNE_CALEGO_DRZEWA} /></div>}
        </Strona>
    )
}

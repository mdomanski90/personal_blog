import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Link } from 'next-view-transitions'
import { material, miejsce, obiekt, poziomCzytelnika } from '@/lib/archiwum'
import { wczytajUstawienia } from '@/lib/plany/dane'
import { planDlaCzytelnika } from '@/lib/plany/serwer'
import { Strona, TytulStrony } from '../../components/Uklad'
import CopyLinkButton from '../../components/CopyLinkButton'
import PrzegladarkaPlanu from '../../components/plan/PrzegladarkaPlanu'
import { CalyPanelu, WierszPanelu } from '../../components/plan/PanelPlanu'
import { osobyPlanu } from '@/lib/plany/rodzina'
import { PrzyciskDrukuj } from '../../components/Druk'
import { numerKat } from '@/lib/katalog/dane'
import { LiniaNrKat } from '../../components/NrKat'
import { CzescJakCytowac, LiniaKarty, WierszZglosil, Tabela } from '../../components/Karta'
import { katalog } from '@/lib/plany/typy'
import { opisPlanu } from '@/lib/plany/katalog'
import { numeryPlanu } from '@/lib/plany/model'
import { kwateryPlanu, opisKwater } from '@/lib/plany/przegladarka'
import { daneCytatu } from '@/lib/cytowanie'
import { formatujEdtf } from '@/lib/edtf'
import { DOKLADNOSCI, RODZAJE_PLANU, RODZAJE_ZRODLA, planGrobowy } from '@/lib/plany/metadane'

export const dynamic = 'force-dynamic'

type Parametry = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Parametry): Promise<Metadata> {
    const { slug } = await params
    const w = await planDlaCzytelnika(slug)
    return { title: w ? `${w.plan.tytul} · odniepamieci.pl` : 'odniepamieci.pl', robots: w?.plan.widocznosc === 'publiczne' ? undefined : { index: false } }
}

/**
 * Etap 3 · przeglądarka planu (CEM-02/03): Strona uklad="przegladarka" – nagłówek i stopka 1200 px, aplet (ramka z paskami,
 * mapa, PanelPlanu) do 1600 px; odstęp opis → aplet = 2 × --odstep-sekcji. Część „o planie” w pustym panelu (CEM-14):
 * źródło rysunku i numeracji z metadanych planu (dawniej zdanie na sztywno pod planem).
 */
export default async function PlanStrona({ params }: Parametry) {
    const { slug } = await params
    const w = await planDlaCzytelnika(slug)
    if (!w) notFound()
    // PH1 · jeden widok dokumentu: plan zrekonstruowany ze skanu ma jedną stronę – materiał w archiwum (gdy czytelnik go widzi)
    if (w.plan.zrodlo?.material && (await material(w.plan.zrodlo.material, await poziomCzytelnika()))) redirect(`/archiwum/${w.plan.zrodlo.material}#warstwa-rekonstrukcji`)
    const { plan, poziom } = w
    const poz = await poziomCzytelnika()
    const wies = plan.miejsce ? await miejsce(plan.miejsce, poz) : null
    const ob = plan.obiekt ? await obiekt(plan.obiekt, poz) : null
    const ustawienia = await wczytajUstawienia()
    const osoby = await osobyPlanu(plan, poz)
    const nrKat = numerKat('plan', plan.slug)
    const grobowy = planGrobowy(plan)
    // plansza 17.11: linia pod tytułem – rodzaj · miejscowość · obiekt (VIEW-07: odnośnik do karty obiektu) · kwatery · groby · rysunek
    const typy = katalog(ustawienia)
    const opis = opisPlanu(plan, typy)
    const linia = [
        opis.linia.split(' · ')[0],
        wies && { tekst: wies.nazwa, href: `/miejsca/${wies.id}` },
        ob && { tekst: ob.nazwa, href: `/obiekty/${ob.id}` },
        grobowy && opisKwater(kwateryPlanu(plan, typy, numeryPlanu(plan)).map((k) => k.nazwa)),
        opis.pola.find(([e]) => e === 'na planie')?.[1],
        plan.sporzadzono && `rysunek ${formatujEdtf(plan.sporzadzono)}`,
    ]
    const zrodloRysunku = [plan.rodzajZrodla && RODZAJE_ZRODLA[plan.rodzajZrodla], plan.zrodlo?.opis].filter(Boolean).join(' – ')
    const oPlanie = (
        <>
            <WierszPanelu e="rodzaj">{plan.rodzaj ? RODZAJE_PLANU[plan.rodzaj] : null}</WierszPanelu>
            <WierszPanelu e="stan na">{plan.okres ? formatujEdtf(plan.okres) : null}</WierszPanelu>
            <WierszPanelu e="sporządzono">{plan.sporzadzono ? formatujEdtf(plan.sporzadzono) : null}</WierszPanelu>
            {/* plan cmentarza bez opisu źródła – dotychczasowe zdanie (opis źródła w edytorze planu je zastępuje) */}
            <WierszPanelu e="rysunek">{zrodloRysunku || (grobowy ? 'uproszczony, na podstawie zdjęć lotniczych i oględzin w terenie' : 'źródło rysunku nie zostało jeszcze opisane')}</WierszPanelu>
            <WierszPanelu e="twórca">{plan.tworca}</WierszPanelu>
            <WierszPanelu e="dokładność">{plan.dokladnosc ? DOKLADNOSCI[plan.dokladnosc] : null}</WierszPanelu>
            <WierszPanelu e="zasięg">{plan.zasieg}</WierszPanelu>
            <WierszPanelu e="prawa">{plan.prawa}</WierszPanelu>
            {grobowy && (
                <CalyPanelu>
                    <p className="plan-panel-drobne">
                        Groby osób zmarłych w ciągu ostatnich {ustawienia.progLat} lat – bez napisów i nazwisk
                        {poziom === 'bliscy' ? ' (jesteś zalogowany – widzisz je).' : <> (widoczne <Link href={`/zaloguj?wroc=${encodeURIComponent(`/plany/${plan.slug}`)}`} className="odn">dla bliskich</Link>).</>}
                    </p>
                </CalyPanelu>
            )}
        </>
    )
    return (
        <Strona uklad="przegladarka" nrKat={nrKat} akcje={<><CopyLinkButton sciezka={`/plany/${plan.slug}`} /><PrzyciskDrukuj /></>}>
            <TytulStrony
                sciezka={[{ tekst: 'miejsca', href: '/miejsca' }, ...(wies ? [{ tekst: wies.nazwa, href: `/miejsca/${wies.id}` }] : []), ...(ob ? [{ tekst: ob.nazwa, href: `/obiekty/${ob.id}` }] : [])]}
            >
                {plan.tytul}
            </TytulStrony>
            <LiniaKarty elementy={linia} className="karta-linia przegladarka-linia" />
            <LiniaNrKat nr={nrKat} />
            {plan.opis && <p className="przegladarka-opis">{plan.opis}</p>}
            <PrzegladarkaPlanu plan={plan} ustawienia={ustawienia} zalogowany={poziom === 'bliscy'} osoby={osoby} oPlanie={oPlanie} />
            {/* uwaga 16.11: „jak cytować” na każdej karcie, także planu */}
            <Tabela etykieta={`${plan.tytul} – jak cytować`}>
                <WierszZglosil v={plan.zglosil} />
                <CzescJakCytowac plik={plan.slug} dane={daneCytatu({ tytul: plan.tytul, sciezka: `/plany/${plan.slug}`, nrKat, rodzaj: 'plan' })} />
            </Tabela>
        </Strona>
    )
}

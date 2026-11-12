import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from 'next-view-transitions'
import { miejsce, obiekt, poziomCzytelnika } from '@/lib/archiwum'
import { wczytajUstawienia } from '@/lib/plany/dane'
import { planDlaCzytelnika } from '@/lib/plany/serwer'
import { Strona, TytulStrony } from '../../components/Uklad'
import CopyLinkButton from '../../components/CopyLinkButton'
import PlanInteraktywny from '../../components/plan/PlanInteraktywny'

export const dynamic = 'force-dynamic'

type Parametry = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Parametry): Promise<Metadata> {
    const { slug } = await params
    const w = await planDlaCzytelnika(slug)
    return { title: w ? `${w.plan.tytul} · odniepamieci.pl` : 'odniepamieci.pl', robots: w?.plan.widocznosc === 'publiczne' ? undefined : { index: false } }
}

export default async function PlanStrona({ params }: Parametry) {
    const { slug } = await params
    const w = await planDlaCzytelnika(slug)
    if (!w) notFound()
    const { plan, poziom } = w
    const poz = await poziomCzytelnika()
    const wies = plan.miejsce ? await miejsce(plan.miejsce, poz) : null
    const ob = plan.obiekt ? await obiekt(plan.obiekt, poz) : null
    const ustawienia = await wczytajUstawienia()
    return (
        <Strona szeroka akcje={<CopyLinkButton sciezka={`/plany/${plan.slug}`} />}>
            <TytulStrony
                sciezka={[{ tekst: 'miejsca', href: '/miejsca' }, ...(wies ? [{ tekst: wies.nazwa, href: `/miejsca/${wies.id}` }] : []), ...(ob ? [{ tekst: ob.nazwa, href: `/obiekty/${ob.id}` }] : [])]}
            >
                {plan.tytul}
            </TytulStrony>
            {plan.opis && <p className="leading-relaxed" style={{ margin: 0 }}>{plan.opis}</p>}
            <PlanInteraktywny plan={plan} ustawienia={ustawienia} zalogowany={poziom === 'bliscy'} />
            <p className="text-gray-500" style={{ fontSize: 12, margin: 0 }}>
                Rysunek uproszczony na podstawie zdjęć lotniczych i oględzin w terenie. Groby osób zmarłych w ciągu ostatnich {ustawienia.progLat} lat – bez napisów i nazwisk
                {poziom === 'bliscy' ? ' (jesteś zalogowany – widzisz je)' : <> (widoczne <Link href={`/zaloguj?wroc=${encodeURIComponent(`/plany/${plan.slug}`)}`}>dla bliskich</Link>)</>}.
            </p>
        </Strona>
    )
}

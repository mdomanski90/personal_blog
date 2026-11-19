import PlanTerenowy from './PlanTerenowy'

// P7b (TER-01): plan w terenie – położenie z telefonu, zdjęcie, napis, notatka (plansza „plan w terenie”).
export default async function Strona({ params }: { params: Promise<{ slug: string }> }) {
    return <PlanTerenowy slug={(await params).slug} />
}

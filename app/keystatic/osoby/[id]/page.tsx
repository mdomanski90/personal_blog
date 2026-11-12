import EdytorOsoby from './EdytorOsoby'

// Edytor osoby – w panelu (pod /keystatic, za hasłem panelu).
export const dynamic = 'force-dynamic'

export default async function Osoba({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <EdytorOsoby id={id} />
}

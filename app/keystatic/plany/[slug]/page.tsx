import Edytor from './Edytor'

// Edytor planu obiektu – w panelu (pod /keystatic, za hasłem panelu).
export const dynamic = 'force-dynamic'

export default async function EdytorPlanu({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    return <Edytor slug={slug} />
}

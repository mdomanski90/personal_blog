import { Link } from 'next-view-transitions'
import type { Plan } from '@/lib/plany/model'
import { katalog, typGrobu } from '@/lib/plany/typy'

/** Lista planów przy miejscu albo obiekcie (odnośniki do pełnych planów). */
export default function ListaPlanow({ plany }: { plany: Plan[] }) {
    const typy = katalog()
    return (
        <ul className="flex flex-col" style={{ gap: 6 }}>
            {plany.map((p) => {
                const groby = p.elementy.filter((e) => typGrobu(typy.get(e.typ))).length
                return (
                    <li key={p.slug} className="flex flex-wrap items-baseline" style={{ gap: 8, fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                        <Link href={`/plany/${p.slug}`}>{p.tytul}</Link>
                        <span className="text-gray-500" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>{[groby ? `${groby} grobów` : null, `${p.elementy.length} elementów`].filter(Boolean).join(' · ')}</span>
                    </li>
                )
            })}
        </ul>
    )
}

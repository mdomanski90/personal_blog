import * as React from 'react'
import { Link } from 'next-view-transitions'

const RAMKA = 'border-[#d6d1c6] dark:border-[#4b5563]'
// Komórki wchodzą 1px pod zaokrągloną ramkę, więc ich kreski na brzegach się chowają.
const KOMORKA: React.CSSProperties = { margin: '0 -1px -1px 0' }
const ODNOSNIK: React.CSSProperties = { fontSize: 'calc(15px * var(--font-scale, 1))' }

/** Tabela miejscowości z zaokrąglonymi rogami; każda komórka prowadzi do strony miejscowości. */
export default function SiatkaMiejsc({ miejsca }: { miejsca: { id: string; nazwa: string }[] }) {
    if (!miejsca.length) return null
    return (
        <ul
            className={`grid overflow-hidden border ${RAMKA}`}
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(11rem, 1fr))', borderRadius: '8px' }}
        >
            {miejsca.map((m) => (
                <li key={m.id} className={`border-r border-b ${RAMKA}`} style={KOMORKA}>
                    <Link href={`/miejsca/${m.id}`} className="block px-3 py-2 !no-underline hover:bg-muted" style={ODNOSNIK}>
                        {m.nazwa}
                    </Link>
                </li>
            ))}
        </ul>
    )
}

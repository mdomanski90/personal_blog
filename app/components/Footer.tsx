import * as React from "react"
import { Link } from 'next-view-transitions'
import { connection } from 'next/server'
import { miejsca } from '@/lib/archiwum'
import { WIERSZE_STOPKI, kluczMiejsca } from '@/lib/kregi'

// Miejscowości w stopce – kolejność i grupy ustalone ręcznie (lib/kregi.ts).
// Nazwa z własną publiczną stroną staje się linkiem (dopasowanie po nazwie, bez względu na łącznik i wielkość liter);
// pozostałe są zwykłym tekstem, dopóki nie powstanie ich strona.
const GRUPY = WIERSZE_STOPKI
const klucz = kluczMiejsca

async function MiejscaStopki() {
    // treści czytane przy każdym wyświetleniu, nie przy budowaniu (strony statyczne też mają stopkę)
    await connection()
    const lista = await miejsca('publiczne')
    const wgNazwy = new Map<string, { id: string; rodzaj: string }>()
    for (const m of lista) if (m.rodzaj !== 'gmina' && m.rodzaj !== 'kraina') wgNazwy.set(klucz(m.nazwa), { id: m.id, rodzaj: m.rodzaj })
    return (
        <nav aria-label="miejscowości" className="stopka-miejsca">
            {GRUPY.map((grupa, i) => (
                <p key={i}>
                    {grupa.map((nazwa, j) => {
                        const m = wgNazwy.get(klucz(nazwa))
                        return (
                            <React.Fragment key={nazwa}>
                                <span style={{ whiteSpace: 'nowrap' }}>
                                    {m
                                        ? <Link href={`/miejsca/${m.id}`} className={m.rodzaj === 'miasto' ? 'miasto' : undefined}>{nazwa}</Link>
                                        : <span className="bez-strony">{nazwa}</span>}
                                    {j < grupa.length - 1 && <span className="kropka" aria-hidden="true">·</span>}
                                </span>
                                {j < grupa.length - 1 && ' '}
                            </React.Fragment>
                        )
                    })}
                </p>
            ))}
        </nav>
    )
}

export default function Footer() {

    return (
        <footer>
            <div aria-hidden="true" className="whitespace-nowrap overflow-hidden opacity-50">------------------------------------------------------------------------------------------------------------------------</div>
            <MiejscaStopki />
            {/* P7D-4 (AUD-06): stopka bez ramki „na sztywno” – spokojna linia z tokenów, jak okruszki */}
            <p className="stopka-dol">
                <span>© {new Date().getFullYear()} odniepamieci.pl</span>
                <a href="https://github.com/mdomanski90" target="_blank" rel="noopener noreferrer">github</a>
                <a href="https://mastodon.com.pl/@sirion" target="_blank" rel="noopener noreferrer">fediverse</a>
            </p>
        </footer>
    )
}

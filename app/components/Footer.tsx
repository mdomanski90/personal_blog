import * as React from "react"
import { Link } from 'next-view-transitions'
import { miejsca } from '@/lib/archiwum'

// Miejscowości w stopce – kolejność i grupy ustalone ręcznie (okolice Łosic, okolice Międzyrzeca, Krzesk).
// Nazwa z własną publiczną stroną staje się linkiem (dopasowanie po nazwie, bez względu na łącznik i wielkość liter);
// pozostałe są zwykłym tekstem, dopóki nie powstanie ich strona.
const GRUPY: string[][] = [
    ['Aleksandrówka', 'Bejdy', 'Bolesty', 'Dawidy', 'Hadynów', 'Klimy', 'Korczówka', 'Korczówka-Kolonia', 'Łepki Nowe', 'Łepki Stare', 'Mszanna', 'Olszanka', 'Pietrusy', 'Próchenki', 'Radlnia', 'Szawły', 'Szydłówka', 'Wyczółki', 'Łosice'],
    ['Kożuszki', 'Krawce', 'Krzewica', 'Łuby', 'Łuniew', 'Pościsze', 'Międzyrzec Podlaski'],
    ['Krzesk-Majątek', 'Krzesk Stary', 'Krzesk-Królowa Niwa'],
]

const klucz = (s: string) => s.toLocaleLowerCase('pl').replace(/[-–,]/g, ' ').replace(/\s+/g, ' ').trim()

async function MiejscaStopki() {
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
    const linkStyle = {
        fontSize: '14px',
        fontWeight: '400',
        height: '25px',
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        textTransform: 'lowercase' as const,
    }

    return (
        <footer>
            <div aria-hidden="true" className="whitespace-nowrap overflow-hidden opacity-50">------------------------------------------------------------------------------------------------------------------------</div>
            <MiejscaStopki />
            <div className="flex items-center border border-[#d6d1c6] dark:border-[#4b5563] w-fit">
                <div
                    style={linkStyle}
                    className="bg-muted text-current whitespace-nowrap font-semibold"
                >
                    © {new Date().getFullYear()} odniepamieci.pl
                </div>
                <a
                    href="https://github.com/mdomanski90"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkStyle}
                    className="text-current whitespace-nowrap !no-underline border-l border-[#d6d1c6] dark:border-[#4b5563] hover:opacity-80 transition-opacity"
                >
                    github
                </a>
                <a
                    href="https://mastodon.com.pl/@sirion"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkStyle}
                    className="text-current whitespace-nowrap !no-underline border-l border-[#d6d1c6] dark:border-[#4b5563] hover:opacity-80 transition-opacity"
                >
                    fediverse
                </a>
            </div>
        </footer>
    )
}

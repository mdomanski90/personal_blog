'use client'
// Panel administracyjny: wspólne menu boczne (na telefonie – pasek u góry) dla /keystatic/panel/*.
import * as React from 'react'
import { usePathname } from 'next/navigation'
import { CSS } from './wspolne'

const MENU: { href: string; nazwa: string; licznik?: boolean; zewn?: boolean }[] = [
    { href: '/keystatic/panel', nazwa: 'pulpit' },
    { href: '/keystatic/panel/zgloszenia', nazwa: 'zgłoszenia', licznik: true },
    { href: '/keystatic', nazwa: 'treści – Keystatic', zewn: true },
    { href: '/keystatic/panel/materialy', nazwa: 'materiały – strony skanów' },
    { href: '/keystatic/plany', nazwa: 'plany cmentarzy', zewn: true },
    { href: '/keystatic/osoby', nazwa: 'osoby i drzewo', zewn: true },
    { href: '/keystatic/panel/dostep', nazwa: 'dostęp' },
    { href: '/keystatic/panel/system', nazwa: 'kopie, eksport, ustawienia' },
]

export default function UkladPanelu({ children }: { children: React.ReactNode }) {
    const sciezka = usePathname()
    const [czeka, ustawCzeka] = React.useState(0)
    React.useEffect(() => {
        fetch('/api/keystatic/panel/zgloszenia', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).then((L: { stan: string }[]) => ustawCzeka(L.filter((z) => z.stan === 'nowe' || z.stan === 'odlozone').length)).catch(() => {})
    }, [sciezka])
    return (
        <div className="pn">
            <style>{CSS}</style>
            <aside className="pn-bok">
                <div className="pn-bok-podpis" style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
                    <b style={{ fontSize: 15 }}>odniepamieci.pl</b>
                    <span className="pn-maly">panel administracyjny</span>
                </div>
                <nav className="pn-nav" aria-label="Panel">
                    {MENU.map((m) => (
                        <a key={m.href} href={m.href} aria-current={sciezka === m.href || (m.href !== '/keystatic/panel' && !m.zewn && sciezka?.startsWith(m.href + '/')) ? 'page' : undefined}>
                            {m.nazwa}
                            {m.licznik && czeka > 0 && <span className="pn-licznik" aria-label={`${czeka} czeka`}>{czeka}</span>}
                            {m.zewn && <span aria-hidden="true" className="pn-szary">→</span>}
                        </a>
                    ))}
                </nav>
                <div className="pn-nav pn-bok-dol" style={{ marginTop: 'auto' }}>
                    <a href="/" target="_blank" rel="noreferrer">zobacz stronę <span aria-hidden="true">↗</span></a>
                </div>
            </aside>
            <main className="pn-glowna">{children}</main>
        </div>
    )
}

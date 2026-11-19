'use client'
// P7b (TER-01): rama „w terenie” – aplikacja na telefon w panelu (plansza „Teren – aplikacja na telefon”): górny pasek
// i dolne menu: plany · duży plus (nowe miejsce) · do wysłania · konto. Konto tylko terenowe nie widzi reszty panelu.
// P7b-2 (TER-06): praca bez internetu – service worker, pasek „Brak internetu…”, plakietka z liczbą czekających, wysyłka po
// otwarciu i po wznowieniu połączenia (decyzja 19.11: tylko przy otwartej aplikacji), dane planów starsze niż 30 dni usuwane.
import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Map as IkonaPlanow, Moon, Plus, Send, Sun, User } from 'lucide-react'
import type { KontoRamy } from './MenuKonta'
import { przygotujStrony, rejestrujSW, useKolejka, usunWygasle, wyslijKolejke } from './teren/pamiec'

export default function RamaTerenu({ konto, children }: { konto: KontoRamy | null; children: React.ReactNode }) {
    const sciezka = usePathname() ?? ''
    const { resolvedTheme, setTheme } = useTheme()
    const [zamontowany, ustawZamontowany] = React.useState(false)
    React.useEffect(() => ustawZamontowany(true), [])
    const ciemny = zamontowany && resolvedTheme === 'dark'
    const maPanel = !konto || konto.uprawnienia.includes('panel')
    const tu = (adres: string, dokladnie = false) => ((dokladnie ? sciezka === adres : sciezka.startsWith(adres)) ? 'page' as const : undefined)
    const naPlanie = sciezka.startsWith('/keystatic/teren/plan/')
    const { pozycje, bezSieci, zaloguj } = useKolejka()
    React.useEffect(() => {
        rejestrujSW().then(() => przygotujStrony()).catch(() => {})
        usunWygasle().catch(() => {})
        wyslijKolejke().catch(() => {})
        const wroc = () => { wyslijKolejke().catch(() => {}); przygotujStrony().catch(() => {}) }
        window.addEventListener('online', wroc)
        return () => window.removeEventListener('online', wroc)
    }, [])
    const czeka = pozycje.length
    return (
        <div className="pn tr pn-widok-teren">
            <link rel="manifest" href="/teren.webmanifest" />
            <a href="#panel-tresc" className="pn-pomin">przejdź do treści</a>
            <header className="pn-gora">
                <Link href="/keystatic/teren" className="pn-marka">odniepamieci.pl<span>w terenie</span></Link>
                <div className="pn-gora-prawa">
                    {maPanel && <a href="/keystatic/panel" className="pn-gora-link">panel</a>}
                    <button type="button" className="pn-ikona-btn" aria-label="przełącz motyw (jasny / ciemny)" title="przełącz motyw (jasny / ciemny)" onClick={() => setTheme(ciemny ? 'light' : 'dark')}>
                        {!zamontowany ? <Moon aria-hidden className="pn-niewidoczne" /> : ciemny ? <Sun aria-hidden /> : <Moon aria-hidden />}
                    </button>
                </div>
            </header>
            <main id="panel-tresc" tabIndex={-1} className={`tr-glowna${naPlanie ? ' tr-glowna-plan' : ''}`}>
                {bezSieci && <p className="pn-ostrz tr-pasek" role="status"><span>Brak internetu – możesz pracować dalej. Dane zostaną przesłane po wznowieniu połączenia.</span></p>}
                {!bezSieci && zaloguj && czeka > 0 && <p className="pn-ostrz tr-pasek" role="status"><span>Sesja wygasła – <a href={`/zaloguj?wroc=${encodeURIComponent(sciezka)}`}>zaloguj się</a>, żeby wysłać to, co czeka w telefonie ({czeka}).</span></p>}
                {children}
            </main>
            <nav className="tr-dol" aria-label="w terenie">
                <Link href="/keystatic/teren" aria-current={tu('/keystatic/teren', true) ?? (naPlanie ? 'page' : undefined)}><IkonaPlanow aria-hidden />plany</Link>
                <Link href="/keystatic/teren/nowe" className="tr-plus" aria-label="nowe miejsce" aria-current={tu('/keystatic/teren/nowe')}><Plus aria-hidden /></Link>
                <Link href="/keystatic/teren/wyslij" aria-current={tu('/keystatic/teren/wyslij')}><Send aria-hidden />do wysłania{czeka > 0 && <span className="tr-plakietka"><span className="pn-ukryte">, czeka: </span>{czeka}</span>}</Link>
                <Link href="/keystatic/teren/konto" aria-current={tu('/keystatic/teren/konto')}><User aria-hidden />konto</Link>
            </nav>
        </div>
    )
}

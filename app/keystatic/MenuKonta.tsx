'use client'
// P7a (KON-01): imię i rola w pasku panelu; menu z przełącznikiem ról (plansza „dwie role – przełącznik w pasku”).
// Przełączenie na administratora = ponowne użycie klucza dostępu (Pocket ID), najwyżej 30 minut; powrót do roli na co dzień – od razu.
import * as React from 'react'
import { ChevronDown, CircleUserRound } from 'lucide-react'

export interface KontoRamy {
    imie: string; rola: string; naCoDzien: string | null
    administrator: boolean; administratorDo: number | null; mozeAdministrator: boolean
    uprawnienia: string[]
}

const minuty = (doKiedy: number | null) => (doKiedy ? Math.max(1, Math.ceil((doKiedy * 1000 - Date.now()) / 60000)) : 0)

export default function MenuKonta({ konto, sciezka }: { konto: KontoRamy; sciezka: string }) {
    const [otwarte, ustawOtwarte] = React.useState(false)
    const [zostalo, ustawZostalo] = React.useState(0)
    const przycisk = React.useRef<HTMLButtonElement>(null)
    const menu = React.useRef<HTMLDivElement>(null)
    const id = React.useId()
    React.useEffect(() => {
        const licz = () => ustawZostalo(konto.administrator ? minuty(konto.administratorDo) : 0)
        licz()
        const t = window.setInterval(licz, 30_000)
        return () => window.clearInterval(t)
    }, [konto.administrator, konto.administratorDo])
    React.useEffect(() => {
        if (!otwarte) return
        menu.current?.querySelector<HTMLElement>('a,button')?.focus()
        const klawisz = (e: KeyboardEvent) => { if (e.key === 'Escape') { ustawOtwarte(false); przycisk.current?.focus() } }
        document.addEventListener('keydown', klawisz)
        // treść strony pod otwartym menu jest nieaktywna (jak pod oknem): nic nie zostaje częściowo przykryte i klikalne
        const tresc = document.getElementById('panel-tresc')
        tresc?.setAttribute('inert', '')
        return () => { document.removeEventListener('keydown', klawisz); tresc?.removeAttribute('inert') }
    }, [otwarte])
    React.useEffect(() => { ustawOtwarte(false) }, [sciezka])
    const tu = sciezka || '/keystatic/panel'
    return (
        <div className="pn-konto">
            <button ref={przycisk} type="button" className="pn-btn pn-btn-maly pn-konto-btn" aria-expanded={otwarte} aria-controls={id} aria-label={`konto: ${konto.imie}, ${konto.rola}`} onClick={() => ustawOtwarte((o) => !o)}>
                <CircleUserRound aria-hidden className="pn-konto-znak" /><span className="pn-konto-imie">{konto.imie}</span><span className="pn-konto-rola"> · {konto.rola}{konto.administrator && zostalo ? ` (${zostalo} min)` : ''}</span><ChevronDown aria-hidden className="pn-konto-strzalka" />
            </button>
            {/* zasłona pod menu: klik poza menu zamyka je, a przyciski strony nie są częściowo przykryte */}
            {otwarte && <div className="pn-konto-zaslona" aria-hidden="true" onClick={() => ustawOtwarte(false)} />}
            {otwarte && (
                <div ref={menu} id={id} className="pn-konto-menu" role="group" aria-label="konto i rola">
                    <p className="pn-etyk">pracujesz jako</p>
                    <ul className="pn-konto-role">
                        {konto.naCoDzien && <li aria-current={!konto.administrator ? 'true' : undefined}><b>{konto.naCoDzien}</b> – na co dzień</li>}
                        {konto.mozeAdministrator && <li aria-current={konto.administrator ? 'true' : undefined}><b>administrator</b> – na żądanie{konto.administrator && zostalo ? `, jeszcze ${zostalo} min` : ''}</li>}
                        {!konto.naCoDzien && !konto.mozeAdministrator && <li aria-current="true"><b>{konto.rola}</b></li>}
                    </ul>
                    {konto.mozeAdministrator && !konto.administrator && (
                        <>
                            <p className="pn-maly">Przełączenie na administratora wymaga ponownego użycia klucza dostępu i trwa najwyżej 30 minut – potem następuje powrót do roli {konto.naCoDzien ? `„${konto.naCoDzien}”` : 'na co dzień'}. Zmiany zrobione jako administrator są w historii oznaczone.</p>
                            <a className="pn-btn pn-btn-gl" href={`/api/konto/zaloguj?tryb=administrator&wroc=${encodeURIComponent(tu)}`}>przełącz – potwierdź kluczem</a>
                        </>
                    )}
                    {konto.administrator && (
                        <form method="post" action="/api/konto/rola">
                            <input type="hidden" name="wroc" value="/keystatic/panel" />
                            <button type="submit" className="pn-btn">wróć do roli {konto.naCoDzien ? `„${konto.naCoDzien}”` : 'na co dzień'}</button>
                        </form>
                    )}
                    <hr />
                    <a className="pn-konto-link" href="/moje-konto">moje konto</a>
                    <form method="post" action="/api/wyloguj">
                        <input type="hidden" name="wroc" value="/" />
                        <button type="submit" className="pn-konto-link">wyloguj</button>
                    </form>
                </div>
            )}
        </div>
    )
}

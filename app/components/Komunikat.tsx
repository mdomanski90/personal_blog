import * as React from 'react'

/**
 * P7B (JV-11): wspólny komunikat – zawsze słowo i ikona, kolor tylko wzmacnia.
 * `pusto` = brak wyników: przerywana ramka i od razu droga dalej (dzieci).
 */
export type RodzajKomunikatu = 'info' | 'uwaga' | 'blad' | 'ok' | 'pusto'
const SLOWO: Record<RodzajKomunikatu, string> = { info: 'informacja:', uwaga: 'uwaga:', blad: 'błąd:', ok: 'gotowe:', pusto: '' }

function Ikona({ rodzaj }: { rodzaj: RodzajKomunikatu }) {
    const wspolne = { width: 20, height: 20, viewBox: '0 0 20 20', 'aria-hidden': true, className: 'k-kom-ikona' } as const
    if (rodzaj === 'uwaga') return <svg {...wspolne}><path d="M10 2.5l8 14H2z" /><path d="M10 8v4M10 14.5v.5" /></svg>
    if (rodzaj === 'blad') return <svg {...wspolne}><circle cx="10" cy="10" r="8.5" /><path d="M7 7l6 6M13 7l-6 6" /></svg>
    if (rodzaj === 'ok') return <svg {...wspolne}><circle cx="10" cy="10" r="8.5" /><path d="M6 10.5l2.6 2.5L14 7.5" /></svg>
    if (rodzaj === 'pusto') return <svg {...wspolne}><circle cx="8.5" cy="8.5" r="6" /><path d="M13 13l5 5" /></svg>
    return <svg {...wspolne}><circle cx="10" cy="10" r="8.5" /><path d="M10 9v5M10 6v.5" /></svg>
}

export default function Komunikat({ rodzaj = 'info', tytul, children, rola }: { rodzaj?: RodzajKomunikatu; tytul?: React.ReactNode; children?: React.ReactNode; rola?: 'status' | 'alert' }) {
    return (
        <div className={`k-kom k-kom--${rodzaj}`} role={rola ?? (rodzaj === 'blad' ? 'alert' : 'status')}>
            <Ikona rodzaj={rodzaj} />
            <div className="k-kom-tresc">
                {(SLOWO[rodzaj] || tytul) && <p className="k-kom-tytul">{SLOWO[rodzaj] && <b className="k-kom-slowo">{SLOWO[rodzaj]} </b>}{tytul}</p>}
                {children}
            </div>
        </div>
    )
}

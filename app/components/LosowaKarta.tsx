'use client'

// Karta „z archiwum” na stronie głównej: losowa miejscowość, obiekt, temat albo osoba
// (tylko publiczne i z opisem). Pierwszą losuje serwer, „wylosuj inne” przechodzi przez całą pulę bez powtórek.

import * as React from 'react'
import { Link } from 'next-view-transitions'
import type { PozycjaLosowa } from '@/lib/archiwum'

export default function LosowaKarta({ pozycje, start }: { pozycje: PozycjaLosowa[]; start: number }) {
    const [kolejka, ustawKolejke] = React.useState<number[]>([])
    const [i, ustawI] = React.useState(start)
    const p = pozycje[i]
    if (!p) return null
    const wylosuj = () => {
        let k = kolejka.filter((x) => x !== i)
        if (!k.length) {
            // nowa runda: wszystkie poza bieżącą, w losowej kolejności
            k = pozycje.map((_, j) => j).filter((j) => j !== i)
            for (let a = k.length - 1; a > 0; a--) { const b = Math.floor(Math.random() * (a + 1)); [k[a], k[b]] = [k[b], k[a]] }
        }
        ustawI(k[0])
        ustawKolejke(k.slice(1))
    }
    return (
        <aside className="karta-losowa" aria-live="polite">
            <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
                <b className="lowercase" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>z archiwum</b>
                {pozycje.length > 1 && (
                    <button type="button" onClick={wylosuj} className="karta-losowa-los" title="pokaż inną pozycję">wylosuj inne ↻</button>
                )}
            </div>
            {p.zdjecie && (
                <Link href={p.href} className="karta-losowa-foto" tabIndex={-1} aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${p.zdjecie}?w=480`} alt="" loading="lazy" />
                </Link>
            )}
            <span className="text-gray-500 lowercase" style={{ fontSize: 'calc(12.5px * var(--font-scale, 1))' }}>{p.rodzaj}</span>
            <Link href={p.href} className="font-bold" style={{ fontSize: 'calc(17px * var(--font-scale, 1))', lineHeight: 1.3 }}>{p.tytul}</Link>
            <p style={{ fontSize: 'calc(14px * var(--font-scale, 1))', lineHeight: 1.6, margin: 0 }}>{p.tekst}</p>
            <Link href={p.href} className="w-fit lowercase" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>więcej →</Link>
        </aside>
    )
}

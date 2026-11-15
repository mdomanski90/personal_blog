import * as React from 'react'
import type { Dzial } from '@/lib/strony/wstepy'
import { wczytajWstep } from '@/lib/strony/wstepy'

type Opcje = { dzial: Dzial; domyslny?: string; className?: string; style?: React.CSSProperties }
async function Tekst({ dzial, domyslny = '' }: { dzial: Dzial; domyslny?: string }) {
    const d = await wczytajWstep(dzial)
    const t = d.wstep || domyslny
    return <>
        {t}
        {d.linkAdres && d.linkTekst && <span className="block"><a href={d.linkAdres} className="odn" rel={d.linkAdres.startsWith('https:') ? 'noopener noreferrer' : undefined}>
            {d.linkTekst} →
        </a></span>}
    </>
}
/** Do zastąpienia tekstu już istniejącego akapitu, bez zmiany jego opakowania. */
export async function WstepTekst({ dzial, domyslny = '' }: { dzial: Dzial; domyslny?: string }) {
    return <Tekst dzial={dzial} domyslny={domyslny} />
}
/** Jeśli brak wstępu i linku, nie renderuje pustego akapitu. */
export async function WstepDzialu({ dzial, domyslny = '', className, style }: Opcje) {
    const d = await wczytajWstep(dzial)
    if (!d.wstep && !domyslny && !(d.linkAdres && d.linkTekst)) return null
    return <p className={className} style={style}><Tekst dzial={dzial} domyslny={domyslny} /></p>
}
export async function TytulDzialu({ dzial, domyslny }: { dzial: Dzial; domyslny: string }) {
    const d = await wczytajWstep(dzial)
    return <>{d.tytul || domyslny}</>
}

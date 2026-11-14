import * as React from 'react'
import { Link } from 'next-view-transitions'
import type { Opowiesc } from '@/lib/archiwum'
import { RODZAJE_OPOWIESCI } from '@/lib/archiwum'
import { dataWpisu } from './Uklad'
import CopyLinkButton from './CopyLinkButton'

type Nazwy = { miejsca: Map<string, string>; tematy?: Map<string, string> }

/** Spokojny wiersz nad wpisem: data · rodzaj · miejsca i tematy (odnośniki w kolorze atramentu). */
export function LiniaWpisu({ wpis, nazwy, ileMiejsc }: { wpis: Opowiesc; nazwy: Nazwy; ileMiejsc?: number }) {
    const miejsca = wpis.miejsca.filter((id) => nazwy.miejsca.has(id))
    const tematy = nazwy.tematy ? wpis.tematy.filter((id) => nazwy.tematy!.has(id)) : []
    const pokazane = ileMiejsc ? miejsca.slice(0, ileMiejsc) : miejsca
    const odnosniki = [
        ...pokazane.map((id) => ({ href: `/miejsca/${id}`, tekst: nazwy.miejsca.get(id)! })),
        ...tematy.map((id) => ({ href: `/tematy/${id}`, tekst: nazwy.tematy!.get(id)! })),
    ]
    return (
        <p className="metki-linia">
            <span>{dataWpisu(wpis.data)}</span>
            <span aria-hidden="true"> · </span>
            <span>{RODZAJE_OPOWIESCI[wpis.rodzaj] ?? wpis.rodzaj}</span>
            {odnosniki.length > 0 && <span aria-hidden="true"> · </span>}
            {odnosniki.map((o, i) => (
                <React.Fragment key={o.href}>
                    {i > 0 && ', '}
                    <Link href={o.href} className="odn">{o.tekst}</Link>
                </React.Fragment>
            ))}
            {ileMiejsc && miejsca.length > pokazane.length && <span> +{miejsca.length - pokazane.length}</span>}
        </p>
    )
}

/** Rząd nad wpisem: spokojna linia z datą i odnośnikami, po prawej przycisk „kopiuj link”. */
export default function MetkiWpisu({ wpis, nazwy }: { wpis: Opowiesc; nazwy: Nazwy }) {
    return (
        <div className="metki-wpisu">
            <LiniaWpisu wpis={wpis} nazwy={nazwy} />
            <CopyLinkButton sciezka={`/wpisy/${wpis.id}`} />
        </div>
    )
}

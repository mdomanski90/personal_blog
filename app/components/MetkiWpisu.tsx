import * as React from 'react'
import type { Opowiesc } from '@/lib/archiwum'
import { RODZAJE_OPOWIESCI } from '@/lib/archiwum'
import { Metki, dataZDniem } from './Uklad'
import CopyLinkButton from './CopyLinkButton'

/** Rząd nad wpisem: data · rodzaj · miejsca · tematy (z odnośnikami), po prawej „kopiuj link”. */
export default function MetkiWpisu({ wpis, nazwy }: { wpis: Opowiesc; nazwy: { miejsca: Map<string, string>; tematy: Map<string, string> } }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <Metki
                elementy={[
                    dataZDniem(wpis.data),
                    RODZAJE_OPOWIESCI[wpis.rodzaj] ?? wpis.rodzaj,
                    ...wpis.miejsca.filter((id) => nazwy.miejsca.has(id)).map((id) => ({ tekst: nazwy.miejsca.get(id), href: `/miejsca/${id}` })),
                    ...wpis.tematy.filter((id) => nazwy.tematy.has(id)).map((id) => ({ tekst: nazwy.tematy.get(id), href: `/tematy/${id}` })),
                ]}
            />
            <CopyLinkButton sciezka={`/wpisy/${wpis.id}`} />
        </div>
    )
}

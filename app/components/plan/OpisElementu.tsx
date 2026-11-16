import * as React from 'react'
import type { Element } from '@/lib/plany/model'
import { IDENTYFIKACJE } from '@/lib/plany/podstawa'

/**
 * PH2 (PH-02, 09, 19): dla czytelnika – nazwa w źródle, pewność identyfikacji, powiązane karty i podstawa (materiał,
 * objaśnienie). Wspólne dla karty elementu na stronie planu i warstwy rekonstrukcji na stronie materiału.
 * `naPodstawe` – gdy podany, odnośnik do objaśnienia zaznacza je na skanie zamiast przechodzić na stronę.
 */
export default function OpisElementu({ e, nazwyMaterialow, naPodstawe }: { e: Element; nazwyMaterialow?: Record<string, string>; naPodstawe?: (objasnienie: string) => void }) {
    const niepewna = e.identyfikacja && e.identyfikacja !== 'pewna'
    if (!e.nazwaZrodlowa && !niepewna && !e.odnosniki?.length && !e.podstawa?.length) return null
    return (
        <dl className="pl-el">
            {e.nazwaZrodlowa && <div className="pl-el-w"><dt>w źródle</dt><dd>„{e.nazwaZrodlowa}”</dd></div>}
            {niepewna && <div className="pl-el-w"><dt>identyfikacja</dt><dd className="pl-el-niepewna">{IDENTYFIKACJE[e.identyfikacja!]}</dd></div>}
            {e.odnosniki && e.odnosniki.length > 0 && (
                <div className="pl-el-w"><dt>karty</dt><dd>{e.odnosniki.map((o, i) => <React.Fragment key={o.adres}>{i > 0 && ' · '}<a href={o.adres} className="odn">{o.nazwa}</a></React.Fragment>)}</dd></div>
            )}
            {e.podstawa && e.podstawa.length > 0 && (
                <div className="pl-el-w"><dt>podstawa</dt><dd>{e.podstawa.map((p, i) => (
                    <React.Fragment key={`${p.material}-${p.objasnienie ?? ''}`}>{i > 0 && ' · '}
                        {p.objasnienie && naPodstawe
                            ? <button type="button" className="pl-el-przycisk" onClick={() => naPodstawe(p.objasnienie!)}>odczyt na skanie</button>
                            : <a href={`/archiwum/${p.material}${p.objasnienie ? `#${p.objasnienie}` : ''}`} className="odn">{nazwyMaterialow?.[p.material] ?? 'materiał w archiwum'}{p.objasnienie ? ' – odczyt' : ''}</a>}
                    </React.Fragment>
                ))}</dd></div>
            )}
        </dl>
    )
}

'use client'
// „Jak cytować”: gotowy opis do skopiowania i pliki BibTeX / RIS (np. do Zotero).
import * as React from 'react'

import type { DaneCytatu } from '@/lib/cytowanie'
export type { DaneCytatu }

const dzis = () => new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
const SERWIS = 'odniepamieci.pl – społeczne archiwum pamięci lokalnej'

export function opisCytatu(d: DaneCytatu): string {
    return `„${d.tytul}”${d.dopisek ? ` (${d.dopisek})` : ''}${d.nrKat ? `, nr kat. ${d.nrKat}` : ''}, w: ${SERWIS}, oprac. ${d.opracowal}, ${d.adres} (dostęp: ${dzis()}).${d.oryginal ? ` Oryginał: ${d.oryginal}.` : ''}`
}

function pobierz(nazwa: string, tresc: string, typ: string) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([tresc], { type: typ }))
    a.download = nazwa
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

/** wTabeli – wiersz w tabeli karty (nagłówek „jak cytować” daje tabela), bez własnej ramki. */
export default function JakCytowac({ dane, plik, wTabeli = false }: { dane: DaneCytatu; plik: string; wTabeli?: boolean }) {
    const [skopiowano, ustaw] = React.useState(false)
    const tekst = opisCytatu(dane)
    const iso = new Date().toISOString().slice(0, 10)
    const bib = `@misc{${plik},\n  title = {${dane.tytul}},\n  howpublished = {${SERWIS}},\n  note = {oprac. ${dane.opracowal}${dane.oryginal ? `; oryginał: ${dane.oryginal}` : ''}},\n  ${dane.nrKat ? `number = {${dane.nrKat}},\n  ` : ''}${dane.rok ? `year = {${dane.rok}},\n  ` : ''}url = {${dane.adres}},\n  urldate = {${iso}}\n}\n`
    const ris = [`TY  - ${dane.rodzaj === 'wpis' ? 'BLOG' : 'GEN'}`, `TI  - ${dane.tytul}`, ...(dane.autor ? [`AU  - ${dane.autor}`] : []), `A2  - ${dane.opracowal}`, ...(dane.rok ? [`PY  - ${dane.rok}`] : []), `T2  - ${SERWIS}`, ...(dane.nrKat ? [`CN  - ${dane.nrKat}`] : []), `UR  - ${dane.adres}`, `Y2  - ${iso}`, ...(dane.oryginal ? [`N1  - Oryginał: ${dane.oryginal}`] : []), 'ER  - ', ''].join('\r\n')
    return (
        <div className={`jak-cytowac${wTabeli ? ' jak-cytowac--w-tabeli' : ''}`}>
            {!wTabeli && <h2 className="tytul-sekcji">jak cytować</h2>}
            <p className="jak-cytowac-tekst">{tekst}</p>
            <div className="jak-cytowac-akcje">
                <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(tekst); ustaw(true); window.setTimeout(() => ustaw(false), 2000) } catch {} }} className="k-btn k-btn--s lowercase">{skopiowano ? 'skopiowano ✓' : 'kopiuj'}</button>
                <span className="jak-cytowac-pliki">
                    też jako: <button type="button" onClick={() => pobierz(`${plik}.bib`, bib, 'application/x-bibtex')} className="odn">BibTeX</button>
                    {' · '}<button type="button" onClick={() => pobierz(`${plik}.ris`, ris, 'application/x-research-info-systems')} className="odn">RIS (do Zotero)</button>
                </span>
            </div>
        </div>
    )
}

'use client'
// „Jak cytować”: gotowy opis do skopiowania i pliki BibTeX / RIS (np. do Zotero).
import * as React from 'react'

export interface DaneCytatu { tytul: string; adres: string; opracowal: string; autor?: string; rok?: string; oryginal?: string; rodzaj?: string }

const dzis = () => new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
const SERWIS = 'odniepamieci.pl – społeczne archiwum pamięci lokalnej'

export function opisCytatu(d: DaneCytatu): string {
    return `„${d.tytul}”, w: ${SERWIS}, oprac. ${d.opracowal}, ${d.adres} (dostęp: ${dzis()}).${d.oryginal ? ` Oryginał: ${d.oryginal}.` : ''}`
}

function pobierz(nazwa: string, tresc: string, typ: string) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([tresc], { type: typ }))
    a.download = nazwa
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

export default function JakCytowac({ dane, plik }: { dane: DaneCytatu; plik: string }) {
    const [skopiowano, ustaw] = React.useState(false)
    const tekst = opisCytatu(dane)
    const iso = new Date().toISOString().slice(0, 10)
    const bib = `@misc{${plik},\n  title = {${dane.tytul}},\n  howpublished = {${SERWIS}},\n  note = {oprac. ${dane.opracowal}${dane.oryginal ? `; oryginał: ${dane.oryginal}` : ''}},\n  ${dane.rok ? `year = {${dane.rok}},\n  ` : ''}url = {${dane.adres}},\n  urldate = {${iso}}\n}\n`
    const ris = [`TY  - ${dane.rodzaj === 'wpis' ? 'BLOG' : 'GEN'}`, `TI  - ${dane.tytul}`, ...(dane.autor ? [`AU  - ${dane.autor}`] : []), `A2  - ${dane.opracowal}`, ...(dane.rok ? [`PY  - ${dane.rok}`] : []), `T2  - ${SERWIS}`, `UR  - ${dane.adres}`, `Y2  - ${iso}`, ...(dane.oryginal ? [`N1  - Oryginał: ${dane.oryginal}`] : []), 'ER  - ', ''].join('\r\n')
    return (
        <div className="border border-[#d1d5db] dark:border-[#4b5563] rounded-[8px] flex flex-col" style={{ padding: 12, gap: 8 }}>
            <div className="flex items-center justify-between" style={{ gap: 8 }}>
                <b className="lowercase" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>jak cytować</b>
                <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(tekst); ustaw(true); window.setTimeout(() => ustaw(false), 2000) } catch {} }}
                    className="border border-[#d1d5db] dark:border-[#4b5563] rounded-[7px] lowercase" style={{ height: 'calc(26px * var(--font-scale, 1))', padding: '0 10px', fontSize: 'calc(13px * var(--font-scale, 1))', background: 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit' }}>{skopiowano ? 'skopiowano ✓' : 'kopiuj'}</button>
            </div>
            <p style={{ margin: 0, fontSize: 'calc(14px * var(--font-scale, 1))', lineHeight: 1.55 }}>{tekst}</p>
            <span className="text-gray-500" style={{ fontSize: 'calc(12px * var(--font-scale, 1))' }}>
                też jako: <button type="button" onClick={() => pobierz(`${plik}.bib`, bib, 'application/x-bibtex')} className="underline" style={{ background: 'none', border: 0, padding: 0, color: 'inherit', cursor: 'pointer', font: 'inherit' }}>BibTeX</button>
                {' · '}<button type="button" onClick={() => pobierz(`${plik}.ris`, ris, 'application/x-research-info-systems')} className="underline" style={{ background: 'none', border: 0, padding: 0, color: 'inherit', cursor: 'pointer', font: 'inherit' }}>RIS (do Zotero)</button>
            </span>
        </div>
    )
}

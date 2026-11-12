'use client'
// Transkrypcja i tłumaczenie obok skanu: zakładki albo „oba obok siebie”.
import * as React from 'react'

export default function TekstyZrodla({ transkrypcja, tlumaczenie, oryginal }: { transkrypcja: string; tlumaczenie: string; oryginal: string }) {
    const dostepne = [transkrypcja && 'transkrypcja', oryginal && 'oryginał', tlumaczenie && 'tłumaczenie'].filter(Boolean) as string[]
    const [widok, ustawWidok] = React.useState(dostepne[0] ?? '')
    if (!dostepne.length) return null
    const html = (t: string) => (t === 'transkrypcja' ? transkrypcja : t === 'oryginał' ? oryginal : tlumaczenie)
    const opcje = dostepne.length > 1 ? [...dostepne, 'oba obok siebie'] : dostepne
    return (
        <div className="flex flex-col" style={{ gap: 8 }}>
            {opcje.length > 1 && (
                <div className="flex flex-wrap w-fit" style={{ paddingLeft: 1 }}>
                    {opcje.map((o) => (
                        <button key={o} type="button" onClick={() => ustawWidok(o)} aria-pressed={widok === o}
                            className={`border border-[#d1d5db] dark:border-[#4b5563] lowercase ${widok === o ? 'bg-muted font-bold' : ''}`}
                            style={{ margin: '0 0 0 -1px', height: 'calc(28px * var(--font-scale, 1))', padding: '0 10px', fontSize: 'calc(14px * var(--font-scale, 1))', background: widok === o ? undefined : 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit' }}>{o}</button>
                    ))}
                </div>
            )}
            {widok === 'oba obok siebie' ? (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: 16 }}>
                    {dostepne.slice(0, 2).map((d) => <div key={d} className="post-content" style={{ fontSize: 'var(--blog-font-size, 17px)' }} dangerouslySetInnerHTML={{ __html: html(d) }} />)}
                </div>
            ) : (
                <div className="post-content" style={{ fontSize: 'var(--blog-font-size, 17px)' }} dangerouslySetInnerHTML={{ __html: html(widok) }} />
            )}
        </div>
    )
}

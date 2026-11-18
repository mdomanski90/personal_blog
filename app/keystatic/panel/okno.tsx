'use client'
// P5: okno potwierdzenia (podgląd skutku przed zapisem, podgląd cofnięcia). Natywny <dialog> z showModal():
// fokus w oknie, Esc zamyka, po zamknięciu fokus wraca na element, który okno otworzył (zasada 5.3).
import * as React from 'react'

export function Okno({ otwarte, tytul, onZamknij, children, stopka }: {
    otwarte: boolean; tytul: string; onZamknij: () => void; children: React.ReactNode; stopka?: React.ReactNode
}) {
    const ref = React.useRef<HTMLDialogElement>(null)
    const powrot = React.useRef<HTMLElement | null>(null)
    const id = React.useId()
    React.useEffect(() => {
        const d = ref.current
        if (!d) return
        if (otwarte && !d.open) { powrot.current = document.activeElement as HTMLElement | null; d.showModal() }
        if (!otwarte && d.open) d.close()
    }, [otwarte])
    React.useEffect(() => {
        const d = ref.current
        if (!d) return
        const zamknieto = () => { onZamknij(); const p = powrot.current; if (p && document.contains(p)) p.focus() }
        d.addEventListener('close', zamknieto)
        return () => d.removeEventListener('close', zamknieto)
    }, [onZamknij])
    return (
        <dialog ref={ref} className="pn-okno" aria-labelledby={`${id}-t`}>
            <div className="pn-okno-gora">
                <h2 id={`${id}-t`}>{tytul}</h2>
                <button type="button" className="pn-ikona-btn" aria-label="zamknij" onClick={() => ref.current?.close()}>✕</button>
            </div>
            <div className="pn-okno-tresc">{children}</div>
            {stopka && <div className="pn-okno-stopka">{stopka}</div>}
        </dialog>
    )
}

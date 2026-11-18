'use client'
// P6a (PNL-07): paleta poleceń Ctrl+K – okno z pola w pasku albo skrótem Ctrl+K (⌘K) z każdego miejsca panelu poza polem tekstowym
// (w edytorze tekstu Keystatic Ctrl+K to odnośnik). Wyniki w grupach: ostatnio edytowane (puste pole), osoby, archiwum i treści
// (także po numerze katalogowym), plany, zgłoszenia, polecenia (pozycje menu i „+ nowa …”). Enter – edycja w panelu,
// Shift+Enter – strona publiczna w nowej karcie. Natywny <dialog>: fokus w oknie, Esc zamyka, fokus wraca (zasada 5.3).
import * as React from 'react'
import { Search } from 'lucide-react'
import type { GrupaWgUstawien } from '@/lib/panel/menu'
import { NOWE, poleceniaZMenu, szukajWPalecie, type PozycjaPalety as Poz } from '@/lib/panel/paleta'

type Wynik = Poz & { klucz: string }
const GRUPY: [string, string][] = [['ostatnie', 'ostatnio edytowane'], ['osoby', 'osoby'], ['tresci', 'archiwum i treści'], ['plany', 'plany'], ['zgloszenia', 'zgłoszenia'], ['polecenia', 'polecenia']]
const NA_GRUPE = 6

export default function PaletaPolecen({ menu, otwarta, onZamknij }: { menu: GrupaWgUstawien[]; otwarta: boolean; onZamknij: () => void }) {
    const ref = React.useRef<HTMLDialogElement>(null)
    const pole = React.useRef<HTMLInputElement>(null)
    const powrot = React.useRef<HTMLElement | null>(null)
    const [indeks, ustawIndeks] = React.useState<Poz[] | null>(null)
    const [ostatnie, ustawOstatnie] = React.useState<Poz[]>([])
    const [q, ustawQ] = React.useState('')
    const [akt, ustawAkt] = React.useState(0)
    const polecenia = React.useMemo(() => poleceniaZMenu(menu), [menu])

    React.useEffect(() => {
        const d = ref.current
        if (!d) return
        if (otwarta && !d.open) {
            powrot.current = document.activeElement as HTMLElement | null
            d.showModal(); ustawQ(''); ustawAkt(0)
            window.setTimeout(() => pole.current?.focus(), 0)
            fetch('/api/keystatic/panel?czesc=indeks', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).then(ustawIndeks).catch(() => ustawIndeks([]))
            fetch('/api/keystatic/panel/praca', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null))
                .then((p: { ostatnie?: { href: string; nazwa: string; miejsce?: string }[] } | null) => ustawOstatnie((p?.ostatnie ?? []).map((x) => ({ t: x.nazwa, typ: 'ostatnio', href: x.href, d: x.miejsce, grupa: 'ostatnie' })))).catch(() => {})
        }
        if (!otwarta && d.open) d.close()
    }, [otwarta])
    React.useEffect(() => {
        const d = ref.current
        if (!d) return
        const zamknieto = () => { onZamknij(); const p = powrot.current; if (p && document.contains(p)) p.focus() }
        d.addEventListener('close', zamknieto)
        return () => d.removeEventListener('close', zamknieto)
    }, [onZamknij])

    const wyniki: Wynik[] = React.useMemo(() => {
        const L = q.trim() ? szukajWPalecie([...(indeks ?? []), ...polecenia], q) : [...ostatnie, ...polecenia.slice(0, NOWE.length)]
        const wGrupach: Wynik[] = []
        for (const [g] of GRUPY) L.filter((x) => (x.grupa ?? 'tresci') === g).slice(0, NA_GRUPE).forEach((x, i) => wGrupach.push({ ...x, klucz: `${g}-${i}-${x.href}` }))
        return wGrupach
    }, [q, indeks, ostatnie, polecenia])
    React.useEffect(() => { ustawAkt(0) }, [q])

    const otworz = (w: Wynik | undefined, naStronie: boolean) => {
        if (!w) return
        if (naStronie) { if (w.strona) window.open(w.strona, '_blank', 'noopener'); return }
        location.href = w.href
    }
    const klawisz = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); ustawAkt((a) => Math.min(a + 1, wyniki.length - 1)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); ustawAkt((a) => Math.max(a - 1, 0)) }
        else if (e.key === 'Enter') { e.preventDefault(); otworz(wyniki[akt], e.shiftKey) }
    }
    React.useEffect(() => { document.getElementById(`pn-pal-${akt}`)?.scrollIntoView({ block: 'nearest' }) }, [akt])

    let n = -1
    return (
        <dialog ref={ref} className="pn-okno pn-paleta" aria-label="szukaj w panelu i polecenia">
            <div className="pn-paleta-pole">
                <Search aria-hidden />
                <input ref={pole} type="search" role="combobox" aria-expanded="true" aria-controls="pn-paleta-wyniki" aria-autocomplete="list"
                    aria-activedescendant={wyniki[akt] ? `pn-pal-${akt}` : undefined} aria-label="szukaj: osoba, materiał, plan, numer katalogowy, polecenie"
                    placeholder="szukaj: osoba, materiał, MA-0042, polecenie…" autoComplete="off" value={q} onChange={(e) => ustawQ(e.target.value)} onKeyDown={klawisz} />
                <kbd aria-hidden="true">Esc</kbd>
            </div>
            <div id="pn-paleta-wyniki" role="listbox" aria-label="wyniki" className="pn-paleta-wyniki">
                {q.trim() && indeks === null && <p className="pn-szary pn-paleta-pusto" role="status">wczytuję…</p>}
                {q.trim() && indeks !== null && !wyniki.length && <p className="pn-szary pn-paleta-pusto" role="status">Nic nie znaleziono.</p>}
                {GRUPY.map(([g, nazwa]) => {
                    const W = wyniki.filter((w) => (w.grupa ?? 'tresci') === g)
                    if (!W.length) return null
                    return (
                        <div key={g} role="group" aria-label={nazwa}>
                            <div className="pn-paleta-grupa" aria-hidden="true">{nazwa}</div>
                            {W.map((w) => {
                                n++
                                const i = n
                                return (
                                    <a key={w.klucz} id={`pn-pal-${i}`} href={w.href} role="option" aria-selected={i === akt} data-akt={i === akt}
                                        onMouseMove={() => ustawAkt(i)} onClick={(e) => { if (e.shiftKey && w.strona) { e.preventDefault(); otworz(w, true) } }}>
                                        <span className="pn-paleta-t">{w.t}</span>
                                        <span className="pn-szary pn-paleta-typ">{[w.nr, w.typ, w.d].filter(Boolean).join(' · ')}</span>
                                    </a>
                                )
                            })}
                        </div>
                    )
                })}
            </div>
            <div className="pn-paleta-stopka pn-maly" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> wybór · <kbd>Enter</kbd> edytuj · <kbd>⇧ Enter</kbd> na stronie · <kbd>Esc</kbd> zamknij</div>
        </dialog>
    )
}

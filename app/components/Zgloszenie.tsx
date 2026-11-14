'use client'
// Przycisk z rozwijanym formularzem zgłoszenia (poprawka, nowe miejsce, materiał). Nic nie publikuje – trafia do panelu.
import * as React from 'react'
const RAMKA = 'border border-[#d6d1c6] dark:border-[#4b5563]'

const OPISY = {
    poprawka: { przycisk: 'zgłoś poprawkę lub dodaj informację', podpowiedz: 'Co się nie zgadza albo co wiesz więcej o tym miejscu?' },
    miejsce: { przycisk: 'zgłoś', podpowiedz: 'Jakie to miejsce (krzyż, kapliczka, mogiła, młyn…) i gdzie mniej więcej jest?' },
    material: { przycisk: 'przyślij materiał', podpowiedz: 'Co masz (zdjęcie, dokument, wspomnienie)? Odezwę się i umówimy, jak je przekazać.' },
} as const

// pytanie przy poprawce dopasowane do strony (adres mówi, czego dotyczy zgłoszenie)
function pytaniePoprawki(adres: string): string {
    if (adres.startsWith('/osoby/')) return 'Co się nie zgadza albo co wiesz więcej o tej osobie (daty, rodzina, miejsca)?'
    if (adres.startsWith('/wpisy/')) return 'Co się nie zgadza w tym wpisie albo co możesz dodać?'
    if (adres.startsWith('/archiwum/')) return 'Co się nie zgadza w opisie, transkrypcji albo tłumaczeniu tego materiału?'
    if (adres.startsWith('/obiekty/') || adres.startsWith('/plany/')) return 'Co się nie zgadza albo co wiesz więcej o tym obiekcie?'
    if (adres.startsWith('/tematy/')) return 'Co się nie zgadza albo co możesz dodać do tego tematu?'
    return 'Co się nie zgadza albo co wiesz więcej o tym miejscu?'
}

export default function Zgloszenie({ rodzaj, adres, tytul, wariant = 'przycisk', etykieta, podpowiedz }: { rodzaj: keyof typeof OPISY; adres: string; tytul: string; wariant?: 'przycisk' | 'link'; etykieta?: string; podpowiedz?: string }) {
    const [stan, ustawStan] = React.useState<'zamkniety' | 'otwarty' | 'wysylanie' | 'wyslany' | 'blad'>('zamkniety')
    const [tresc, ustawTresc] = React.useState('')
    const idPola = `zg-${React.useId()}`
    const [kontakt, ustawKontakt] = React.useState('')
    const wyslij = async (e: React.FormEvent) => {
        e.preventDefault()
        ustawStan('wysylanie')
        const r = await fetch('/api/zgloszenie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rodzaj, adres, tytul, tresc, kontakt }) }).catch(() => null)
        ustawStan(r?.ok ? 'wyslany' : 'blad')
    }
    const pole: React.CSSProperties = { font: 'inherit', fontSize: 'calc(14px * var(--font-scale, 1))', padding: '6px 8px', borderRadius: 7, background: 'transparent', color: 'inherit', width: '100%' }
    if (stan === 'wyslany') return <p role="status" className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>Dziękuję – zgłoszenie trafiło do redakcji. Nic nie pojawi się na stronie bez sprawdzenia{kontakt.trim() ? '; odezwiemy się pod podany kontakt' : ''}.</p>
    if (stan === 'zamkniety')
        return wariant === 'link'
            ? <button type="button" onClick={() => ustawStan('otwarty')} className="odn" style={{ font: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}>{etykieta ?? OPISY[rodzaj].przycisk}</button>
            : <button type="button" onClick={() => ustawStan('otwarty')} className={`${RAMKA} lowercase hover:bg-muted rounded-[7px]`} style={{ minHeight: 'calc(28px * var(--font-scale, 1))', maxWidth: '100%', padding: '2px 10px', fontSize: 'calc(14px * var(--font-scale, 1))', whiteSpace: 'normal', textAlign: 'left' }}>{etykieta ?? OPISY[rodzaj].przycisk}</button>
    return (
        <form onSubmit={wyslij} className="flex flex-col w-full" style={{ gap: 8, maxWidth: '36rem' }}>
            <label className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }} htmlFor={idPola}>{podpowiedz ?? (rodzaj === 'poprawka' ? pytaniePoprawki(adres) : OPISY[rodzaj].podpowiedz)} <span className="block" style={{ fontSize: '0.92em' }}>Zgłoszenie trafia do redakcji – nie jest publikowane automatycznie.</span></label>
            <textarea id={idPola} autoFocus required minLength={3} maxLength={4000} rows={4} value={tresc} onChange={(e) => ustawTresc(e.target.value)} className={RAMKA} style={pole} />
            <input value={kontakt} onChange={(e) => ustawKontakt(e.target.value)} maxLength={200} placeholder="kontakt do Ciebie (nieobowiązkowy, nie będzie pokazany)" className={RAMKA} style={pole} />
            <div className="flex items-center" style={{ gap: 10 }}>
                <button type="submit" disabled={stan === 'wysylanie'} className={`${RAMKA} bg-muted rounded-[7px] lowercase`} style={{ height: 'calc(28px * var(--font-scale, 1))', padding: '0 12px', fontSize: 'calc(14px * var(--font-scale, 1))' }}>{stan === 'wysylanie' ? 'wysyłam…' : 'wyślij'}</button>
                <button type="button" onClick={() => ustawStan('zamkniety')} className={`${RAMKA} rounded-[7px] lowercase text-current hover:bg-muted`} style={{ height: 'calc(28px * var(--font-scale, 1))', padding: '0 12px', fontSize: 'calc(14px * var(--font-scale, 1))', background: 'transparent', cursor: 'pointer' }}>anuluj</button>
                {stan === 'blad' && <span style={{ color: '#b91c1c', fontSize: 'calc(13px * var(--font-scale, 1))' }}>Nie udało się wysłać – spróbuj za chwilę.</span>}
            </div>
        </form>
    )
}

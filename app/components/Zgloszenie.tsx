'use client'
// Przycisk z rozwijanym formularzem zgłoszenia (poprawka, nowe miejsce, materiał). Nic nie publikuje – trafia do panelu.
import * as React from 'react'
import Komunikat from './Komunikat'

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
    if (stan === 'wyslany') return (
        <Komunikat rodzaj="ok" tytul="dziękuję – zgłoszenie trafiło do redakcji.">
            <p>Nic nie pojawi się na stronie bez sprawdzenia{kontakt.trim() ? '; odezwiemy się pod podany kontakt' : ''}.</p>
        </Komunikat>
    )
    if (stan === 'zamkniety')
        return wariant === 'link'
            ? <button type="button" onClick={() => ustawStan('otwarty')} className="odn" style={{ font: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}>{etykieta ?? OPISY[rodzaj].przycisk}</button>
            : <button type="button" onClick={() => ustawStan('otwarty')} className="k-btn k-btn--s lowercase" style={{ maxWidth: '100%', whiteSpace: 'normal', textAlign: 'left' }}>{etykieta ?? OPISY[rodzaj].przycisk}</button>
    return (
        // P7B (JV-11): etykieta nad polem, podpowiedź pod nim, błąd ze słowem i ikoną, potwierdzenie z dalszym krokiem
        <form onSubmit={wyslij} className="k-formularz">
            <label className="k-etykieta" htmlFor={idPola}>
                <b>{podpowiedz ?? (rodzaj === 'poprawka' ? pytaniePoprawki(adres) : OPISY[rodzaj].podpowiedz)}</b>
            </label>
            <textarea id={idPola} autoFocus required minLength={3} maxLength={4000} rows={4} value={tresc} onChange={(e) => ustawTresc(e.target.value)} className="k-pole k-pole--tekst" aria-describedby={`${idPola}-pom`} />
            <span id={`${idPola}-pom`} className="k-podpowiedz">Zgłoszenie trafia do redakcji – nie jest publikowane automatycznie.</span>
            <label className="k-etykieta" htmlFor={`${idPola}-k`}>kontakt do Ciebie <span className="k-podpowiedz">(nieobowiązkowy, nie będzie pokazany)</span>
                <input id={`${idPola}-k`} value={kontakt} onChange={(e) => ustawKontakt(e.target.value)} maxLength={200} className="k-pole" placeholder="np. e-mail albo telefon" />
            </label>
            {stan === 'blad' && <Komunikat rodzaj="blad" tytul="nie udało się wysłać zgłoszenia.">
                <p>Sprawdź połączenie z internetem i spróbuj ponownie – treść zostaje w polu.</p>
            </Komunikat>}
            <div className="k-formularz-akcje">
                <button type="submit" disabled={stan === 'wysylanie'} className="k-btn k-btn--glowny">{stan === 'wysylanie' ? 'wysyłam…' : stan === 'blad' ? 'spróbuj ponownie' : 'wyślij'}</button>
                <button type="button" onClick={() => ustawStan('zamkniety')} className="k-btn">anuluj</button>
            </div>
        </form>
    )
}

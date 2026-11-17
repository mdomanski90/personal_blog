'use client'
// Zgłoszenie czytelnika: przycisk z rozwijanym formularzem (karty) albo formularz otwarty (strona „współtwórz”, wariant „formularz”).
// Nic nie publikuje – trafia do panelu. WSP-03 (etap R): rodzaje odczyt / wspomnienie / rozpoznanie, kontekst braku, zgoda na podpis.
import * as React from 'react'
import Komunikat from './Komunikat'
import EmailLink from './EmailLink'
import { POMOC, type IdBraku, type RodzajFormularza } from '@/lib/wspoltworz-reguly'

const OPISY: Record<RodzajFormularza, { przycisk: string; podpowiedz: string }> = {
    poprawka: { przycisk: 'zgłoś poprawkę lub dodaj informację', podpowiedz: 'Co się nie zgadza albo co wiesz więcej o tym miejscu?' },
    miejsce: { przycisk: 'zgłoś', podpowiedz: 'Jakie to miejsce (krzyż, kapliczka, mogiła, młyn…) i gdzie mniej więcej jest?' },
    material: { przycisk: 'przyślij materiał', podpowiedz: 'Co masz (zdjęcie, dokument, wspomnienie)? Odezwę się i umówimy, jak je przekazać.' },
    odczyt: { przycisk: 'odczytaj', podpowiedz: 'Wpisz odczyt (choćby kilka pierwszych linijek) albo tłumaczenie – zaznacz, czego nie udało się odczytać.' },
    wspomnienie: { przycisk: 'opowiedz', podpowiedz: 'O czym albo o kim chcesz opowiedzieć? Odezwę się i umówimy rozmowę – na piśmie, przez telefon albo z nagraniem.' },
    rozpoznanie: { przycisk: 'podpowiedz', podpowiedz: 'Kogo albo co rozpoznajesz – kto jest na zdjęciu, gdzie albo kiedy je zrobiono?' },
}
export type { RodzajFormularza } from '@/lib/wspoltworz-reguly'


// pytanie przy poprawce dopasowane do strony (adres mówi, czego dotyczy zgłoszenie)
function pytaniePoprawki(adres: string): string {
    if (adres.startsWith('/osoby/')) return 'Co się nie zgadza albo co wiesz więcej o tej osobie (daty, rodzina, miejsca)?'
    if (adres.startsWith('/wpisy/')) return 'Co się nie zgadza w tym wpisie albo co możesz dodać?'
    if (adres.startsWith('/archiwum/')) return 'Co się nie zgadza w opisie, transkrypcji albo tłumaczeniu tego materiału?'
    if (adres.startsWith('/obiekty/') || adres.startsWith('/plany/')) return 'Co się nie zgadza albo co wiesz więcej o tym obiekcie?'
    if (adres.startsWith('/tematy/')) return 'Co się nie zgadza albo co możesz dodać do tego tematu?'
    return 'Co się nie zgadza albo co wiesz więcej o tym miejscu?'
}

type Stan = 'zamkniety' | 'otwarty' | 'wysylanie' | 'wyslany' | 'blad'

export default function Zgloszenie({ rodzaj, adres, tytul, wariant = 'przycisk', etykieta, podpowiedz, brak, zgoda = false, email, czegoDotyczy }: {
    rodzaj: RodzajFormularza; adres: string; tytul: string
    /** „przycisk” / „link” – rozwija formularz w miejscu; „formularz” – otwarty, z wyborem rodzaju i polem „czego dotyczy” (współtwórz) */
    wariant?: 'przycisk' | 'link' | 'formularz'
    etykieta?: string; podpowiedz?: string
    /** WSP-03: rodzaj braku, którego dotyczy zgłoszenie (z zadania albo pustego pola karty) */
    brak?: IdBraku
    /** pole zgody na podpis w „opracował(a)” */
    zgoda?: boolean
    /** adres na pliki (części składane w przeglądarce, jak w „o projekcie”) */
    email?: { u: string; d: string }
    /** wariant „formularz”: wypełnione „czego dotyczy” (z ?uzupelnij=…) */
    czegoDotyczy?: string
}) {
    const pelny = wariant === 'formularz'
    const [stan, ustawStan] = React.useState<Stan>(pelny ? 'otwarty' : 'zamkniety')
    const [rodzajWybrany, ustawRodzaj] = React.useState<RodzajFormularza>(rodzaj)
    const [dotyczy, ustawDotyczy] = React.useState(czegoDotyczy ?? '')
    const [tresc, ustawTresc] = React.useState('')
    const [kontakt, ustawKontakt] = React.useState('')
    const [podpis, ustawPodpis] = React.useState(false)
    const idPola = `zg-${React.useId()}`
    // nowy kontekst z adresu (inne „uzupełnij”) – formularz przejmuje rodzaj i „czego dotyczy”
    React.useEffect(() => { ustawRodzaj(rodzaj); ustawDotyczy(czegoDotyczy ?? '') }, [rodzaj, czegoDotyczy])
    const r = pelny ? rodzajWybrany : rodzaj
    const wyslij = async (e: React.FormEvent) => {
        e.preventDefault()
        ustawStan('wysylanie')
        const tyt = pelny ? dotyczy.trim() || tytul : tytul
        const odp = await fetch('/api/zgloszenie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rodzaj: r, adres, tytul: tyt, tresc, kontakt, ...(brak ? { brak } : {}), ...(zgoda && podpis ? { podpis: true } : {}) }) }).catch(() => null)
        ustawStan(odp?.ok ? 'wyslany' : 'blad')
    }
    if (stan === 'wyslany') return (
        <Komunikat rodzaj="ok" tytul="dziękuję – zgłoszenie trafiło do redakcji." rola="status">
            <p>Nic nie pojawi się na stronie bez sprawdzenia{kontakt.trim() ? '; odezwiemy się pod podany kontakt' : ''}.</p>
        </Komunikat>
    )
    if (stan === 'zamkniety')
        return wariant === 'link'
            ? <button type="button" onClick={() => ustawStan('otwarty')} className="odn zgl-link">{etykieta ?? OPISY[rodzaj].przycisk}</button>
            : <button type="button" onClick={() => ustawStan('otwarty')} className="k-btn k-btn--s lowercase zgl-przycisk">{etykieta ?? OPISY[rodzaj].przycisk}</button>
    return (
        // P7B (JV-11): etykieta nad polem, podpowiedź pod nim, błąd ze słowem i ikoną, potwierdzenie z dalszym krokiem
        <form onSubmit={wyslij} className={`k-formularz${pelny ? ' wsp-formularz' : ''}`}>
            {pelny && (
                <>
                    <label className="k-etykieta" htmlFor={`${idPola}-r`}>w czym chcesz pomóc</label>
                    <select id={`${idPola}-r`} className="k-pole" value={rodzajWybrany} onChange={(e) => ustawRodzaj(e.target.value as RodzajFormularza)}>
                        {POMOC.map((p) => <option key={p.rodzaj} value={p.rodzaj}>{p.etykieta}</option>)}
                    </select>
                    <label className="k-etykieta" htmlFor={`${idPola}-d`}>czego dotyczy</label>
                    <input id={`${idPola}-d`} className="k-pole" value={dotyczy} onChange={(e) => ustawDotyczy(e.target.value)} maxLength={200} placeholder="np. tytuł dokumentu, nazwa miejsca albo adres strony" />
                </>
            )}
            <label className="k-etykieta" htmlFor={idPola}>
                <b>{pelny ? 'co wiesz albo co masz' : podpowiedz ?? (r === 'poprawka' ? pytaniePoprawki(adres) : OPISY[r].podpowiedz)}</b>
            </label>
            <textarea id={idPola} autoFocus={!pelny} required minLength={3} maxLength={4000} rows={pelny ? 5 : 4} value={tresc} onChange={(e) => ustawTresc(e.target.value)} className="k-pole k-pole--tekst" aria-describedby={`${idPola}-pom`}
                placeholder={pelny ? OPISY[r].podpowiedz : undefined} />
            <span id={`${idPola}-pom`} className="k-podpowiedz">
                {email
                    ? <>Zdjęcia, skany i nagrania wyślij na adres <EmailLink u={email.u} d={email.d} /> – w temacie wpisz, czego dotyczą.</>
                    : 'Zgłoszenie trafia do redakcji – nie jest publikowane automatycznie.'}
            </span>
            <label className="k-etykieta" htmlFor={`${idPola}-k`}>kontakt do Ciebie <span className="k-podpowiedz">(nieobowiązkowy, nie będzie pokazany)</span></label>
            <input id={`${idPola}-k`} value={kontakt} onChange={(e) => ustawKontakt(e.target.value)} maxLength={200} className="k-pole" placeholder="np. e-mail albo telefon" />
            {zgoda && (
                <label className="wsp-zgoda" htmlFor={`${idPola}-z`}>
                    <input id={`${idPola}-z`} type="checkbox" checked={podpis} onChange={(e) => ustawPodpis(e.target.checked)} />
                    <span>zgadzam się na podanie mojego autorstwa przy uzupełnieniu (opracował/a)</span>
                </label>
            )}
            {stan === 'blad' && <Komunikat rodzaj="blad" tytul="nie udało się wysłać zgłoszenia." rola="alert">
                <p>Sprawdź połączenie z internetem i spróbuj ponownie – treść zostaje w polu.</p>
            </Komunikat>}
            <div className="k-formularz-akcje">
                <button type="submit" disabled={stan === 'wysylanie'} className="k-btn k-btn--glowny">{stan === 'wysylanie' ? 'wysyłam…' : stan === 'blad' ? 'spróbuj ponownie' : 'wyślij'}</button>
                {!pelny && <button type="button" onClick={() => ustawStan('zamkniety')} className="k-btn">anuluj</button>}
            </div>
        </form>
    )
}

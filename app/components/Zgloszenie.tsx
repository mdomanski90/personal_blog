'use client'
// Zgłoszenie czytelnika: przycisk z rozwijanym formularzem (karty) albo formularz otwarty (strona „współtwórz”, wariant „formularz”).
// Nic nie publikuje – trafia do panelu. WSP-03 (etap R): rodzaje odczyt / wspomnienie / rozpoznanie, kontekst braku, zgoda na podpis.
// P7c (uwaga właściciela 20.11, ankieta A): formularz w ramce jak „szukaj i filtruj” (tło sekcji, nagłówek, „zamknij”);
// przycisk w zdaniu zostaje, a ramka pojawia się POD całym zdaniem – dawniej <form> wewnątrz <p> łamał akapit
// i zostawiał osierocony dalszy ciąg zdania; etykieta pola zwykła z „(wymagane)”, pytanie jako podpowiedź pod etykietą.
import * as React from 'react'
import { createPortal } from 'react-dom'
import Komunikat from './Komunikat'
import EmailLink from './EmailLink'
import { komunikatBleduZgloszenia } from '@/lib/zgloszenie-blad'
import { POMOC, type IdBraku, type RodzajFormularza } from '@/lib/wspoltworz-reguly'

const OPISY: Record<RodzajFormularza, { przycisk: string; podpowiedz: string }> = {
    poprawka: { przycisk: 'zgłoś poprawkę lub dodaj informację', podpowiedz: 'Co się nie zgadza albo co wiesz więcej o tym miejscu?' },
    miejsce: { przycisk: 'zgłoś', podpowiedz: 'Jakie to miejsce (krzyż, kapliczka, mogiła, młyn…) i gdzie mniej więcej jest?' },
    material: { przycisk: 'przyślij materiał', podpowiedz: 'Co masz (zdjęcie, dokument, wspomnienie)? Odezwę się i umówimy, jak je przekazać.' },
    odczyt: { przycisk: 'odczytaj', podpowiedz: 'Wpisz odczyt (choćby kilka pierwszych linijek) albo tłumaczenie – zaznacz, czego nie udało się odczytać.' },
    wspomnienie: { przycisk: 'opowiedz', podpowiedz: 'O czym albo o kim chcesz opowiedzieć? Odezwę się i umówimy rozmowę – na piśmie, przez telefon albo z nagraniem.' },
    rozpoznanie: { przycisk: 'podpowiedz', podpowiedz: 'Kogo albo co rozpoznajesz – kto jest na zdjęciu, gdzie albo kiedy je zrobiono?' },
    haslo: { przycisk: 'zgłoś hasło', podpowiedz: 'Jakie to słowo, powiedzenie albo nazwa? Co znaczy, skąd je znasz (dokument, gwara, rodzina) i w jakiej miejscowości się go używało?' },
}
export type { RodzajFormularza } from '@/lib/wspoltworz-reguly'


// pytanie przy poprawce dopasowane do strony (adres mówi, czego dotyczy zgłoszenie)
function pytaniePoprawki(adres: string): string {
    if (adres.startsWith('/osoby/')) return 'Co się nie zgadza albo co wiesz więcej o tej osobie (daty, rodzina, miejsca)?'
    if (adres.startsWith('/wpisy/')) return 'Co się nie zgadza w tym wpisie albo co możesz dodać?'
    if (adres.startsWith('/archiwum/')) return 'Co się nie zgadza w opisie, transkrypcji albo tłumaczeniu tego materiału?'
    if (adres.startsWith('/obiekty/') || adres.startsWith('/plany/')) return 'Co się nie zgadza albo co wiesz więcej o tym obiekcie?'
    if (adres.startsWith('/leksykon/')) return 'Co się nie zgadza albo co możesz dodać do tej pozycji leksykonu?'
    return 'Co się nie zgadza albo co wiesz więcej o tym miejscu?'
}

type Stan = 'zamkniety' | 'otwarty' | 'wysylanie' | 'wyslany' | 'blad'

/** Najdalszy przodek w biegu tekstu (akapit, span, wyróżnienie) – ramka formularza trafia za niego, nie do środka zdania. */
function kotwicaZdania(el: HTMLElement): HTMLElement | null {
    let k: HTMLElement | null = null, e = el.parentElement
    while (e && ['P', 'SPAN', 'B', 'I', 'EM', 'STRONG', 'SMALL'].includes(e.tagName)) { k = e; e = e.parentElement }
    return k
}

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
    /** adres kontaktowy zakodowany (OPS-08: zakoduj() z lib/email-ochrona – bez adresu w danych strony) */
    email?: string
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
    const [status, ustawStatus] = React.useState<number | null>(null)
    const wynikRef = React.useRef<HTMLDivElement>(null)
    const przyciskRef = React.useRef<HTMLButtonElement>(null)
    const [miejsce, ustawMiejsce] = React.useState<HTMLElement | null>(null)
    const otwarty = !pelny && stan !== 'zamkniety'
    // ramka pod zdaniem: osobny element za akapitem (portal), tworzony przy otwarciu; bez akapitu dookoła – ramka zaraz za przyciskiem
    const otworz = () => {
        if (otwarty) { poleRef.current?.focus(); return }
        const k = przyciskRef.current ? kotwicaZdania(przyciskRef.current) : null
        if (k) { const d = document.createElement('div'); d.className = 'zgl-miejsce'; k.after(d); ustawMiejsce(d) }
        ustawStan('otwarty')
    }
    React.useEffect(() => () => { miejsce?.remove() }, [miejsce])
    const zamknij = () => { ustawStan('zamkniety'); ustawMiejsce(null); window.setTimeout(() => przyciskRef.current?.focus(), 0) }
    const poleRef = React.useRef<HTMLTextAreaElement>(null)
    // P1 (UX-05): po wysłaniu fokus na komunikacie (potwierdzenie albo błąd); przy odrzuconej treści – na polu treści
    const [fokusWyniku, ustawFokusWyniku] = React.useState(0)
    React.useEffect(() => {
        if (!fokusWyniku) return
        if (stan === 'blad' && komunikatBleduZgloszenia(status).pole === 'tresc') poleRef.current?.focus()
        else wynikRef.current?.focus()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fokusWyniku])
    // nowy kontekst z adresu (inne „uzupełnij”) – formularz przejmuje rodzaj i „czego dotyczy”
    React.useEffect(() => { ustawRodzaj(rodzaj); ustawDotyczy(czegoDotyczy ?? '') }, [rodzaj, czegoDotyczy])
    const r = pelny ? rodzajWybrany : rodzaj
    const wyslij = async (e: React.FormEvent) => {
        e.preventDefault()
        ustawStan('wysylanie')
        ustawStatus(null)
        const tyt = pelny ? dotyczy.trim() || tytul : tytul
        const odp = await fetch('/api/zgloszenie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rodzaj: r, adres, tytul: tyt, tresc, kontakt, ...(brak ? { brak } : {}), ...(zgoda && podpis ? { podpis: true } : {}) }) }).catch(() => null)
        ustawStatus(odp ? odp.status : null)
        ustawStan(odp?.ok ? 'wyslany' : 'blad')
        ustawFokusWyniku((n) => n + 1)
    }
    const tytulRamki = (etykieta ?? OPISY[rodzaj].przycisk).replace(/\s*[→›]\s*$/, '')
    const idRamki = `${idPola}-ramka`
    const wyzwalacz = wariant === 'link'
        ? <button ref={przyciskRef} type="button" onClick={otworz} className="odn zgl-link" aria-expanded={otwarty} aria-controls={otwarty ? idRamki : undefined}>{etykieta ?? OPISY[rodzaj].przycisk}</button>
        : <button ref={przyciskRef} type="button" onClick={otworz} className="k-btn k-btn--s lowercase zgl-przycisk" aria-expanded={otwarty} aria-controls={otwarty ? idRamki : undefined}>{etykieta ?? OPISY[rodzaj].przycisk}</button>
    if (pelny) return <div className="k-filtry-ramka zgl-ramka zgl-ramka--pelna">{stan === 'wyslany' ? podziekowanie() : formularz()}</div>
    if (!otwarty) return wyzwalacz
    const ramka = (
        <section id={idRamki} className="k-filtry-ramka zgl-ramka" aria-labelledby={`${idRamki}-t`}>
            <div className="k-filtry-naglowek zgl-naglowek">
                <h3 id={`${idRamki}-t`} className="k-filtry-tytul">{tytulRamki}</h3>
                <button type="button" className="k-btn k-filtry-przelacz" onClick={zamknij}>zamknij <span aria-hidden="true">×</span></button>
            </div>
            {stan === 'wyslany' ? podziekowanie() : formularz()}
        </section>
    )
    return <>{wyzwalacz}{miejsce ? createPortal(ramka, miejsce) : ramka}</>

    function podziekowanie() {
        return (
            <div ref={wynikRef} tabIndex={-1} className="zgl-wynik">
                <Komunikat rodzaj="ok" tytul="dziękuję – zgłoszenie trafiło do redakcji." rola="status">
                    <p>Nic nie pojawi się na stronie bez sprawdzenia{kontakt.trim() ? '; odezwiemy się pod podany kontakt' : ''}.</p>
                </Komunikat>
            </div>
        )
    }

    function formularz() {
    return (
        // P7B (JV-11): etykieta nad polem, podpowiedź pod nim, błąd ze słowem i ikoną, potwierdzenie z dalszym krokiem
        <form onSubmit={wyslij} className={`k-formularz zgl-formularz${pelny ? ' wsp-formularz' : ''}`}>
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
            <label className="k-etykieta" htmlFor={idPola}>co wiesz albo co masz <span className="zgl-wymagane">(wymagane)</span></label>
            <span id={`${idPola}-pyt`} className="k-podpowiedz zgl-pytanie">{pelny ? OPISY[r].podpowiedz : podpowiedz ?? (r === 'poprawka' ? pytaniePoprawki(adres) : OPISY[r].podpowiedz)}</span>
            <textarea ref={poleRef} id={idPola} autoFocus={!pelny} aria-invalid={stan === 'blad' && komunikatBleduZgloszenia(status).pole === 'tresc' ? true : undefined} aria-describedby={`${idPola}-pyt ${idPola}-pom${stan === 'blad' ? ` ${idPola}-blad` : ''}`} required minLength={3} maxLength={4000} rows={pelny ? 5 : 4} value={tresc} onChange={(e) => ustawTresc(e.target.value)} className="k-pole k-pole--tekst" />
            <span id={`${idPola}-pom`} className="k-podpowiedz">
                {email
                    ? <>Zdjęcia, skany i nagrania wyślij na adres <EmailLink k={email} /> – w temacie wpisz, czego dotyczą.</>
                    : 'Zgłoszenie trafia do redakcji – nie jest publikowane automatycznie.'}
            </span>
            <label className="k-etykieta" htmlFor={`${idPola}-k`}>kontakt do Ciebie (nieobowiązkowy)</label>
            <input id={`${idPola}-k`} aria-describedby={`${idPola}-kp`} autoComplete="email" value={kontakt} onChange={(e) => ustawKontakt(e.target.value)} maxLength={200} className="k-pole" placeholder="np. e-mail albo telefon" />
            <span id={`${idPola}-kp`} className="k-podpowiedz">Podaj, jeśli chcesz odpowiedź. Kontakt nie będzie pokazany na stronie.</span>
            {zgoda && (
                <label className="wsp-zgoda" htmlFor={`${idPola}-z`}>
                    <input id={`${idPola}-z`} type="checkbox" checked={podpis} onChange={(e) => ustawPodpis(e.target.checked)} />
                    <span>zgadzam się na podanie mojego autorstwa przy uzupełnieniu (opracował/a)</span>
                </label>
            )}
            {stan === 'blad' && (() => {
                const b = komunikatBleduZgloszenia(status)
                return <div ref={wynikRef} id={`${idPola}-blad`} tabIndex={-1} className="zgl-wynik">
                    <Komunikat rodzaj="blad" tytul={b.tytul} rola="alert"><p>{b.tresc}</p></Komunikat>
                </div>
            })()}
            <div className="k-formularz-akcje">
                <button type="submit" disabled={stan === 'wysylanie'} className="k-btn k-btn--glowny">{stan === 'wysylanie' ? 'wysyłam…' : stan === 'blad' ? 'spróbuj ponownie' : 'wyślij'}</button>
                {!pelny && <button type="button" onClick={zamknij} className="k-btn">anuluj</button>}
            </div>
        </form>
    )
    }
}

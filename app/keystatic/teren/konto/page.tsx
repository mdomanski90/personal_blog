'use client'
// P7b (TER-01): „konto” w aplikacji terenowej – kto jest zalogowany, jak dodać ikonę na ekran telefonu, wylogowanie
// (plansza „instalacja i praca bez internetu”).
// P7b-2 (TER-06): „praca bez internetu” – plany w telefonie z rozmiarem, „usuń z telefonu”; wylogowanie czyści telefon, chyba że
// coś czeka na wysłanie (wtedy ostrzega i dane zostają – decyzja 19.11, pyt. 3).
import * as React from 'react'
import { DNI_W_TELEFONIE, rozmiar } from '@/lib/teren/kolejka'
import { odmiana } from '@/lib/tekst'
import { planyWTelefonie, useKolejka, useZmianyPamieci, usunPlanZTelefonu, wyczyscTelefon, type PlanWTelefonie } from '../pamiec'
import { Blad, kiedy, useStart } from '../wspolne'

type Dane = { konto: string; imie: string; mozna: { plany: boolean; miejsca: boolean; sprawdzony: boolean } }
type Instalacja = Event & { prompt: () => Promise<void> }

export default function KontoWTerenie() {
    const { dane, blad } = useStart<Dane>()
    const { pozycje } = useKolejka()
    const [plany, ustawPlany] = React.useState<PlanWTelefonie[]>([])
    const [ostrzez, ustawOstrzez] = React.useState(false)
    const formularz = React.useRef<HTMLFormElement>(null)
    const wczytaj = React.useCallback(() => { planyWTelefonie().then((L) => ustawPlany(L.filter((p) => !dane || p.konto === dane.konto))).catch(() => {}) }, [dane])
    React.useEffect(() => wczytaj(), [wczytaj])
    useZmianyPamieci(wczytaj)
    const wyloguj = async (ev: React.FormEvent) => {
        ev.preventDefault()
        if (pozycje.length && !ostrzez) { ustawOstrzez(true); return }
        if (!pozycje.length) await wyczyscTelefon().catch(() => {})
        formularz.current?.submit()
    }
    const [instalacja, ustawInstalacje] = React.useState<Instalacja | null>(null)
    const [zainstalowana, ustawZainstalowana] = React.useState(false)
    React.useEffect(() => {
        const gotowa = (e: Event) => { e.preventDefault(); ustawInstalacje(e as Instalacja) }
        window.addEventListener('beforeinstallprompt', gotowa)
        ustawZainstalowana(window.matchMedia('(display-mode: standalone)').matches)
        return () => window.removeEventListener('beforeinstallprompt', gotowa)
    }, [])
    const mozesz = dane ? [dane.mozna.plany && 'dodawać zdjęcia grobów, napisy i notatki na swoich planach', dane.mozna.sprawdzony && 'oznaczać groby jako sprawdzone', dane.mozna.miejsca && 'zapisywać nowe miejsca'].filter(Boolean).join('; ') : ''
    return (
        <>
            <h1>konto</h1>
            {blad && <Blad tekst={blad} />}
            {dane && (
                <section className="pn-karta tr-karta" aria-labelledby="kt-ja">
                    <h2 id="kt-ja">{dane.imie}</h2>
                    <p>Możesz: {mozesz || 'na razie nic – poproś administratora o uprawnienia'}.</p>
                    <div className="pn-rzad">
                        <a className="pn-btn" href="/moje-konto">moje konto i urządzenia</a>
                        <form ref={formularz} method="post" action="/api/wyloguj" onSubmit={wyloguj}><button type="submit" className="pn-btn">{ostrzez ? 'wyloguj mimo to' : 'wyloguj'}</button></form>
                    </div>
                    {ostrzez && <p className="pn-ostrz pn-bez-marginesu" role="alert"><span>W telefonie {odmiana(pozycje.length, ['czeka pozycja', 'czekają pozycje', 'czeka pozycji'])} do wysłania. Po wylogowaniu zostaną w telefonie razem z pobranymi planami – wyślą się po ponownym zalogowaniu. Najlepiej najpierw wyślij je w „do wysłania”.</span></p>}
                </section>
            )}
            <section className="pn-karta tr-karta" aria-labelledby="kt-ikona">
                <h2 id="kt-ikona">ikona na ekranie telefonu</h2>
                {zainstalowana
                    ? <p>Aplikacja jest już na ekranie tego telefonu.</p>
                    : <>
                        <p>To ta sama strona, tylko z ikoną na telefonie. Nie trzeba niczego pobierać ze sklepu.</p>
                        <p><b>Android (Chrome):</b> dotknij „zainstaluj aplikację” poniżej albo w menu ⋮ wybierz „Dodaj do ekranu głównego”.</p>
                        <p><b>iPhone (Safari):</b> dotknij „Udostępnij” (kwadrat ze strzałką), potem „Do ekranu początkowego”.</p>
                        {instalacja && <div className="pn-rzad"><button type="button" className="pn-btn pn-btn-gl" onClick={() => instalacja.prompt().then(() => ustawInstalacje(null))}>zainstaluj aplikację</button></div>}
                    </>}
            </section>
            <section className="pn-karta tr-karta" aria-labelledby="kt-siec">
                <h2 id="kt-siec">praca bez internetu</h2>
                <p>Przed wyjazdem otwórz „plany” i wybierz „pobierz do pracy bez internetu” przy planie, na którym będziesz pracować. Na miejscu plan, położenie, zdjęcia i notatki działają bez internetu; wszystko wyśle się po wznowieniu połączenia, gdy aplikacja jest otwarta.</p>
                {plany.length === 0 && <p className="pn-szary">Żaden plan nie jest jeszcze pobrany do tego telefonu.</p>}
                {plany.map((p) => (
                    <div key={p.klucz} className="tr-wpis">
                        <span>{p.tytul}<span className="pn-tag tr-ok">dostępny bez internetu</span></span>
                        <span className="pn-maly">{rozmiar(p.bajty)} · pobrany {kiedy(p.pobrano)} · ostatnio otwarty {kiedy(p.otwarto)}</span>
                        <div className="pn-rzad"><button type="button" className="pn-btn pn-btn-maly" onClick={() => usunPlanZTelefonu(p.konto, p.slug)}>usuń z telefonu</button></div>
                    </div>
                ))}
                <p className="pn-maly">Plan nieotwierany przez {DNI_W_TELEFONIE} dni usuwa się z telefonu sam. Wylogowanie usuwa wszystkie plany z telefonu, jeśli nic nie czeka na wysłanie.</p>
            </section>
        </>
    )
}

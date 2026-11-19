'use client'
// P7b (TER-01): „konto” w aplikacji terenowej – kto jest zalogowany, jak dodać ikonę na ekran telefonu, wylogowanie
// (plansza „instalacja i praca bez internetu”; praca bez internetu – krok 2).
import * as React from 'react'
import { Blad, useTeren } from '../wspolne'

type Dane = { imie: string; mozna: { plany: boolean; miejsca: boolean; sprawdzony: boolean } }
type Instalacja = Event & { prompt: () => Promise<void> }

export default function KontoWTerenie() {
    const { dane, blad } = useTeren<Dane>('/api/keystatic/teren')
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
                        <form method="post" action="/api/wyloguj"><button type="submit" className="pn-btn">wyloguj</button></form>
                    </div>
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
                <p className="pn-szary">W przygotowaniu. Na razie do zapisu potrzebny jest internet – gdy go zabraknie, zobaczysz komunikat i nic nie zginie z tego, co już zapisane.</p>
            </section>
        </>
    )
}

'use client'
// Dostęp: jak dziś chroniony jest panel, hasło „dla bliskich”, planowane konta z kluczami dostępu.
import * as React from 'react'
import { useDane } from '../wspolne'

type System = { serwer: { logowanieBliskich: boolean } }

function Polecenie({ tekst }: { tekst: string }) {
    const [ok, ustawOk] = React.useState(false)
    return (
        <span className="pn-rzad" style={{ gap: 6 }}>
            <code style={{ padding: '6px 10px', borderRadius: 7, background: 'var(--hover)', border: '1px solid var(--linia)', fontSize: 12, overflowWrap: 'anywhere' }}>{tekst}</code>
            <button type="button" className="pn-btn" onClick={() => { navigator.clipboard?.writeText(tekst).then(() => { ustawOk(true); window.setTimeout(() => ustawOk(false), 1500) }) }}>{ok ? 'skopiowano' : 'kopiuj'}</button>
        </span>
    )
}

export default function Dostep() {
    const { dane } = useDane<System>('/api/keystatic/panel?czesc=system')
    return (
        <>
            <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <h1>dostęp</h1>
                <span className="pn-szary" style={{ fontSize: 12.5 }}>kto może wejść do panelu i kto czyta treści „dla bliskich”</span>
            </header>

            <div className="pn-siatka">
                <section className="pn-karta" aria-labelledby="panel">
                    <h2 id="panel">panel</h2>
                    <dl className="pn-dl">
                        <dt>dziś</dt><dd>jedno hasło serwera (nginx) do /keystatic i /api/keystatic – każdy, kto je zna, ma pełny dostęp</dd>
                        <dt>zapis</dt><dd>tylko z tej strony i tylko z hasłem panelu (sprawdza każda trasa API)</dd>
                    </dl>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: '1px dashed var(--linia)', borderRadius: 7 }}>
                        <b>konta z kluczami dostępu – w przygotowaniu</b>
                        <span className="pn-maly">Logowanie przez Pocket ID: każda osoba ma własne konto i loguje się kluczem dostępu (Face ID, odcisk palca albo PIN telefonu, klucz sprzętowy). Zaproszenie to jednorazowy link; w rzadkich przypadkach – jednorazowy link na jedno wejście.</span>
                        <dl className="pn-dl">
                            <dt>administrator</dt><dd>wszystko, także konta, kopie i ustawienia</dd>
                            <dt>redaktor</dt><dd>treści, archiwum, plany, osoby, zgłoszenia</dd>
                            <dt>wolontariusz terenowy</dt><dd>wybrane plany: zdjęcia, napisy z nagrobków, „sprawdzony”</dd>
                            <dt>podgląd</dt><dd>widzi panel i szkice, niczego nie zmienia</dd>
                        </dl>
                    </div>
                </section>

                <section className="pn-karta" aria-labelledby="bliscy">
                    <h2 id="bliscy">dostęp „dla bliskich”</h2>
                    <span style={{ lineHeight: 1.5 }}>Jedno wspólne hasło do czytania treści „dla bliskich” (osoby żyjące, nowsze groby, notatki). Nie otwiera panelu.</span>
                    <dl className="pn-dl">
                        <dt>stan</dt><dd>{dane ? (dane.serwer.logowanieBliskich ? 'włączone' : 'wyłączone – treści „dla bliskich” widzisz tylko Ty w panelu') : '…'}</dd>
                        <dt>sesja ważna</dt><dd>180 dni</dd>
                    </dl>
                    <span className="pn-etyk">zmiana hasła (na serwerze, w katalogu strony)</span>
                    <Polecenie tekst="npm run haslo -- 'nowe hasło' && sudo systemctl restart blog" />
                    <span className="pn-maly" style={{ color: 'var(--ostrz)' }}>Zmiana hasła wylogowuje wszystkich bliskich. Hasło ma co najmniej 8 znaków; wyłączenie: npm run haslo -- --wylacz.</span>
                </section>
            </div>
        </>
    )
}

'use client'
// P7a: „połącz to urządzenie” – otwiera usługę logowania (Pocket ID) w nowej karcie; ta strona czeka i sama idzie dalej,
// gdy urządzenie jest połączone (Pocket ID po zapisaniu klucza zostaje na swojej stronie „Moje konto” – sprawdzone na 2.19.2).
import * as React from 'react'
import Komunikat from '../../components/Komunikat'

export default function Polacz({ kod, adres }: { kod: string; adres: string }) {
    const [stan, ustawStan] = React.useState<'start' | 'czeka' | 'gotowe' | 'niewazne'>('start')
    React.useEffect(() => {
        if (stan !== 'czeka') return
        let zywy = true
        const sprawdz = async () => {
            if (document.visibilityState !== 'visible') return
            const r = await fetch(`/api/konto/zaproszenie?kod=${encodeURIComponent(kod)}`, { cache: 'no-store' }).catch(() => null)
            if (!zywy || !r) return
            if (r.status === 404) { ustawStan('niewazne'); return }
            const j = (await r.json().catch(() => null)) as { polaczone?: boolean } | null
            if (zywy && j?.polaczone) ustawStan('gotowe')
        }
        const t = window.setInterval(sprawdz, 2500)
        document.addEventListener('visibilitychange', sprawdz)
        return () => { zywy = false; window.clearInterval(t); document.removeEventListener('visibilitychange', sprawdz) }
    }, [stan, kod])
    React.useEffect(() => {
        if (stan !== 'gotowe') return
        const t = window.setTimeout(() => location.assign('/api/konto/zaloguj?wroc=%2Fmoje-konto'), 1500)
        return () => window.clearTimeout(t)
    }, [stan])
    return (
        <div className="konto-polacz">
            <p><a className="k-btn k-btn--glowny k-btn--l" href={adres} target="_blank" rel="noopener" onClick={() => ustawStan('czeka')}>połącz to urządzenie →</a></p>
            <p className="konto-drobne">Otworzy się nowa karta naszej usługi logowania (konto.odniepamieci.pl). Wybierz tam „Dodaj klucz”, a potem wróć na tę kartę – strona sama pójdzie dalej.</p>
            <div aria-live="polite">
                {stan === 'czeka' && <Komunikat rodzaj="info" tytul="czekam na połączenie urządzenia">Gdy w drugiej karcie zobaczysz „Moje konto”, możesz ją zamknąć i wrócić tutaj.</Komunikat>}
                {stan === 'gotowe' && <Komunikat rodzaj="ok" tytul="urządzenie połączone"><p>Za chwilę nastąpi logowanie. <a href="/api/konto/zaloguj?wroc=%2Fmoje-konto">przejdź dalej</a></p></Komunikat>}
                {stan === 'niewazne' && <Komunikat rodzaj="uwaga" tytul="link przestał działać">Poproś o nowy link albo – jeśli urządzenie jest już połączone – <a href="/zaloguj">zaloguj się</a>.</Komunikat>}
            </div>
        </div>
    )
}

import type { Metadata } from 'next'
import { poziomCzytelnika } from '@/lib/archiwum'
import { kontaWlaczone, rolaTeraz, zalogowanyTeraz } from '@/lib/konta/straz'
import { adresPowrotu, logowanieWlaczone } from '@/lib/sesja'
import Komunikat from '../components/Komunikat'
import { Sekcja, Strona, TytulStrony } from '../components/Uklad'

// P7a (KON-01): dwa sposoby logowania obok siebie – konto (klucz dostępu, Pocket ID) i wspólne hasło „dla bliskich” (plansza „zaloguj”).
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'zaloguj · odniepamieci.pl', robots: { index: false, follow: false } }

const BLEDY: Record<string, string> = {
    haslo: 'Nieprawidłowe hasło.',
    limit: 'Za dużo prób – spróbuj ponownie za kwadrans.',
    wylaczone: 'Logowanie hasłem nie jest jeszcze włączone.',
    'konta-wylaczone': 'Logowanie kontem nie jest jeszcze włączone.',
    usluga: 'Usługa logowania chwilowo nie odpowiada. Spróbuj ponownie za chwilę.',
    przerwane: 'Logowanie zostało przerwane. Spróbuj jeszcze raz.',
    'brak-konta': 'To urządzenie jest połączone, ale na tej stronie nie ma już takiego konta. Napisz do redakcji.',
    zablokowane: 'To konto jest wstrzymane. Napisz do redakcji.',
    zapis: 'Nie udało się dokończyć logowania. Spróbuj jeszcze raz.',
}

export default async function Zaloguj({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const sp = await searchParams
    const wroc = adresPowrotu(sp.wroc)
    const [konto, poziom] = await Promise.all([zalogowanyTeraz(), poziomCzytelnika()])
    return (
        <Strona>
            <TytulStrony>zaloguj</TytulStrony>
            {sp.blad && <Komunikat rodzaj="blad">{BLEDY[sp.blad] ?? 'Nie udało się zalogować.'}</Komunikat>}
            {konto ? (
                <Komunikat rodzaj="ok" tytul={`jesteś zalogowany jako ${konto.konto.imie} (${rolaTeraz(konto)})`}>
                    <p><a href="/moje-konto">moje konto</a></p>
                </Komunikat>
            ) : (
                <>
                    {kontaWlaczone() && (
                        <Sekcja tytul="konto">
                            <p className="konto-opis">Masz konto (redakcja, wolontariat, bliscy)? Zaloguj się kluczem dostępu zapisanym na tym telefonie lub komputerze – odciskiem palca, twarzą albo PIN-em. Bez hasła.</p>
                            <p><a className="k-btn k-btn--glowny" href={`/api/konto/zaloguj?wroc=${encodeURIComponent(wroc)}`}>zaloguj kluczem dostępu →</a></p>
                            <p className="konto-drobne">Za chwilę zobaczysz stronę logowania konto.odniepamieci.pl – to nasza usługa. Nowe urządzenie albo zgubiony telefon? Poproś redakcję o nowy link do klucza.</p>
                        </Sekcja>
                    )}
                    <Sekcja tytul="hasło dla bliskich">
                        {poziom !== 'publiczne' ? <p className="konto-opis">Jesteś zalogowany hasłem – widzisz też materiały „dla bliskich”.</p> : (
                            <form method="post" action="/api/zaloguj" className="konto-form">
                                <p className="konto-opis">Część materiałów (np. o osobach żyjących) jest widoczna tylko dla rodziny i bliskich. Wspólne hasło dostaniesz od autora strony.</p>
                                {!logowanieWlaczone() && !sp.blad && <p className="konto-drobne">{BLEDY.wylaczone}</p>}
                                <input type="hidden" name="wroc" value={wroc} />
                                <label className="konto-pole" htmlFor="haslo">hasło</label>
                                <div className="konto-rzad">
                                    <input id="haslo" type="password" name="haslo" required autoComplete="current-password" className="k-pole" />
                                    <button type="submit" className="k-btn">zaloguj hasłem</button>
                                </div>
                            </form>
                        )}
                    </Sekcja>
                </>
            )}
        </Strona>
    )
}

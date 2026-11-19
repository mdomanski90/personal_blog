'use client'
// P7b (TER-01): „do wysłania” (plansza) – co ostatnio przesłano i napisy, przy których w tym samym czasie coś zmieniła redakcja.
// P7b-2 (TER-06): kolejka w telefonie – „oczekuje” / „nie da się zapisać”, „wyślij teraz” (bez sieci nieaktywne), pozycje innego konta.
import * as React from 'react'
import { NAZWA_CZYNNOSCI, type WpisDziennika } from '@/lib/teren/czynnosci'
import { cudze, opisPozycji, type PozycjaKolejki } from '@/lib/teren/kolejka'
import { nazwaRodzajuTerenu } from '@/lib/teren/miejsca'
import { odmiana } from '@/lib/tekst'
import { kontoWTelefonie, useKolejka, usunZKolejki, wyslijKolejke } from '../pamiec'
import { Blad, kiedy, useStart } from '../wspolne'

type Czynnosc = WpisDziennika & { plan: string; tytul: string }
type Miejsce = { id: string; czas: string; rodzaj: string; nazwa: string; zdjec: number; stan: 'nowe' | 'opracowane' | 'odrzucone' }
type Dane = { konto: string; czynnosci: Czynnosc[]; miejsca: Miejsce[] }
const STAN_MIEJSCA = { nowe: 'u redakcji', opracowane: 'opracowane', odrzucone: 'odrzucone' }

function Pozycja({ p, inne }: { p: PozycjaKolejki; inne?: boolean }) {
    const { tytul, opis } = opisPozycji(p, nazwaRodzajuTerenu)
    return (
        <div className="tr-wpis">
            <span>{tytul}<span className={`pn-tag ${p.stan === 'problem' ? 'tr-poz-problem' : 'tr-czeka'}`}>{p.stan === 'problem' ? 'nie da się zapisać' : 'oczekuje'}</span></span>
            <span className="pn-maly">{opis} · {kiedy(p.czas)}</span>
            {p.stan === 'problem' && <span className="pn-maly">{p.blad}</span>}
            {(p.stan === 'problem' || inne) && <div className="pn-rzad"><button type="button" className="pn-btn pn-btn-maly" onClick={() => { if (window.confirm('Usunąć tę pozycję z telefonu? Nie trafi do redakcji.')) usunZKolejki(p.id) }}>usuń z telefonu</button></div>}
        </div>
    )
}

export default function DoWyslania() {
    const { dane, blad, zTelefonu, odswiez } = useStart<Dane>()
    const { pozycje, bezSieci, trwa } = useKolejka()
    const [konto, ustawKonto] = React.useState<string | null>(null)
    const [kom, ustawKom] = React.useState('')
    React.useEffect(() => { kontoWTelefonie().then(ustawKonto).catch(() => {}) }, [dane])
    const ja = dane?.konto ?? konto
    const moje = ja ? pozycje.filter((p) => p.konto === ja) : pozycje
    const obce = ja ? cudze(pozycje, ja) : []
    const czekaja = moje.filter((p) => p.stan === 'czeka').length
    const wyslijTeraz = async () => {
        ustawKom('wysyłam…')
        const w = await wyslijKolejke()
        ustawKom(w.zaloguj ? 'Sesja wygasła – zaloguj się, żeby wysłać.' : w.przerwane ? 'Nie udało się połączyć z serwerem – spróbuję ponownie po wznowieniu połączenia.' : w.wyslane.size ? `Wysłano: ${w.wyslane.size}.` : '')
        if (w.wyslane.size) odswiez()
    }
    const wpisy = dane ? [
        ...dane.czynnosci.map((c) => ({ klucz: `c-${c.id}`, czas: c.czas, tytul: `${c.tytul} · ${c.numer ?? 'grób bez numeru'}`, opis: NAZWA_CZYNNOSCI[c.rodzaj], doDecyzji: c.wynik === 'do-decyzji' && !c.rozstrzygnieto, tag: 'przesłane ✓', dobrze: true })),
        ...dane.miejsca.map((m) => ({ klucz: `m-${m.id}`, czas: m.czas, tytul: m.nazwa || nazwaRodzajuTerenu(m.rodzaj), opis: `nowe miejsce · zdjęcia: ${m.zdjec}`, doDecyzji: false, tag: m.stan === 'odrzucone' ? STAN_MIEJSCA[m.stan] : `${STAN_MIEJSCA[m.stan]} ✓`, dobrze: m.stan !== 'odrzucone' })),
    ].sort((a, b) => b.czas.localeCompare(a.czas)) : []
    const doDecyzji = wpisy.filter((w) => w.doDecyzji)
    return (
        <>
            <header className="pn-kol pn-kol-wasko">
                <h1>do wysłania{moje.length > 0 && ` · ${moje.length}`}</h1>
                <span className="pn-maly">Zmiany zapisane bez internetu są przechowywane w telefonie. Zostaną przesłane po wznowieniu połączenia, gdy aplikacja jest otwarta.</span>
            </header>
            {blad && <Blad tekst={blad} />}
            {kom && <div className="tr-kom" role="status">{kom}</div>}
            <section className="pn-karta tr-karta" aria-labelledby="dw-tel">
                <h2 id="dw-tel">w telefonie</h2>
                {moje.length === 0 && <p className="pn-szary">Nic nie czeka – wszystko jest u redakcji.</p>}
                {moje.map((p) => <Pozycja key={p.id} p={p} />)}
                {czekaja > 0 && (
                    <div className="pn-rzad">
                        <button type="button" className="pn-btn pn-btn-gl" disabled={bezSieci || trwa} onClick={wyslijTeraz}>{trwa ? 'wysyłam…' : 'wyślij teraz'}</button>
                        {bezSieci && <span className="pn-maly">dostępne po wznowieniu połączenia</span>}
                    </div>
                )}
            </section>
            {obce.length > 0 && (
                <section className="pn-karta tr-karta" aria-labelledby="dw-inne">
                    <h2 id="dw-inne">zapisane z innego konta</h2>
                    <p className="pn-maly">W tym telefonie {odmiana(obce.length, ['czeka pozycja', 'czekają pozycje', 'czeka pozycji'])} zapisanych przez inne konto. Wyślą się po zalogowaniu na tamto konto – albo usuń je z telefonu.</p>
                    {obce.map((p) => <Pozycja key={p.id} p={p} inne />)}
                </section>
            )}
            {dane && (
                <section className="pn-karta tr-karta" aria-labelledby="dw-ost">
                    <h2 id="dw-ost">ostatnio przesłane</h2>
                    {zTelefonu && <span className="pn-maly">Stan z {kiedy(zTelefonu)} – bez internetu nie widać nowszych.</span>}
                    {wpisy.length === 0 && <p className="pn-szary">Jeszcze nic – zdjęcia grobów, napisy i nowe miejsca pojawią się tutaj.</p>}
                    {wpisy.map((w) => (
                        <div key={w.klucz} className="tr-wpis">
                            <span>{w.tytul}<span className={`pn-tag${w.doDecyzji ? ' tr-czeka' : w.dobrze ? ' tr-ok' : ''}`}>{w.doDecyzji ? 'do decyzji' : w.tag}</span></span>
                            <span className="pn-maly">{w.opis} · {kiedy(w.czas)}</span>
                        </div>
                    ))}
                </section>
            )}
            {doDecyzji.length > 0 && (
                <section className="pn-karta tr-karta" aria-labelledby="dw-dec">
                    <h2 id="dw-dec">zmiana w tym samym miejscu</h2>
                    {doDecyzji.map((w) => <div key={w.klucz} className="tr-wpis"><span>{w.tytul}<span className="pn-tag tr-czeka">do decyzji</span></span></div>)}
                    <p className="pn-maly">W tym czasie redakcja poprawiła ten napis w panelu. Obie wersje zostały zachowane – wybierze redakcja.</p>
                </section>
            )}
        </>
    )
}

'use client'
// P7b (TER-01): „do wysłania” (plansza). W kroku 1 (praca z internetem) wszystko zapisuje się od razu – ekran pokazuje,
// co ostatnio przesłano, i napisy, przy których w tym samym czasie coś zmieniła redakcja. Kolejka bez internetu: krok 2.
import { NAZWA_CZYNNOSCI, type WpisDziennika } from '@/lib/teren/czynnosci'
import { nazwaRodzajuTerenu } from '@/lib/teren/miejsca'
import { Blad, kiedy, useTeren } from '../wspolne'

type Czynnosc = WpisDziennika & { plan: string; tytul: string }
type Miejsce = { id: string; czas: string; rodzaj: string; nazwa: string; zdjec: number; stan: 'nowe' | 'opracowane' | 'odrzucone' }
type Dane = { czynnosci: Czynnosc[]; miejsca: Miejsce[] }
const STAN_MIEJSCA = { nowe: 'u redakcji', opracowane: 'opracowane', odrzucone: 'odrzucone' }

export default function DoWyslania() {
    const { dane, blad } = useTeren<Dane>('/api/keystatic/teren')
    const wpisy = dane ? [
        ...dane.czynnosci.map((c) => ({ klucz: `c-${c.id}`, czas: c.czas, tytul: `${c.tytul} · ${c.numer ?? 'grób bez numeru'}`, opis: NAZWA_CZYNNOSCI[c.rodzaj], doDecyzji: c.wynik === 'do-decyzji' && !c.rozstrzygnieto, tag: 'przesłane ✓', dobrze: true })),
        ...dane.miejsca.map((m) => ({ klucz: `m-${m.id}`, czas: m.czas, tytul: m.nazwa || nazwaRodzajuTerenu(m.rodzaj), opis: `nowe miejsce · zdjęcia: ${m.zdjec}`, doDecyzji: false, tag: m.stan === 'odrzucone' ? STAN_MIEJSCA[m.stan] : `${STAN_MIEJSCA[m.stan]} ✓`, dobrze: m.stan !== 'odrzucone' })),
    ].sort((a, b) => b.czas.localeCompare(a.czas)) : []
    const doDecyzji = wpisy.filter((w) => w.doDecyzji)
    return (
        <>
            <header className="pn-kol pn-kol-wasko">
                <h1>do wysłania</h1>
                <span className="pn-maly">Wszystko, co zapisujesz, trafia od razu do redakcji – na razie potrzebny jest internet.</span>
            </header>
            {blad && <Blad tekst={blad} />}
            {!dane && !blad && <span className="pn-szary">wczytuję…</span>}
            {dane && (
                <section className="pn-karta tr-karta" aria-labelledby="dw-ost">
                    <h2 id="dw-ost">ostatnio przesłane</h2>
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

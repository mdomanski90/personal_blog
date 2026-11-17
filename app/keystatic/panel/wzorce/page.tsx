'use client'
import * as React from 'react'
import { KOMPONENTY_BAZOWE } from '@/lib/szablony/rejestr'
import { EtykietaBraku, GrupaZadan, KrokiDzialania, Okruszki, PastylkaFiltra, PastylkaOsoby, RzadFiltrow, TytulSekcji } from '@/app/components/Wzorce'
import SpisTresci from '@/app/components/SpisTresci'
import { PrzyciskDrukuj } from '@/app/components/Druk'
import { PozycjaWKarcie } from '@/app/components/KartaPozycji'
import SiatkaMiniatur from '@/app/components/SiatkaMiniatur'
import PanelPlanu, { CalyPanelu, CzescPanelu, WierszPanelu } from '@/app/components/plan/PanelPlanu'

/**
 * JW-1: podgląd wzorców języka wizualnego – komponenty bazowe na żywo, w obu motywach, z klas i tokenów app/globals.css.
 * Nowy wzorzec najpierw tutaj i w rejestrze (lib/szablony/rejestr.ts), dopiero potem na stronach (zasada 5.1c).
 */
const ROZMIARY: [string, string][] = [
    ['--rozmiar-drobny', '12 px'], ['--rozmiar-etykieta', '13 px'], ['--rozmiar-opis', '14 px'], ['--rozmiar-maly', '15 px'],
    ['--rozmiar-tekst', '16 px'], ['--rozmiar-tresc', '18 px'], ['--rozmiar-tytul-sekcji', '20 px'], ['--rozmiar-tytul', '1.3rem'], ['--rozmiar-tytul-strony', '1.75rem'],
]
const SPIS = [['wstep', 'wstęp'], ['podstawowe', 'podstawowe'], ['historia', 'pełna historia'], ['teren', 'w terenie, księgi'], ['zrodla', 'źródła']]

function Probka({ motyw }: { motyw: string }) {
    const spis = SPIS.map(([id, tekst]) => ({ id: `wz-${motyw}-${id}`, tekst }))
    return (
        <div className="wz-probka">
            <div className="tytul-strony-blok">
                <div className="pasek-akcji"><PrzyciskDrukuj /></div>
                <Okruszki sciezka={[{ tekst: 'osoby', href: '/osoby' }]} />
                <h1 className="tytul-strony">Piotr Przykładowski</h1>
            </div>
            <TytulSekcji>z archiwum</TytulSekcji>
            <RzadFiltrow etykieta="kręgi">
                <PastylkaFiltra href="#" aktywny liczba={12}>wszyscy</PastylkaFiltra>
                <PastylkaFiltra href="#" liczba={7}>rodzina</PastylkaFiltra>
                <PastylkaFiltra href="#" liczba={0}>ukryty – wynik 0</PastylkaFiltra>
            </RzadFiltrow>
            <RzadFiltrow podpis="miejscowość:">
                <PastylkaFiltra href="#" liczba={5}>Testowo</PastylkaFiltra>
                <PastylkaFiltra href="#" liczba={2}>Wola Przykładowa</PastylkaFiltra>
            </RzadFiltrow>
            <div className="wz-rzad">
                <PastylkaOsoby href="#" plec="K">Anna Przykładowska</PastylkaOsoby>
                <PastylkaOsoby href="#" plec="M">Jan Przykładowski</PastylkaOsoby>
                <PastylkaOsoby href="#" plec="U">N.N. Przykładowskie</PastylkaOsoby>
            </div>
            {/* etap 3 · wariant B (17.11): nagłówek karty nad siatką, pasek części (spis) pod nim, pasek boczny od pierwszej tabeli */}
            <div className="karta-naglowek"><span className="wz-blok" id={`wz-${motyw}-wstep`}>nagłówek karty (karta-naglowek) – tytuł, linia, wstęp (pozycja „wstęp” w spisie)</span></div>
            <div className="karta-pasek-czesci"><SpisTresci pozycje={spis} /></div>
            <div className="karta-odcinek karta-odcinek-pierwszy">
                <aside className="karta-bok"><span className="wz-blok wz-obraz">obraz nagłówka (bok)</span></aside>
                <div className="karta-kolumna">
                    {spis.slice(1).map((p) => <span key={p.id} id={p.id} className="wz-blok">{p.tekst} – kolumna tekstu (66 znaków)</span>)}
                </div>
            </div>
            <div className="osoba-tabela karta-tabela">
                <div className="ksiegi-w-karcie">
                    <PozycjaWKarcie tytul="Plan przykładowy (pozycja w karcie z miniaturą)" prawa="1939" pola={[['rodzaj', 'plan historyczny'], ['sporządzono', '1985'], ['źródło', 'szkic z pamięci · Autor X']]} miniatura={<span className="wz-blok">miniatura 160×120</span>} />
                    <PozycjaWKarcie tytul="urodzenia, małżeństwa (pozycja w karcie)" prawa="1850–1860" pola={[['przechowuje', 'archiwum przykładowe']]} />
                </div>
            </div>
            <SiatkaMiniatur pozycje={[
                { klucz: 'a', href: '#', tytul: 'Materiał przykładowy', linia: 'dokument · 1917', znak: '▣' },
                { klucz: 'b', href: '#', tytul: 'Plan przykładowy', linia: 'plan historyczny · 1939', znak: '▤' },
            ]} />
            {/* etap 3 · PanelPlanu: tabela karty na wysokość mapy (przeglądarka planu, materiał z rekonstrukcją) */}
            <PanelProbka />
            {/* WSP-01 (etap R): wzorce strony „współtwórz” */}
            <KrokiDzialania kroki={[{ tytul: 'Przesłanie zgłoszenia', opis: 'krok pierwszy (wsp-kroki)' }, { tytul: 'Weryfikacja', opis: 'krok drugi' }, { tytul: 'Uzupełnienie na stronie', opis: 'krok trzeci' }]} />
            <GrupaZadan tytul="grupa zadań (wsp-grupa)" liczba={2} opis="Opis grupy – jedno zdanie.">
                <SiatkaMiniatur pozycje={[{ klucz: 'w', href: '#', tytul: 'Materiał przykładowy', linia: 'dokument · 1925', znak: '▣', dol: <><EtykietaBraku>brak transkrypcji · łacina</EtykietaBraku><a href="#" className="k-btn k-btn--s lowercase">uzupełnij</a></> }]} />
            </GrupaZadan>
            <div className="wz-rozmiary">
                {ROZMIARY.map(([t, opis]) => <p key={t} className={`wz-r-${t.slice(10)}`}>{t} · {opis} · zażółć gęślą jaźń</p>)}
            </div>
        </div>
    )
}

function PanelProbka() {
    const [q, ustawQ] = React.useState('')
    return (
        <div className="wz-panel">
            <div className="szt-pasek"><b className="szt-jedna">szukaj i opis planu (szt-pasek)</b></div>
            <div className="plan-aplet-panel">
                <PanelPlanu tytul="szukaj i opis planu" szukaj={q} ustawSzukaj={ustawQ} podpowiedz="nazwisko, imię, rok – na tym planie" etykieta="panel planu – podgląd" opisPodpowiedzi="Nie wszystkie napisy są już odczytane.">
                    <CzescPanelu tytul="na tym planie" />
                    <WierszPanelu e="groby">212</WierszPanelu>
                    <WierszPanelu e="opisane">48 · plan w opracowaniu</WierszPanelu>
                    <CzescPanelu tytul="kwatery">2 kwatery</CzescPanelu>
                    <CalyPanelu><span className="plan-panel-przyciski"><button type="button" className="k-btn k-btn--s">A</button><button type="button" className="k-btn k-btn--s">B</button></span></CalyPanelu>
                    <CzescPanelu tytul="o planie" />
                    <WierszPanelu e="numeracja">robocza, nie urzędowa</WierszPanelu>
                </PanelPlanu>
            </div>
        </div>
    )
}

export default function WzorceJezykaWizualnego() {
    return (
        <div className="wz">
            <style>{`
.wz{display:flex;flex-direction:column;gap:18px}
.wz-motywy{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,560px),1fr));gap:16px}
.wz-motyw{background:var(--tlo-strony);color:var(--tekst);border:1px solid var(--linia-podzialu);border-radius:var(--promien-duzy);padding:20px;min-width:0}
.wz-motyw.odp{max-width:none;min-height:0;margin:0}
/* panel ma własny --akcent; w podglądzie akcent publiczny liczony w każdym motywie od --link (jak na html stron publicznych) */
.wz-motyw{--akcent:var(--link);--fokus:var(--link)}
.wz-motyw:not(.dark){--akcent-wypelnienie:var(--link)}
.wz-probka{display:flex;flex-direction:column;gap:var(--odstep-sekcji)}
.wz-rzad{display:flex;flex-wrap:wrap;gap:8px}
.wz-blok{display:block;padding:10px 12px;border:1px dashed var(--linia-podzialu);border-radius:var(--promien);color:var(--tekst-etykieta);font-size:var(--rozmiar-etykieta)}
.wz-obraz{min-height:120px}
.wz-panel{border:1px solid var(--linia-podzialu);border-radius:var(--promien);overflow:hidden;max-width:380px}
.wz-panel .plan-aplet-panel{height:320px;border-left:0}
.wz .karta-odcinek{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)}
.wz .karta-pasek-czesci{position:static}
.wz-rozmiary p{margin:0;color:var(--tekst-opis)}
${ROZMIARY.map(([t]) => `.wz-r-${t.slice(10)}{font-size:var(${t})}`).join('\n')}
.wz-tab{width:100%;border-collapse:collapse;font-size:13.5px}
.wz-tab th{text-align:left;font-weight:600;font-size:12px;padding:6px 8px;border-bottom:1px solid var(--linia)}
.wz-tab td{padding:8px;border-bottom:1px solid var(--linia);vertical-align:top}
`}</style>
            <div>
                <h1 className="wz-h1">wzorce języka wizualnego</h1>
                <p className="pn-szary">
                    Komponenty bazowe stron publicznych (etap JW-1) – na żywo, w obu motywach, wyłącznie z klas i tokenów app/globals.css.
                    Strony składamy z tych wzorców; style inline i kolory spoza tokenów zatrzymuje test języka wizualnego (zapadka per plik) przy każdym buildzie.
                </p>
            </div>
            <div className="wz-motywy">
                <section className="wz-motyw odp" aria-label="motyw jasny"><Probka motyw="jasny" /></section>
                <section className="wz-motyw odp dark" aria-label="motyw ciemny"><Probka motyw="ciemny" /></section>
            </div>
            <table className="wz-tab">
                <thead><tr><th>wzorzec</th><th>komponent · plik</th><th>klasa</th><th>opis</th></tr></thead>
                <tbody>
                    {KOMPONENTY_BAZOWE.map((k) => (
                        <tr key={k.id}><td><b>{k.nazwa}</b></td><td><code>{k.komponent}</code><br /><span className="pn-maly">{k.plik}</span></td><td><code>.{k.klasa}</code></td><td className="pn-maly">{k.opis}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

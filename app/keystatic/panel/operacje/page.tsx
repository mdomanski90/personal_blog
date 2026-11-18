'use client'
// P5: ostatnie operacje – import ksiąg, import drzewa, zmiany zbiorcze. „Cofnij” z podglądem (konflikty = pliki zmienione później),
// przerwana operacja po awarii: „dokończ” albo „cofnij”. Kopie zmienianych plików: content/_operacje (30 ostatnich).
import * as React from 'react'
import { kiedy, odmiana, useDane } from '../wspolne'
import { Okno } from '../okno'

type Op = {
    id: string; rodzaj: string; nazwa: string; opis: string; utworzono: string; stan: string; pliki: number
    utworzone: number; zmienione: number; usuniete: number; cofa: string | null; cofnietaPrzez: string | null; problemy: string[]; przyklady: string[]
}
type Blokada = { id: string; czas: string; opis: string; martwa: boolean } | null
type Podglad = { id: string; opis: string; pliki: number; konflikty: string[]; mozna: boolean; powod?: string }

const STAN: Record<string, string> = {
    zapisane: 'zapisana', przygotowane: 'przerwana', wycofane: 'wycofana przy błędzie', 'wycofane-czesciowo': 'wycofana częściowo',
    cofniete: 'cofnięta', dokonczone: 'dokończona po awarii',
}
const API = '/api/keystatic/panel/operacje'

async function wyslij(body: unknown): Promise<{ ok: boolean; dane: Record<string, unknown> }> {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
    if (!r) return { ok: false, dane: { blad: 'Brak połączenia z serwerem.' } }
    return { ok: r.ok, dane: await r.json().catch(() => ({})) }
}

function liczby(o: Pick<Op, 'utworzone' | 'zmienione' | 'usuniete'>) {
    return [o.utworzone && `nowe ${o.utworzone}`, o.zmienione && `zmienione ${o.zmienione}`, o.usuniete && `usunięte ${o.usuniete}`].filter(Boolean).join(' · ')
}

export default function Operacje() {
    const { dane, blad, odswiez } = useDane<{ operacje: Op[]; blokada: Blokada; katalogi?: { brak: string[]; komenda: string } | null }>(API)
    const [kom, ustawKom] = React.useState('')
    const [podglad, ustawPodglad] = React.useState<Podglad | null>(null)
    const [reszta, ustawReszta] = React.useState(false)
    const [trwa, ustawTrwa] = React.useState(false)
    const zamknij = React.useCallback(() => { ustawPodglad(null); ustawReszta(false) }, [])

    const otworzCofnij = async (id: string) => {
        const r = await fetch(`${API}?podglad=${encodeURIComponent(id)}`, { cache: 'no-store' }).catch(() => null)
        if (!r?.ok) { ustawKom('Nie udało się przygotować podglądu cofnięcia.'); return }
        ustawPodglad(await r.json())
    }
    const cofnij = async () => {
        if (!podglad) return
        ustawTrwa(true)
        const w = await wyslij({ akcja: 'cofnij', id: podglad.id, pominKonflikty: reszta })
        ustawTrwa(false)
        ustawKom(w.ok ? `Cofnięto: ${odmiana(Number(w.dane.zapisane ?? 0), ['plik', 'pliki', 'plików'])}.${(w.dane.konflikty as string[] | undefined)?.length ? ` Bez zmian (zmienione później): ${(w.dane.konflikty as string[]).length}.` : ''}` : String(w.dane.blad ?? 'Nie udało się cofnąć.'))
        zamknij(); odswiez()
    }
    const przerwana = async (akcja: 'dokoncz' | 'cofnij-przerwana' | 'odblokuj', id?: string) => {
        if (akcja !== 'odblokuj' && !confirm(akcja === 'dokoncz' ? 'Dokończyć przerwaną operację (zapisać brakujące pliki)?' : 'Cofnąć przerwaną operację (przywrócić pliki sprzed niej)?')) return
        const w = await wyslij({ akcja, id })
        ustawKom(w.ok ? (akcja === 'odblokuj' ? 'Blokada zdjęta.' : `Gotowe – zmienionych plików: ${w.dane.zmienione ?? 0}.${(w.dane.konflikty as string[] | undefined)?.length ? ` Pominięte (zmienione ręcznie): ${(w.dane.konflikty as string[]).join(', ')}.` : ''}`) : String(w.dane.blad ?? 'Nie udało się.'))
        odswiez()
    }

    const L = dane?.operacje ?? []
    const przerwane = L.filter((o) => o.stan === 'przygotowane')
    const b = dane?.blokada
    return (
        <>
            <header className="pn-kol pn-kol-wasko">
                <h1>ostatnie operacje</h1>
                <span className="pn-maly">Importy i zmiany zbiorcze – każdą można cofnąć. Kopie zmienianych plików leżą w treściach (content/_operacje, {odmiana(30, ['ostatnia', 'ostatnie', 'ostatnich'])} operacji) i trafiają do kopii zapasowej.</span>
            </header>
            {blad && <p className="pn-kom pn-bez-marginesu">{blad}</p>}
            {dane?.katalogi && (
                <div className="pn-ostrz" role="alert">
                    <div className="pn-kol">
                        <span>Serwer nie może pisać w {dane.katalogi.brak.map((k) => `content/${k}`).join(', ')} – importy, zmiany zbiorcze, historia wersji i kosz treści nie zadziałają. Jednorazowo na serwerze (zmienia prawa):</span>
                        <code className="pn-kod">{dane.katalogi.komenda}</code>
                    </div>
                </div>
            )}
            {kom && <p className="pn-info pn-bez-marginesu" role="status">{kom}</p>}
            {b && !b.martwa && <p className="pn-info pn-bez-marginesu" role="status">Trwa: {b.opis}. Zapis w Keystatic poczeka, aż się skończy.</p>}
            {b?.martwa && przerwane.length === 0 && (
                <div className="pn-ostrz" role="alert">
                    <div className="pn-kol">
                        <span>Została blokada po przerwanej operacji ({b.opis}), ale żaden plik nie został zmieniony. Zapis w Keystatic jest wstrzymany, dopóki jej nie zdejmiesz.</span>
                        <span className="pn-rzad"><button type="button" className="pn-btn" onClick={() => przerwana('odblokuj')}>zdejmij blokadę</button></span>
                    </div>
                </div>
            )}
            {przerwane.map((o) => (
                <div key={o.id} className="pn-ostrz" role="alert">
                    <div className="pn-kol">
                        <span><b>Przerwana operacja:</b> {o.opis} ({kiedy(o.utworzono)}). Część plików mogła się zapisać; zapis w Keystatic jest wstrzymany do decyzji.</span>
                        <span className="pn-rzad">
                            <button type="button" className="pn-btn" onClick={() => przerwana('dokoncz', o.id)}>dokończ</button>
                            <button type="button" className="pn-btn" onClick={() => przerwana('cofnij-przerwana', o.id)}>cofnij przerwaną</button>
                        </span>
                    </div>
                </div>
            ))}
            <section className="pn-karta" aria-labelledby="lista-op">
                <h2 id="lista-op">historia ({L.length})</h2>
                {!dane && !blad && <span className="pn-szary">wczytuję…</span>}
                {dane && L.length === 0 && <span className="pn-szary">Jeszcze nie było żadnej operacji. Pojawią się tu importy ksiąg i drzewa oraz zmiany zbiorcze z list.</span>}
                {L.length > 0 && <div className="pn-wiersze">
                    {L.map((o) => (
                        <div key={o.id} className="pn-wiersz pn-wiersz-op">
                            <span className="pn-kol pn-kol-wasko pn-rosnie">
                                <span><b>{o.nazwa}</b> <span className="pn-szary">· {kiedy(o.utworzono)}</span></span>
                                <span>{o.opis}</span>
                                <span className="pn-maly">{liczby(o) || odmiana(o.pliki, ['plik', 'pliki', 'plików'])}{o.problemy.length > 0 ? ` · ${o.problemy[0]}` : ''}</span>
                            </span>
                            <span className="pn-rzad pn-prawo">
                                <span className="pn-tag">{STAN[o.stan] ?? o.stan}</span>
                                {(o.stan === 'zapisane' || o.stan === 'dokonczone') && <button type="button" className="pn-btn pn-btn-maly" onClick={() => otworzCofnij(o.id)}>cofnij…</button>}
                            </span>
                        </div>
                    ))}
                </div>}
            </section>
            <Okno otwarte={!!podglad} tytul="cofnąć operację?" onZamknij={zamknij} stopka={podglad && <>
                <button type="button" className="pn-btn" onClick={zamknij}>anuluj</button>
                <button type="button" className="pn-btn pn-btn-gl" disabled={trwa || !podglad.mozna || (podglad.konflikty.length > 0 && !reszta)} onClick={cofnij}>{trwa ? 'cofam…' : `cofnij ${odmiana(podglad.pliki, ['plik', 'pliki', 'plików'])}`}</button>
            </>}>
                {podglad && <div className="pn-kol">
                    <span>{podglad.opis}</span>
                    {podglad.powod && <span className="pn-kom">{podglad.powod}</span>}
                    {podglad.mozna && <span>Wrócą wersje sprzed operacji: <b>{odmiana(podglad.pliki, ['plik', 'pliki', 'plików'])}</b>. Cofnięcie jest nową operacją – też da się je cofnąć.</span>}
                    {!podglad.mozna && !podglad.powod && <span className="pn-szary">Wszystkie pliki są już w stanie sprzed operacji albo zostały zmienione później.</span>}
                    {podglad.konflikty.length > 0 && <>
                        <span className="pn-ostrz">Po operacji zmieniono {odmiana(podglad.konflikty.length, ['plik', 'pliki', 'plików'])} – tych cofnięcie nie ruszy: {podglad.konflikty.slice(0, 6).join(', ')}{podglad.konflikty.length > 6 ? '…' : ''}</span>
                        <label className="pn-rzad"><input type="checkbox" checked={reszta} onChange={(e) => ustawReszta(e.target.checked)} /> cofnij pozostałe, zmienione zostaw</label>
                    </>}
                </div>}
            </Okno>
        </>
    )
}

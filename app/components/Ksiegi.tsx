// Inwentarz ksiąg metrykalnych: pasek lat (które roczniki zachowały się dla danego
// rodzaju ksiąg) i tabela z miejscem przechowania, sygnaturą i odnośnikami.
import * as React from 'react'
import type { Ksiega } from '@/lib/archiwum'
import { KartaPozycji, OdnosnikZewn as Odnosnik, PozycjaWKarcie, Wiersz } from './KartaPozycji'
import { RODZAJE_KSIAG, DOSTEP_KSIAG, KOLEJNOSC_KSIAG } from '@/lib/ksiegi'

const male = { fontSize: 'calc(13px * var(--font-scale, 1))' }

/** Zakres osi: od pełnej dekady przed najstarszą księgą do pełnej dekady po najmłodszej. */
export function zakresOsi(ks: Ksiega[]): [number, number] {
    const lata = ks.flatMap((k) => k.zakresy.flat())
    if (!lata.length) return [1800, 1950]
    return [Math.floor(Math.min(...lata) / 10) * 10, Math.ceil((Math.max(...lata) + 1) / 10) * 10]
}

/** Podziałka osi: przy krótkim zakresie co 5 lat, dłuższym co 10, długim co 25. */
const krokOsi = (dl: number) => (dl <= 40 ? 5 : dl <= 100 ? 10 : 25)

export function PasekLat({ ksiegi, os }: { ksiegi: Ksiega[]; os?: [number, number] }) {
    const [od, doRoku] = os ?? zakresOsi(ksiegi)
    const dl = doRoku - od
    const rodzaje = KOLEJNOSC_KSIAG.filter((r) => ksiegi.some((k) => k.rodzaje.includes(r) && k.zakresy.length))
    if (!rodzaje.length) return null
    const krok = krokOsi(dl)
    const kreski: number[] = []
    for (let r = Math.ceil(od / krok) * krok; r <= doRoku; r += krok) kreski.push(r)
    const proc = (r: number) => `${((r - od) / dl) * 100}%`
    // jedna siatka dla wszystkich wierszy – podpisy w kolumnie o szerokości najdłuższego, paski zawsze w jednej linii
    return (
        <div className="pasek-lat" role="img" aria-label={`zachowane roczniki ksiąg w latach ${od}–${doRoku}`}>
            {rodzaje.map((r) => (
                <React.Fragment key={r}>
                    <span className="pasek-lat-podpis">{RODZAJE_KSIAG[r]}</span>
                    <div className="pasek-lat-os">
                        {kreski.map((x) => <span key={x} className="pasek-lat-kreska" style={{ left: proc(x) }} />)}
                        {ksiegi
                            .filter((k) => k.rodzaje.includes(r))
                            .flatMap((k) => k.zakresy.map((z, i) => (
                                <span
                                    key={`${k.id}-${i}`}
                                    title={`${RODZAJE_KSIAG[r]}: ${z[0] === z[1] ? z[0] : `${z[0]}–${z[1]}`}`}
                                    className="pasek-lat-odcinek"
                                    style={{ left: proc(z[0]), width: `max(3px, calc(${((z[1] - z[0] + 1) / dl) * 100}% - 1px))`, opacity: k.dostep === 'zaginione' ? 0.25 : undefined }}
                                />
                            )))}
                    </div>
                </React.Fragment>
            ))}
            <span className="pasek-lat-podpis pasek-lat-objasnienie">zachowane roczniki</span>
            <div className="pasek-lat-lata">
                {kreski.map((x) => <span key={x} style={{ left: proc(x), transform: x === od ? 'none' : x === doRoku ? 'translateX(-100%)' : 'translateX(-50%)' }}>{x}</span>)}
            </div>
        </div>
    )
}

const ileTomow = (n: number) => `${n} ${n === 1 ? 'tom' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'tomy' : 'tomów'}`

/**
 * P7F-3: księgi w stylu kart osoby i obiektu (nagłówek: rodzaje aktów i lata; wiersze etykieta–wartość).
 * Bez powtórzeń: miejscowość / instytucja z kontekstu nie jest powtarzana w każdej księdze. Odnośniki z nazwą serwisu;
 * brak skanów – słownie, skąd je wziąć.
 * Warianty (v1.85): „karta” – samodzielna karta pozycji (katalog ksiąg, poza inną kartą); „wiersze” – księga jako blok
 * w części tabeli karty (karta miejscowości, karta instytucji). Zasada: karty nie zagnieżdżamy w karcie.
 */
export function TabelaKsiag({ ksiegi, nazwyMiejsc, nazwyParafii, kotwiceKsieg, kontekst, wariant = 'karta' }: {
    ksiegi: Ksiega[]
    /** id wsi → nazwa */ nazwyMiejsc?: Record<string, string>
    /** id instytucji → nazwa */ nazwyParafii?: Record<string, string>
    /** Dla powtórzonych ksiąg w grupach: identyfikator DOM tylko w jednej grupie. */ kotwiceKsieg?: ReadonlySet<string>
    /** miejscowość albo instytucja, w której kontekście pokazujemy księgi – nie powtarzamy jej w każdej karcie */
    kontekst?: { miejsce?: string; instytucja?: string }
    /** „wiersze” – wewnątrz tabeli karty (bez własnej ramki) */
    wariant?: 'karta' | 'wiersze'
}) {
    if (!ksiegi.length) return null
    return (
        <div className={wariant === 'wiersze' ? 'ksiegi-w-karcie' : 'karty-ksiag'}>
            {ksiegi.map((k) => {
                const miejsca = k.miejsca.filter((m) => m !== kontekst?.miejsce)
                const instytucje = k.instytucje.filter((i) => i !== kontekst?.instytucja)
                const rodzaje = k.rodzaje.map((r) => RODZAJE_KSIAG[r] ?? r).join(' · ')
                const id = !kotwiceKsieg || kotwiceKsieg.has(k.id) ? `ksiega-${k.id}` : undefined
                const pola: [string, React.ReactNode][] = [
                    ['luki i uwagi', k.braki],
                    ['język', k.jezyk],
                    ['przechowuje', k.gdzie || <span className="brak-danych">jeszcze nie opracowane</span>],
                    ['sygnatura', k.sygnatura],
                    ['skany', k.skany ? <Odnosnik href={k.skany}>{k.jednostki.length ? 'skany zespołu' : 'zobacz skany'}</Odnosnik>
                        : k.jednostki.some((j) => j.skany) ? 'przy poszczególnych tomach – niżej'
                        : <span className="ks-brak">{DOSTEP_KSIAG[k.dostep] ?? k.dostep}</span>],
                    ['indeks', k.indeks && <Odnosnik href={k.indeks}>indeks aktów</Odnosnik>],
                    ['miejscowości', miejsca.length > 0 && miejsca.map((m) => nazwyMiejsc?.[m] ?? m).join(', ')],
                    [instytucje.length > 1 ? 'instytucje' : 'instytucja', nazwyParafii && instytucje.length > 0 && instytucje.map((i) => nazwyParafii[i] ?? i).join(', ')],
                    ['tytuł w archiwum', k.nazwa],
                ]
                const tomy = k.jednostki.length > 0 && <Tomy k={k} />
                if (wariant === 'wiersze') return (
                    <PozycjaWKarcie key={k.id} id={id} etykieta={`${rodzaje}, ${k.lata}`} tytul={rodzaje || 'księga'} prawa={k.lata} pola={pola}>{tomy}</PozycjaWKarcie>
                )
                return (
                    <KartaPozycji key={k.id} id={id} etykieta={`${rodzaje}, ${k.lata}`} tytul={rodzaje || 'księga'} prawa={k.lata}>
                        {pola.map(([e, v]) => <Wiersz key={e} e={e}>{v}</Wiersz>)}
                        {tomy && <div className="ot-cala">{tomy}</div>}
                    </KartaPozycji>
                )
            })}
        </div>
    )
}

/** Tomy zespołu – rozwijane (wspólne dla obu wariantów). */
function Tomy({ k }: { k: Ksiega }) {
    return (
        <details className="ksiega-tomy" style={male}>
            <summary>{ileTomow(k.jednostki.length)}: roczniki, sygnatury, skany</summary>
            <ul>
                {k.jednostki.map((j, i) => (
                    <li key={i}>
                        <b>{j.lata}</b>
                        {j.sygnatura && <span className="text-[var(--tekst-etykieta)]"> · {j.sygnatura}</span>}
                        {j.skany && <> · <Odnosnik href={j.skany}>skany</Odnosnik></>}
                        {j.digitalizacja === 'brak' && <span className="text-[var(--tekst-etykieta)]"> · bez skanów online</span>}
                        {j.liczbaSkanow !== null && j.liczbaSkanow > 0 && <span className="text-[var(--tekst-etykieta)]"> · {j.liczbaSkanow} skanów</span>}
                        {j.tytul && j.tytul !== k.nazwa && <span className="block text-[var(--tekst-etykieta)]">{j.tytul}</span>}
                        {j.uwagi && <span className="block text-[var(--tekst-etykieta)]">{j.uwagi}</span>}
                    </li>
                ))}
            </ul>
        </details>
    )
}

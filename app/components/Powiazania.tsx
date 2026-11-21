import * as React from 'react'
import { Link } from 'next-view-transitions'
import type { Powiazania as DanePowiazan, ZrodloPowiazania } from '@/lib/archiwum'
import { odmiana } from '@/lib/tekst'
import { skrocFragment } from '@/lib/odnosniki'
import { Czesc, WCaly } from './Karta'
import { PozycjaWKarcie } from './KartaPozycji'

const RODZAJ: Record<string, string> = { wpis: 'wpis', miejsce: 'miejsce', temat: 'leksykon', obiekt: 'obiekt', material: 'materiał', osoba: 'biogram' }

export const TYTUL_ODNOSNIKOW = 'odnośniki w tekstach'
export const TYTUL_WZMIANEK = 'wspomniane bez odnośnika'

/** Tytuły części do spisu treści (puste pomijane – spisCzesci). */
export const czesciPowiazan = (d: DanePowiazan) => [d.odnosniki.length > 0 && TYTUL_ODNOSNIKOW, d.wzmianki.length > 0 && TYTUL_WZMIANEK]

function Pozycje({ zrodla, wyroznienie, prawa }: { zrodla: ZrodloPowiazania[]; wyroznienie: 'odnosnik' | 'wzmianka' | 'slowo'; prawa?: (z: ZrodloPowiazania) => string }) {
    return (
        <>
            {zrodla.map((z) => (
                <PozycjaWKarcie key={`${z.zrodlo.rodzaj}:${z.zrodlo.id}`} tytul={<Link href={z.zrodlo.adres} className={wyroznienie === 'slowo' ? 'odn' : undefined}>{z.zrodlo.nazwa}</Link>}
                    prawa={prawa ? prawa(z) : [RODZAJ[z.zrodlo.rodzaj] ?? z.zrodlo.rodzaj, z.ile > z.fragmenty.length && odmiana(z.ile, ['raz', 'razy', 'razy'])].filter(Boolean).join(' · ')} pola={[]}>
                    {/* strona hasła (plansza): jeden krótki fragment wokół słowa */}
                    {(wyroznienie === 'slowo' ? z.fragmenty.slice(0, 1).map((f) => skrocFragment(f)) : z.fragmenty).map((f, i) => (
                        <p key={i} className="kb-fragment">{f.przed}<mark className={`powiazanie-${wyroznienie}`}>{f.trafienie}</mark>{f.po}</p>
                    ))}
                </PozycjaWKarcie>
            ))}
        </>
    )
}

/**
 * Sieć powiązań (jak w Logseq) jako CZĘŚCI TABELI KARTY (makieta wpisu 17.11, P3): teksty z odnośnikiem [[…]] do tej pozycji
 * i – zwinięte – teksty, w których jej nazwa pada bez odnośnika. Pozycje to bloki `pozycja-w-karcie` (bez ramek – zasada 2a).
 * Wstawiać wewnątrz <Tabela>, przed „jak cytować”.
 */
export default function Powiazania({ dane }: { dane: DanePowiazan }) {
    if (!dane.odnosniki.length && !dane.wzmianki.length) return null
    return (
        <>
            {dane.odnosniki.length > 0 && (
                <>
                    <Czesc tytul={TYTUL_ODNOSNIKOW}>{dane.odnosniki.length}</Czesc>
                    <WCaly><Pozycje zrodla={dane.odnosniki} wyroznienie="odnosnik" /></WCaly>
                </>
            )}
            {dane.wzmianki.length > 0 && (
                <>
                    <Czesc tytul={TYTUL_WZMIANEK}>{dane.wzmianki.length}</Czesc>
                    <WCaly>
                        <details className="kb-wzmianki">
                            <summary>pokaż {odmiana(dane.wzmianki.length, ['tekst', 'teksty', 'tekstów'])}</summary>
                            <div className="rozwin-tresc">
                                <p className="ot-drobne">teksty, w których pada ta nazwa albo jej forma, ale bez odnośnika [[…]] i bez powiązania w panelu.</p>
                                <Pozycje zrodla={dane.wzmianki} wyroznienie="wzmianka" />
                            </div>
                        </details>
                    </WCaly>
                </>
            )}
        </>
    )
}

export const TYTUL_WYSTEPUJE = 'występuje w'

/** SLW-02/03 (P3): strona hasła – „występuje w”: teksty z odnośnikiem [[hasło]] i teksty, w których słowo pada (oba rodzaje razem –
 *  dla słownika każde użycie słowa jest istotne), każdy z fragmentem. Część tabeli karty, przed „jak cytować”. */
/** Łatka P3 (plansza „strona hasła”): po prawej rodzaj i rok (`prawa`), słowo we fragmencie pogrubione, bez tła (`slowo`). */
export function WystepujeW({ dane, prawa }: { dane: DanePowiazan; prawa?: (z: ZrodloPowiazania) => string }) {
    const zrodla = [...dane.odnosniki, ...dane.wzmianki.filter((w) => !dane.odnosniki.some((o) => o.zrodlo.rodzaj === w.zrodlo.rodzaj && o.zrodlo.id === w.zrodlo.id))]
    if (!zrodla.length) return null
    return (
        <>
            <Czesc tytul={TYTUL_WYSTEPUJE}>{odmiana(zrodla.length, ['tekst', 'teksty', 'tekstów'])}</Czesc>
            <WCaly><Pozycje zrodla={zrodla} wyroznienie="slowo" prawa={prawa} /></WCaly>
        </>
    )
}

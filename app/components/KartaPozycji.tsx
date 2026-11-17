import * as React from 'react'

/**
 * P7F-3: wspólna karta pozycji (księga metrykalna, publikacja, inne spisy) w stylu kart osoby i obiektu:
 * nagłówek części (tytuł + informacja po prawej) i wiersze etykieta–wartość. Bez zależności serwerowych –
 * działa także w komponentach klienckich (katalog ksiąg na żywo).
 */
export function KartaPozycji({ tytul, prawa, id, etykieta, poziom = 3, children }: { tytul: React.ReactNode; prawa?: React.ReactNode; id?: string; etykieta?: string; /** poziom nagłówka tytułu (h2–h4): pod h1 strony bez pominięcia poziomu (axe heading-order) */ poziom?: 2 | 3 | 4; children?: React.ReactNode }) {
    const H = `h${poziom}` as 'h2' | 'h3' | 'h4'
    return (
        <section id={id} className="osoba-tabela karta-tabela karta-pozycji scroll-mt-6" aria-label={etykieta}>
            <div className="ot-nagl">
                <H>{tytul}</H>
                {prawa && <span className="ot-nagl-prawa kp-prawa">{prawa}</span>}
            </div>
            {children}
        </section>
    )
}

/**
 * Pozycja w karcie (wzorzec „pozycja w karcie”, rejestr szablonów): nagłówek (tytuł + informacja po prawej) i wiersze
 * etykieta–wartość jako blok w części tabeli karty, bez własnej ramki – karty nie zagnieżdżamy w karcie (zasada 5.2a).
 * Wariant z miniaturą (PH-23): obraz 160×120 przy prawej krawędzi tabeli. Puste wiersze się nie pokazują.
 */
export function PozycjaWKarcie({ tytul, prawa, pola, miniatura, id, etykieta, children }: {
    tytul: React.ReactNode; prawa?: React.ReactNode; pola: [string, React.ReactNode][]; miniatura?: React.ReactNode; id?: string; etykieta?: string; children?: React.ReactNode
}) {
    // bez pól (np. odnośniki w tekstach) – bez pustej listy
    const widoczne = pola.filter(([, v]) => v !== null && v !== undefined && v !== false && v !== '')
    const tresc = (
        <>
            <div className="kb-nagl"><h3>{tytul}</h3>{prawa && <span className="kb-lata">{prawa}</span>}</div>
            {widoczne.length > 0 && <dl className="kb-pola">
                {widoczne.map(([e, v]) => (
                    <div key={e} className="kb-w"><dt>{e}</dt><dd>{v}</dd></div>
                ))}
            </dl>}
            {children}
        </>
    )
    return (
        <section id={id} className={`pozycja-w-karcie scroll-mt-6${miniatura ? ' kb-z-miniatura' : ''}`} aria-label={etykieta}>
            {miniatura ? <><div className="kb-tresc">{tresc}</div><div className="kb-miniatura">{miniatura}</div></> : tresc}
        </section>
    )
}

/** Wiersz karty; pusty – pomijany. */
export function Wiersz({ e, children }: { e: string; children: React.ReactNode }) {
    if (children === null || children === undefined || children === false || children === '') return null
    return <dl className="ot-w"><dt className="ot-e">{e}</dt><dd className="ot-t">{children}</dd></dl>
}

/** Krótka nazwa serwisu zamiast surowego adresu. */
export function serwis(href: string): string {
    try {
        const h = new URL(href).hostname.replace(/^www\./, '')
        if (h.includes('szukajwarchiwach')) return 'szukajwarchiwach'
        if (h.includes('geneteka')) return 'Geneteka'
        if (h.includes('metryki')) return 'metryki.genealodzy.pl'
        if (h.includes('familysearch')) return 'FamilySearch'
        if (h.includes('polona')) return 'Polona'
        if (h.includes('sbc.org') || h.includes('dlibra')) return 'biblioteka cyfrowa'
        return h
    } catch { return 'odnośnik' }
}

/** Odnośnik zewnętrzny z nazwą serwisu. */
export function OdnosnikZewn({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className="odn">{children} <span className="ks-serwis">({serwis(href)})</span> ↗</a>
}

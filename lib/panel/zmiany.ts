// P7c łatka (uwaga właściciela 20.11 09:31, ankieta A): „ostatnie zmiany” na pulpicie bez plików technicznych.
// Dawniej lista brała każdy plik z content/ – kopie wersji (_historia, z plikami .kto), stan „wróć do pracy”
// (_panel/praca-*) i pamięć podręczna panelu wypełniały ją surowymi ścieżkami (na zrzucie 7 z 10 wierszy).

export type OpisTechniczny = { pomin: true } | { pomin?: false; opis: string; href: string; klucz: string }

/** Ustawienia w content/_panel, które właściciel zmienia sam – z nazwą i miejscem w panelu. Reszta _panel to stan pracy panelu.
 *  konta.json pomijany: zapisuje się przy każdym logowaniu („ostatnio”, app/api/konto/powrot/route.ts) – zmiany kont widać w „konta i dostęp”. */
const USTAWIENIA: Record<string, { opis: string; href: string }> = {
    'przekierowania': { opis: 'przekierowania adresów', href: '/keystatic/singleton/przekierowania' },
    'kregi-stopka': { opis: 'kręgi i stopka', href: '/keystatic/singleton/kregiStopka' },
    'wstepy-dzialow': { opis: 'wstępy działów', href: '/keystatic/singleton/wstepyDzialow' },
    'strona-glowna': { opis: 'strona główna (ustawienia)', href: '/keystatic/singleton/stronaGlowna' },
    'menu-panelu': { opis: 'menu panelu', href: '/keystatic/singleton/menuPanelu' },
    'kopia': { opis: 'kopia na komputer', href: '/keystatic/panel/system' },
}

/**
 * Pliki zaczynające się od „_” na najwyższym poziomie content/ (_historia, _panel, _teren, _kosz…):
 * znane ustawienie → nazwa i odnośnik; skrzynka „z terenu” → jeden wiersz; wszystko inne → pomijane.
 * null – zwykła treść, opisuje ją dalsza część pulpitu.
 */
export function opisTechniczny(rel: readonly string[]): OpisTechniczny | null {
    const g = rel[0] ?? ''
    if (!g.startsWith('_')) return null
    if (g === '_teren') return { opis: 'skrzynka „z terenu”', href: '/keystatic/panel/teren', klucz: '_teren' }
    if (g === '_panel' && rel.length === 2) {
        const u = USTAWIENIA[rel[1].replace(/\.(json|yaml|yml)$/, '')]
        if (u) return { ...u, klucz: `_panel/${rel[1]}` }
    }
    return { pomin: true }
}

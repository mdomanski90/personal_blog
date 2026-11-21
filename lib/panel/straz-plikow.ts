// Łatka 21.11 (bezpiecznik plików): zapis Keystatic nie może usunąć pliku materiału ani zdjęcia obiektu „przy okazji”.
// Lekcja 21.11: gdy Keystatic nie widzi pliku (np. ukrytego regułą .gitignore), pokazuje pole „Plik” jako puste, a przy
// zapisie wylicza ścieżkę starego pliku z wartości pola i wysyła jego usunięcie – tak zginął skan mandatu (wrócił z kosza).
// Usunięcie pliku z katalogu plików przepuszczamy tylko, gdy w tym samym zapisie wgrywany jest plik tej samej pozycji
// (wymiana) albo usuwana jest cała pozycja. Każde inne – zapis odrzucony w całości, nic się nie zmienia.

import { KATALOG_PLIKOW } from '../pliki'

export interface ZmianyZapisu { additions: { path: string }[]; deletions: { path: string }[] }

/** Katalog pozycji w katalogu plików: `pliki-archiwum/<materiał>/` albo `pliki-archiwum/obiekty/<obiekt>/`; null – poza nim. */
function katalogPozycji(sciezka: string, katalog: string): { slug: string; kat: string } | null {
    const pref = `${katalog.replace(/\/+$/, '')}/`
    if (!sciezka.startsWith(pref)) return null
    const cz = sciezka.slice(pref.length).split('/')
    const ile = cz[0] === 'obiekty' ? 2 : 1
    if (cz.length <= ile || !cz[ile - 1]) return null
    return { slug: cz[ile - 1], kat: pref + cz.slice(0, ile).join('/') + '/' }
}

/** Slug pozycji z pliku treści: content/materialy/<slug>.mdoc, content/obiekty/<slug>/index.yaml itp. */
function slugTresci(sciezka: string): string | null {
    if (!sciezka.startsWith('content/')) return null
    const cz = sciezka.split('/')
    let n = cz.pop() ?? ''
    if (/^index\.(mdoc|md|yaml|yml|json)$/.test(n)) n = cz.pop() ?? ''
    return n.replace(/\.(mdoc|md|yaml|yml|json)$/, '') || null
}

/** Pliki, które zapis usunąłby bez wgrania następcy i bez usuwania pozycji – powód do odrzucenia zapisu. */
export function usuwanePlikiBezZastepstwa(z: ZmianyZapisu, katalog: string = KATALOG_PLIKOW): string[] {
    const usuwanePozycje = new Set(z.deletions.map((d) => slugTresci(d.path)).filter((s): s is string => !!s))
    return z.deletions.map((d) => d.path).filter((p) => {
        const poz = katalogPozycji(p, katalog)
        if (!poz) return false
        if (z.additions.some((a) => a.path.startsWith(poz.kat))) return false
        return !usuwanePozycje.has(poz.slug)
    })
}

export function komunikatUsuwanychPlikow(pliki: string[]): string {
    const lista = pliki.slice(0, 3).map((p) => `„${p}”`).join(', ') + (pliki.length > 3 ? ` i ${pliki.length - 3} inne` : '')
    return `Zapis wstrzymany – Keystatic usunąłby plik ${lista}, choć nie wgrano nowego. Nic nie zmieniono. `
        + 'Odśwież stronę edycji (plik powinien się pokazać w polu) i zapisz jeszcze raz. '
        + 'Żeby usunąć sam plik, wgraj w jego miejsce inny albo usuń całą pozycję.'
}

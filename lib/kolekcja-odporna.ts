// SLW-04 (P3) + P5: odporne czytanie kolekcji Keystatic. `reader.collections.X.all()` rzuca, gdy choć jeden wpis jest niepoprawny
// (np. slug z polskimi znakami, nieznana wartość pola) – strona czytająca kolekcję dawała wtedy 500 (a dawny `.catch(() => [])`
// po cichu opróżniał całą kolekcję). Tu: lista slugów, każdy wpis czytany osobno; błędne pomijane i zwracane do panelu jakości
// (lib/panel/jakosc.ts, reguła „wpis-nieczytelny”). P5: wszystkie kolekcje strony (lib/archiwum.ts, lib/paczka5.ts).

export type BladWpisu = { slug: string; blad: string }

type Czytnik<T> = { list: () => Promise<string[]>; read: (slug: string, opcje?: { resolveLinkedFiles?: boolean }) => Promise<T | null> }

export async function wczytajOdpornie<T>(kolekcja: Czytnik<T>, opcje?: { resolveLinkedFiles?: boolean }): Promise<{ wpisy: { slug: string; entry: T }[]; bledy: BladWpisu[] }> {
    const wpisy: { slug: string; entry: T }[] = []
    const bledy: BladWpisu[] = []
    let slugi: string[]
    try { slugi = await kolekcja.list() } catch (e) { return { wpisy, bledy: [{ slug: '*', blad: String(e).slice(0, 300) }] } }
    const wyniki = await Promise.allSettled(slugi.map((slug) => (opcje ? kolekcja.read(slug, opcje) : kolekcja.read(slug))))
    wyniki.forEach((w, i) => {
        if (w.status === 'fulfilled') { if (w.value) wpisy.push({ slug: slugi[i], entry: w.value }) }
        else bledy.push({ slug: slugi[i], blad: String(w.reason).replace(/\s+/g, ' ').slice(0, 300) })
    })
    return { wpisy, bledy }
}

type Kolekcja = { list: () => Promise<string[]>; read: (slug: string, opcje?: { resolveLinkedFiles?: boolean }) => Promise<unknown> }

/**
 * P5: czytnik Keystatic, którego `collections.X.all(opcje)` nie wyłącza strony przy jednym złym wpisie – czyta wpisy
 * po kolei (wczytajOdpornie), błędne pomija z ostrzeżeniem w dzienniku serwera. Typy i reszta czytnika bez zmian,
 * więc miejsca wywołań (`reader.collections.miejsca.all({ resolveLinkedFiles: true })`) zostają jak były.
 * Panel jakości liczy te same błędy sam i pokazuje je jako „wpis-nieczytelny”.
 */
export function odpornyCzytnik<R extends { collections: object }>(r: R): R {
    const kolekcje = r.collections as Record<string, Kolekcja & Record<string, unknown>>
    const nowe: Record<string, unknown> = {}
    for (const [nazwa, k] of Object.entries(kolekcje)) {
        nowe[nazwa] = new Proxy(k, {
            get(cel, klucz, odb) {
                if (klucz !== 'all') return Reflect.get(cel, klucz, odb)
                return async (opcje?: { resolveLinkedFiles?: boolean }) => {
                    const { wpisy, bledy } = await wczytajOdpornie(cel as unknown as Czytnik<unknown>, opcje)
                    for (const b of bledy) console.warn(`kolekcja ${nazwa}: pominięto wpis „${b.slug}” – ${b.blad}`)
                    return wpisy
                }
            },
        })
    }
    return new Proxy(r, { get: (cel, klucz, odb) => (klucz === 'collections' ? nowe : Reflect.get(cel, klucz, odb)) })
}

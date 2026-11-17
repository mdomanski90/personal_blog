// SLW-04 (P3): odporne czytanie kolekcji Keystatic. `reader.collections.X.all()` rzuca, gdy choć jeden wpis jest niepoprawny
// (np. slug z polskimi znakami, nieznana wartość pola) – dawny `.catch(() => [])` po cichu opróżniał wtedy całą kolekcję.
// Tu: lista slugów, każdy wpis czytany osobno; błędne pomijane i zwracane do panelu jakości (lib/panel/jakosc.ts).

export type BladWpisu = { slug: string; blad: string }

export async function wczytajOdpornie<T>(kolekcja: { list: () => Promise<string[]>; read: (slug: string) => Promise<T | null> }): Promise<{ wpisy: { slug: string; entry: T }[]; bledy: BladWpisu[] }> {
    const wpisy: { slug: string; entry: T }[] = []
    const bledy: BladWpisu[] = []
    let slugi: string[]
    try { slugi = await kolekcja.list() } catch (e) { return { wpisy, bledy: [{ slug: '*', blad: String(e).slice(0, 300) }] } }
    for (const slug of slugi) {
        try {
            const entry = await kolekcja.read(slug)
            if (entry) wpisy.push({ slug, entry })
        } catch (e) {
            bledy.push({ slug, blad: String(e).replace(/\s+/g, ' ').slice(0, 300) })
        }
    }
    return { wpisy, bledy }
}

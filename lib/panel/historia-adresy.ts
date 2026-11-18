// P6a: adres edycji w Keystatic ↔ plik treści (dla historii wersji i opisów w koszu).
// Rozszerzenie wg konfiguracji: format.contentField → .mdoc, format.data 'json' → .json, inaczej .yaml (zachowanie Keystatic).
import path from 'node:path'
import config from '../../keystatic.config'

type Konf = { label?: string; path?: string; format?: { contentField?: string; data?: string } }
const rozszerzenie = (k: Konf) => (k.format?.contentField ? 'mdoc' : k.format?.data === 'json' ? 'json' : 'yaml')
const kolekcje = (config.collections ?? {}) as Record<string, Konf>
const singletony = (config.singletons ?? {}) as Record<string, Konf>
const SLUG = /^[a-z0-9][a-z0-9_-]{0,130}$/

/** Ścieżka pliku (względem content/) dla adresu /keystatic/collection/<k>/item/<slug> albo /keystatic/singleton/<k>; inne – null. */
export function plikDlaAdresu(adres: string): string | null {
    const sc = adres.split('?')[0].replace(/\/+$/, '')
    let m = /^\/keystatic\/collection\/([\w-]+)\/item\/([^/]+)$/.exec(sc)
    if (m) {
        const k = kolekcje[m[1]], slug = decodeURIComponent(m[2])
        if (!k?.path || !SLUG.test(slug) || !k.path.startsWith('content/') || !k.path.endsWith('/*')) return null
        return `${k.path.slice('content/'.length, -2)}/${slug}.${rozszerzenie(k)}`
    }
    m = /^\/keystatic\/singleton\/([\w-]+)$/.exec(sc)
    if (m) {
        const k = singletony[m[1]]
        if (!k?.path || !k.path.startsWith('content/')) return null
        return `${k.path.slice('content/'.length)}.${rozszerzenie(k)}`
    }
    return null
}

/** Plik (względem content/) → nazwa po ludzku i adres edycji w Keystatic (gdy to wpis kolekcji albo ustawienie). */
export function opisPliku(relC: string): { nazwa: string; edycja: string | null } {
    for (const [klucz, k] of Object.entries(kolekcje)) {
        if (!k.path?.endsWith('/*')) continue
        const kat = k.path.slice('content/'.length, -2) + '/'
        if (relC.startsWith(kat) && !relC.slice(kat.length).includes('/')) {
            const slug = relC.slice(kat.length).replace(/\.(mdoc|yaml|yml|json)$/, '')
            return { nazwa: `${(k.label ?? klucz).toLocaleLowerCase('pl')} „${slug}”`, edycja: `/keystatic/collection/${klucz}/item/${encodeURIComponent(slug)}` }
        }
    }
    for (const [klucz, k] of Object.entries(singletony)) {
        if (k.path && relC.replace(/\.(mdoc|yaml|yml|json)$/, '') === k.path.slice('content/'.length)) return { nazwa: `ustawienie „${k.label ?? klucz}”`, edycja: `/keystatic/singleton/${klucz}` }
    }
    return { nazwa: relC, edycja: null }
}

/** Plik (względem content/) → kolekcja i slug albo ustawienie (singleton) – do kontroli czytnikiem Keystatic. */
export function wpisDlaPliku(relC: string): { kolekcja: string; slug: string } | { singleton: string } | null {
    for (const [klucz, k] of Object.entries(kolekcje)) {
        if (!k.path?.endsWith('/*')) continue
        const kat = k.path.slice('content/'.length, -2) + '/'
        if (relC.startsWith(kat) && !relC.slice(kat.length).includes('/')) return { kolekcja: klucz, slug: relC.slice(kat.length).replace(/\.(mdoc|yaml|yml|json)$/, '') }
    }
    for (const [klucz, k] of Object.entries(singletony)) if (k.path && relC.replace(/\.(mdoc|yaml|yml|json)$/, '') === k.path.slice('content/'.length)) return { singleton: klucz }
    return null
}

/** Kontrola po przywróceniu: wpis musi się wczytać czytnikiem Keystatic (jak strona) – inaczej operacja cofa całość. */
export function kontrolaCzytnikiem(korzen: string, pliki: string[]): () => Promise<void> {
    return async () => {
        const { createReader } = await import('@keystatic/core/reader')
        const r = createReader(korzen, config) as unknown as {
            collections: Record<string, { read: (s: string) => Promise<unknown> }>; singletons: Record<string, { read: () => Promise<unknown> }>
        }
        for (const p of pliki) {
            const w = wpisDlaPliku(p)
            if (!w) continue
            try {
                const d = 'singleton' in w ? await r.singletons[w.singleton].read() : await r.collections[w.kolekcja].read(w.slug)
                if (!d) throw new Error('brak wpisu')
            } catch (e) { throw new Error(`Po przywróceniu „${p}” byłby nieczytelny dla strony (${String(e instanceof Error ? e.message : e).slice(0, 160)}) – nic nie zmieniono.`) }
        }
    }
}

const POJEDYNCZE: Record<string, string> = { posts: 'wpis', miejsca: 'miejsce', tematy: 'temat', obiekty: 'obiekt', materialy: 'materiał', zbiory: 'zbiór', publikacje: 'publikacja', parafie: 'instytucja', hasla: 'hasło', biogramy: 'biogram', zespoly: 'zespół', ksiegi: 'księga' }

/** Jak opisPliku, ale z tytułem z treści pliku (pole title: tekst albo { name }) – „miejsce „Testowo”” zamiast identyfikatora. */
export async function opisPlikuZTytulem(korzen: string, relC: string): Promise<{ nazwa: string; edycja: string | null }> {
    const o = opisPliku(relC), w = wpisDlaPliku(relC)
    if (!w || 'singleton' in w) return o
    try {
        const { readFile } = await import('node:fs/promises')
        const { load } = await import('js-yaml')
        const t = await readFile(path.join(/*turbopackIgnore: true*/ korzen, "content", ...relC.split("/")), "utf8")
        const naglowek = relC.endsWith('.json') ? null : relC.endsWith('.mdoc') || relC.endsWith('.md') ? (/^---\r?\n([\s\S]*?)\r?\n---/.exec(t)?.[1] ?? '') : t
        const d = (naglowek === null ? JSON.parse(t) : load(naglowek)) as Record<string, unknown> | null
        const tytul = typeof d?.title === 'string' ? d.title : d?.title && typeof d.title === 'object' && typeof (d.title as { name?: unknown }).name === 'string' ? (d.title as { name: string }).name : ''
        if (tytul.trim()) return { ...o, nazwa: `${POJEDYNCZE[w.kolekcja] ?? w.kolekcja} „${tytul.trim().slice(0, 120)}”` }
    } catch { /* plik nieczytelny – nazwa z identyfikatora */ }
    return o
}

// P7c łatka (uwaga właściciela 20.11 09:31, ankieta A): porządek uwag tomów ksiąg.
// W polu „Uwagi” tomu zdarzają się wiersze „Tytuł jednostki: …”, „Liczba skanów: …”, „Status linku: …”, „Źródło: …”
// (dawne importy; „Status linku” i „Źródło” dopisywał też import ksiąg – lib/panel/import-ksiegi.ts). Na karcie szły jednym ciągiem.
// Porządek: tytuł i liczba skanów do swoich pól (tylko gdy puste albo równe), „Status linku” i obce „Źródło” do notatki
// roboczej księgi (widocznej tylko w panelu), adres równy skanom/stronie zespołu – usuwany jako powtórzenie. Sprzeczność zostaje w uwagach.

export interface TomSurowy {
    years?: unknown; identifier?: unknown; title?: unknown; scans?: unknown; scanCount?: unknown; digitization?: unknown; gaps?: unknown
    [k: string]: unknown
}

const ETYKIETY = ['Tytuł jednostki', 'Liczba skanów', 'Status linku', 'Źródło'] as const
type Etykieta = typeof ETYKIETY[number]
const PODZIAL = new RegExp(`\\s*(?=(?:${ETYKIETY.join('|')}):)`, 'u')
const WIERSZ = new RegExp(`^(${ETYKIETY.join('|')}):\\s*(.*)$`, 'su')

/** Czy uwagi tomu zawierają któryś z wierszy do uporządkowania. */
export function maWierszeDoPorzadku(gaps: unknown): boolean {
    return typeof gaps === 'string' && gaps.split(/\r?\n/).some((l) => l.split(PODZIAL).some((c) => WIERSZ.test(c.trim())))
}

export interface WynikTomu { tom: TomSurowy; zmieniony: boolean; doNotatki: { status: string[]; zrodla: string[] }; sprzecznosci: string[] }

/**
 * Porządkuje jeden tom. `znaneAdresy` – adresy już zapisane w księdze (skany, strona zespołu w notatce);
 * „Źródło:” równe któremuś z nich jest powtórzeniem i znika.
 */
export function uporzadkujTom(t: TomSurowy, znaneAdresy: ReadonlySet<string>): WynikTomu {
    const wynik: WynikTomu = { tom: { ...t }, zmieniony: false, doNotatki: { status: [], zrodla: [] }, sprzecznosci: [] }
    if (!maWierszeDoPorzadku(t.gaps)) return wynik
    const zostaje: string[] = []
    const syg = String(t.identifier || t.years || '').trim()
    for (const linia of String(t.gaps).split(/\r?\n/)) {
        const reszta: string[] = []
        for (const kawalek of linia.split(PODZIAL)) {
            const c = kawalek.trim()
            const m = c.match(WIERSZ)
            if (!m) { if (c) reszta.push(c); continue }
            const etykieta = m[1] as Etykieta, w = m[2].trim()
            if (!w) continue
            if (etykieta === 'Tytuł jednostki') {
                const obecny = typeof t.title === 'string' ? t.title.trim() : ''
                if (!obecny) wynik.tom.title = w
                else if (obecny !== w) { reszta.push(c); wynik.sprzecznosci.push(`${syg}: tytuł w uwagach różni się od pola „Oryginalny tytuł jednostki”`) }
            } else if (etykieta === 'Liczba skanów') {
                const n = /^\d{1,6}$/.test(w) ? Number(w) : NaN
                const obecna = typeof t.scanCount === 'number' ? t.scanCount : null
                const skany = typeof t.scans === 'string' && t.scans.trim() !== ''
                if (Number.isNaN(n) || (n === 0 && skany)) { reszta.push(c); wynik.sprzecznosci.push(`${syg}: liczba skanów „${w}” nie pasuje do danych tomu`) }
                else if (obecna === null) {
                    wynik.tom.scanCount = n
                    const dig = typeof t.digitization === 'string' ? t.digitization : ''
                    if (!dig || dig === 'nieustalone') wynik.tom.digitization = n > 0 ? 'online' : 'brak'
                } else if (obecna !== n) { reszta.push(c); wynik.sprzecznosci.push(`${syg}: liczba skanów w uwagach (${n}) różni się od pola (${obecna})`) }
            } else if (etykieta === 'Status linku') {
                wynik.doNotatki.status.push(w)
            } else if (!znaneAdresy.has(w) && !(typeof t.scans === 'string' && t.scans.trim() === w)) {
                wynik.doNotatki.zrodla.push(w)
            }
        }
        if (reszta.length) zostaje.push(reszta.join(' '))
    }
    const gaps = zostaje.join('\n')
    if (gaps) wynik.tom.gaps = gaps
    else delete wynik.tom.gaps
    wynik.zmieniony = true
    return wynik
}

/** Wiersze notatki roboczej księgi z przeniesionych statusów i źródeł (bez powtórzeń). */
export function wierszeNotatki(status: string[], zrodla: string[]): string[] {
    const L: string[] = []
    const s = [...new Set(status)], z = [...new Set(zrodla)]
    if (s.length) L.push(`status linku tomów (z uwag tomów): ${s.join(' | ')}`)
    if (z.length) L.push(`źródło tomów (z uwag tomów): ${z.join(' | ')}`)
    return L
}

/** Adresy http(s) zapisane już w księdze: skany zespołu i adresy z notatki roboczej (np. „strona zespołu: …”). */
export function adresyKsiegi(k: { scans?: unknown; note?: unknown }): Set<string> {
    const A = new Set<string>()
    if (typeof k.scans === 'string' && k.scans.trim()) A.add(k.scans.trim())
    if (typeof k.note === 'string') for (const m of k.note.matchAll(/https?:\/\/\S+/g)) A.add(m[0])
    return A
}

/** Porządek całej księgi: tomy + notatka robocza. null – nic do zmiany. */
export function uporzadkujKsiege(k: Record<string, unknown>): { ksiega: Record<string, unknown>; tomow: number; przeniesione: { tytul: number; skany: number; status: number; zrodla: number }; sprzecznosci: string[] } | null {
    const tomy = Array.isArray(k.volumes) ? k.volumes as TomSurowy[] : []
    if (!tomy.some((t) => maWierszeDoPorzadku(t?.gaps))) return null
    const znane = adresyKsiegi(k)
    const status: string[] = [], zrodla: string[] = [], sprzecznosci: string[] = []
    const p = { tytul: 0, skany: 0, status: 0, zrodla: 0 }
    let tomow = 0
    const nowe = tomy.map((t) => {
        const w = uporzadkujTom(t, znane)
        if (!w.zmieniony) return t
        tomow++
        if (w.tom.title !== t.title) p.tytul++
        if (w.tom.scanCount !== t.scanCount) p.skany++
        p.status += w.doNotatki.status.length; p.zrodla += w.doNotatki.zrodla.length
        status.push(...w.doNotatki.status); zrodla.push(...w.doNotatki.zrodla); sprzecznosci.push(...w.sprzecznosci)
        return w.tom
    })
    const dopisek = wierszeNotatki(status, zrodla)
    const notatka = typeof k.note === 'string' ? k.note : ''
    const ksiega: Record<string, unknown> = { ...k, volumes: nowe }
    if (dopisek.length) ksiega.note = [notatka, dopisek.join('\n')].filter(Boolean).join('\n\n')
    return { ksiega, tomow, przeniesione: p, sprzecznosci }
}

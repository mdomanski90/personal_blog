// Import Keystatic: zbiorcza księga i tomy. Dane archiwum pozostają w content/ksiegi.
// Bez publikacji nowych ksiąg, bez usuwania tomów i bez zamiany wypełnionych pól na puste.
import fs from 'node:fs/promises'
import path from 'node:path'
import readExcelFile from 'read-excel-file/node'
import * as yaml from 'js-yaml'
import { RODZAJE_KSIAG, DOSTEP_KSIAG, WYZNANIA_PARAFII, zakresyLat, scalZakresy, zakresyTekst } from '@/lib/ksiegi'
import { wykonajPartie, type ZmianaImportu } from './zapis-importu'
import { parafie, zespolyArchiwalne } from '@/lib/archiwum'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ROOT = () => path.join(process.cwd(), 'content', 'ksiegi')
const BACKUP = () => process.env.ODNIEPAMIECI_IMPORT_BACKUP_DIR || '/var/lib/odniepamieci/import-ksiegi-backup'
const MAX_FILE = 5 * 1024 * 1024
const MAX_KSIEGI = 500, MAX_TOMY = 8000

type Wiersz = Record<string, string>
type Tom = {
    years: string; identifier: string; scans: string | null; gaps: string
    title: string; scanCount: number | null; digitization: 'online' | 'brak' | 'nieustalone'
}
type Ksiega = {
    title: string; parish: string | null; fonds: string | null; relatedParishes: string[]; relatedReligions: string[]
    types: string[]; spatial: string[]; years: string
    gaps: string; language: string; repository: string; identifier: string
    volumes: Tom[]; access: string; scans: string | null; index: string | null
    visibility: string; note: string
}
type Rekord = { id: string; ksiega: Ksiega; parafiaNazwa: string; liczbaTomow: number; zrodloZespolu: string | null }
type Zestaw = { rekordy: Rekord[]; uwagi: string[] }

function tekst(v: unknown): string {
    if (v == null) return ''
    if (typeof v === 'string') return v.trim()
    if (typeof v === 'number') return String(v)
    if (v instanceof Date) return String(v.getFullYear())
    if (typeof v === 'object') {
        const o = v as { text?: string; result?: unknown; richText?: { text: string }[] }
        if (o.text) return o.text.trim()
        if (o.richText) return o.richText.map((r) => r.text).join('').trim()
        if (o.result != null) return tekst(o.result)
    }
    return ''
}
function normalizuj(w: Wiersz) {
    const out: Wiersz = {}
    for (const [k, v] of Object.entries(w)) out[k.trim().replace(/^\ufeff/, '').toLowerCase()] = v.trim()
    return out
}
function tablicaDoWierszy(tabela: string[][], nazwa: string): Wiersz[] {
    const nonempty = tabela.filter((r) => r.some((c) => c.trim()))
    if (!nonempty.length) return []
    const naglowki = nonempty[0].map((k) => k.trim().replace(/^\ufeff/, '').toLowerCase())
    if (!naglowki.includes('ksiega_id')) throw new Error(`${nazwa}: brak kolumny „ksiega_id”. Użyj arkusza w ustalonym formacie.`)
    return nonempty.slice(1).map((r) => normalizuj(Object.fromEntries(naglowki.map((k, i) => [k, r[i] ?? '']))))
}
function csvTekst(s: string): string[][] {
    const pierwszy = s.replace(/^\ufeff/, '').split(/\r?\n/, 1)[0] ?? ''
    const sep = (pierwszy.match(/;/g) ?? []).length >= (pierwszy.match(/,/g) ?? []).length ? ';' : ','
    const wiersze: string[][] = []
    let r: string[] = [], pole = '', cudzyslow = false
    for (let i = 0; i < s.length; i++) {
        const c = s[i]
        if (c === '"') {
            if (cudzyslow && s[i + 1] === '"') { pole += '"'; i++ }
            else cudzyslow = !cudzyslow
        } else if (c === sep && !cudzyslow) { r.push(pole); pole = '' }
        else if ((c === '\n' || c === '\r') && !cudzyslow) {
            if (c === '\r' && s[i + 1] === '\n') i++
            r.push(pole); wiersze.push(r); r = []; pole = ''
        } else pole += c
    }
    if (cudzyslow) throw new Error('CSV zawiera niezamknięte pole w cudzysłowie.')
    if (r.length || pole) { r.push(pole); wiersze.push(r) }
    return wiersze
}
async function wczytajCsv(file: File, nazwa: string) {
    if (file.size > MAX_FILE) throw new Error(`${nazwa}: plik jest za duży (limit 5 MB).`)
    return tablicaDoWierszy(csvTekst(await file.text()), nazwa)
}
async function wczytajXlsx(file: File): Promise<{ ksiegi: Wiersz[]; tomy: Wiersz[] }> {
    if (file.size > MAX_FILE) throw new Error('Arkusz XLSX jest za duży (limit 5 MB).')
    // Biblioteka wyłącznie odczytowa. Nie wykonujemy makr ani formuł z arkusza.
    const arkusze = await readExcelFile(Buffer.from(await file.arrayBuffer()))
    const arkusz = (nazwa: string): Wiersz[] => {
        const znaleziony = arkusze.find((a) => a.sheet.toLocaleLowerCase('pl-PL') === nazwa.toLocaleLowerCase('pl-PL'))
        if (!znaleziony) throw new Error(`Brak arkusza „${nazwa}” w pliku XLSX.`)
        if (znaleziony.data.length > MAX_TOMY + 10) throw new Error(`Arkusz „${nazwa}” jest za długi.`)
        return tablicaDoWierszy(znaleziony.data.map((r) => r.map(tekst)), nazwa)
    }
    return { ksiegi: arkusz('Zespoły'), tomy: arkusz('Tomy') }
}
function url(v: string, pole: string): string | null {
    if (!v) return null
    try {
        const u = new URL(v)
        if ((u.protocol === 'https:' || u.protocol === 'http:') && v.length <= 2048) return v
    } catch { /* nieprawidłowy URL */ }
    throw new Error(`${pole}: nieprawidłowy adres http(s): ${v.slice(0, 90)}`)
}
const polaExtra = [
    ['parafia_nazwa', 'parafia w źródle'], ['miejscowosci_informacyjnie', 'wsie (informacja)'],
    ['zrodlo_zespol_url', 'strona zespołu'], ['status_danych', 'status danych'],
    ['swa_id_zespolu', 'SWA ID zespołu'], ['liczba_jednostek_w_zespole', 'jednostek w zespole'],
    ['liczba_skanow_w_zespole', 'skanów w zespole'], ['zweryfikowane_tomy_ze_skanami', 'tomów zweryfikowanych'],
    ['status_weryfikacji_jednostek', 'weryfikacja jednostek'], ['region', 'region'],
    ['nazwa_zespolu_swa', 'nazwa zespołu SWA'],
] as const

function tomZCsv(w: Wiersz) {
    const years = w.rok_lub_lata || ''
    if (!/^\d{4}(?:\s*[–—-]\s*\d{4})?$/.test(years)) throw new Error(`Tom ${w.sygnatura_tomu || ''}: niepoprawne „rok lub lata”: ${years || '(puste)'}`)
    const tytul = w.tytul_jednostki || ''
    const skany = w.liczba_skanow || ''
    if (skany && (!/^\d+$/.test(skany) || +skany > 100000)) throw new Error(`Tom ${w.sygnatura_tomu}: niepoprawna liczba skanów.`)
    const scans = url(w.skany_tomu_url || '', `Skany tomu ${w.sygnatura_tomu}`)
    const scanCount = skany === '' ? null : Number(skany) // 0 to informacja, a nie brak danych
    if (scanCount === 0 && scans) throw new Error(`Tom ${w.sygnatura_tomu}: liczba skanów wynosi 0, ale podano link do skanów — popraw sprzeczne dane.`)
    const digitization: Tom['digitization'] = scanCount === 0 ? 'brak' : scanCount !== null && scanCount > 0 || scans ? 'online' : 'nieustalone'
    const info = [w.uwagi_tomu, w.status_linku ? `Status linku: ${w.status_linku}` : '', w.zrodlo_zespol_url ? `Źródło: ${w.zrodlo_zespol_url}` : ''].filter(Boolean).join('\n')
    return { years, identifier: w.sygnatura_tomu || '', scans, gaps: info, title: tytul, scanCount, digitization }
}
function slugCheck(id: string) {
    if (!SLUG.test(id) || id.length > 110) throw new Error(`Niepoprawny identyfikator księgi: ${id}`)
}

export async function odczytajImport(f: FormData): Promise<Zestaw> {
    const xlsx = f.get('xlsx'), csvK = f.get('ksiegi'), csvT = f.get('tomy')
    let ksiegi: Wiersz[], tomy: Wiersz[]
    if (xlsx instanceof File && xlsx.size) ({ ksiegi, tomy } = await wczytajXlsx(xlsx))
    else if (csvK instanceof File && csvK.size) {
        ksiegi = await wczytajCsv(csvK, 'Księgi CSV')
        tomy = csvT instanceof File && csvT.size ? await wczytajCsv(csvT, 'Tomy CSV') : []
    } else throw new Error('Wskaż plik XLSX albo CSV z księgami.')
    if (!ksiegi.length || ksiegi.length > MAX_KSIEGI) throw new Error(`Księgi: potrzeba od 1 do ${MAX_KSIEGI} wierszy.`)
    if (tomy.length > MAX_TOMY) throw new Error(`Tomów jest zbyt dużo (limit ${MAX_TOMY}).`)
    const grupy = new Map<string, Wiersz[]>()
    for (const w of tomy) {
        if (!w.ksiega_id) throw new Error('Tom bez „ksiega_id”.')
        grupy.set(w.ksiega_id, [...(grupy.get(w.ksiega_id) ?? []), w])
    }
    const znane = new Set<string>(), uwagi: string[] = []
    const parafieZnane = await parafie()
    const zespolyZnane = new Set((await zespolyArchiwalne()).map((x) => x.id))
    const znaneIdParafii = new Set(parafieZnane.map((p) => p.id))
    const mapa = (() => { try { return JSON.parse(String(f.get('parafieMap') || '{}')) as Record<string,string> } catch { return {} } })()
    const rekordy: Rekord[] = []
    for (const w of ksiegi) {
        const id = w.ksiega_id || ''
        slugCheck(id)
        if (znane.has(id)) throw new Error(`Powtórzony „ksiega_id”: ${id}`)
        znane.add(id)
        const nazwa = w.nazwa || ''
        if (!nazwa || nazwa.length > 350) throw new Error(`${id}: brak nazwy lub nazwa zbyt długa.`)
        // Wieloinstytucjonalny rekord nie otrzymuje automatycznie wytwórcy na podstawie nazwy.
        const relatedParishes = [...new Set((w.powiazane_parafie_id || '').split('|').map((x) => x.trim()).filter(Boolean))]
        for (const idPar of relatedParishes) if (!znaneIdParafii.has(idPar)) throw new Error(`${id}: nieznana dodatkowa instytucja „${idPar}”.`)
        const wskazana = mapa[id] || w.parafia_id || ''
        const dopasowanie = parafieZnane.find((p) => p.id === wskazana) ?? (
            !relatedParishes.length && !wskazana
                ? parafieZnane.find((p) => p.nazwa.toLocaleLowerCase('pl-PL') === (w.parafia_nazwa || '').toLocaleLowerCase('pl-PL'))
                : undefined
        )
        const parish = dopasowanie?.id || ''
        const relatedReligions = [...new Set((w.wyznania_ktorych_dotyczy || '').split('|').map((x) => x.trim()).filter(Boolean))]
        for (const wyznanie of relatedReligions) if (!(wyznanie in WYZNANIA_PARAFII)) throw new Error(`${id}: nieznane wyznanie „${wyznanie}”.`)
        if (!parish && !relatedParishes.length) uwagi.push(`${id}: instytucja nieustalona; można zaimportować i uzupełnić ją później.`)
        const fonds = w.zespol_archiwalny_id || ''
        if (fonds && !zespolyZnane.has(fonds)) throw new Error(`${id}: nieznany zespół archiwalny „${fonds}”; utwórz go w Keystatic lub pozostaw pole puste.`)
        const types = (w.rodzaje_aktow || '').split('|').map((t) => t.trim()).filter(Boolean)
        if (!types.length) { types.push('inne'); uwagi.push(`${id}: nie określono rodzajów aktów – ustawiono „inne”.`) }
        for (const typ of types) if (!(typ in RODZAJE_KSIAG)) throw new Error(`${id}: nieznany rodzaj aktów „${typ}”.`)
        const tomySurowe = grupy.get(id) ?? []
        const liczby = tomySurowe.map((t) => t.liczba_skanow).filter((v) => v !== '')
        const brakSkanow = tomySurowe.length > 0 && liczby.length === tomySurowe.length && liczby.every((v) => v === '0')
        const access = brakSkanow && !w.skany_url ? 'archiwum' : (w.dostep || 'skany')
        if (!(access in DOSTEP_KSIAG)) throw new Error(`${id}: nieznany rodzaj dostępu „${access}”.`)
        const spatial = (w.miejscowosci_id || '').split('|').map((x) => x.trim()).filter(Boolean)
        if (spatial.some((s) => !SLUG.test(s))) throw new Error(`${id}: niepoprawny identyfikator miejscowości.`)
        const pomoc = polaExtra.map(([pole, etykieta]) => w[pole] ? `${etykieta}: ${w[pole]}` : '').filter(Boolean).join('\n')
        const notes = [w.notatka_robocza, pomoc].filter(Boolean).join('\n\n')
        const tomyWiersze = grupy.get(id) ?? []
        const vol = tomyWiersze.sort((a, b) => Number(a.kolejnosc || 0) - Number(b.kolejnosc || 0)).map(tomZCsv)
        const sig = new Set<string>()
        for (const t of vol) {
            const key = t.identifier || `rok:${t.years}`
            if (sig.has(key)) throw new Error(`${id}: powtórzona sygnatura/rok tomu ${key}.`)
            sig.add(key)
        }
        const ksiega: Ksiega = {
            title: nazwa, parish: parish || null, fonds: fonds || null, relatedParishes, relatedReligions, types, spatial, years: w.lata || '', gaps: w.braki_i_uwagi_do_lat || '',
            language: w.jezyk || '', repository: w.przechowywane_w || '', identifier: w.zespol_i_sygnatura || '',
            volumes: vol, access, scans: url(w.skany_url || '', `${id}: skany zespołu`),
            index: url(w.indeks_url || '', `${id}: indeks`), visibility: 'ja', note: notes,
        }
        rekordy.push({ id, ksiega, parafiaNazwa: w.parafia_nazwa || '', liczbaTomow: vol.length, zrodloZespolu: url(w.zrodlo_zespol_url || '', `${id}: źródło zespołu`) })
        grupy.delete(id)
    }
    if (grupy.size) throw new Error(`Są tomy bez księgi nadrzędnej: ${[...grupy.keys()].slice(0,5).join(', ')}`)
    return { rekordy, uwagi }
}

function toObj(x: unknown): Record<string, unknown> {
    if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error('Nieprawidłowy YAML istniejącej księgi.')
    return x as Record<string, unknown>
}
function maWartosc(x: unknown) { return x != null && x !== '' && (!Array.isArray(x) || x.length > 0) }
function dopelnij(stare: Record<string, unknown>, nowe: Ksiega): Record<string, unknown> {
    const polaczone = { ...stare }
    for (const [k, val] of Object.entries(nowe)) {
        if (k === 'volumes' || k === 'visibility') continue
        if (!maWartosc(polaczone[k]) && maWartosc(val)) polaczone[k] = val
    }
    const obecne = Array.isArray(stare.volumes) ? stare.volumes.map((v) => toObj(v)) : []
    const wynik: Record<string, unknown>[] = [...obecne]
    for (const t of nowe.volumes) {
        const stary = wynik.find((v) => t.identifier ? v.identifier === t.identifier : (!v.identifier && v.years === t.years))
        if (!stary) { wynik.push(t); continue }
        for (const [k, val] of Object.entries(t)) if (!maWartosc(stary[k]) && maWartosc(val)) stary[k] = val
    }
    polaczone.volumes = wynik
    return polaczone
}
// Wiele ksiąg ma ręcznie nadane slugi odmienne od ID z arkusza. Wyszukujemy
// również ich sygnatury, żeby importer nie utworzył niechcący drugiego wpisu.
async function istniejaceSygnatury() {
    const m = new Map<string, string[]>()
    let pliki: string[] = []
    try { pliki = await fs.readdir(ROOT()) } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }
    for (const nazwa of pliki.filter((f) => f.endsWith('.yaml'))) {
        const zaw = toObj(yaml.load(await fs.readFile(path.join(ROOT(), nazwa), 'utf8')))
        const sygnatura = String(zaw.identifier ?? '').trim()
        if (!sygnatura) continue
        m.set(sygnatura, [...(m.get(sygnatura) ?? []), nazwa.slice(0, -5)])
    }
    return m
}

async function odczytajObecne(id: string) {
    const plik = path.join(ROOT(), `${id}.yaml`)
    try { return { plik, tekst: await fs.readFile(plik, 'utf8') } }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { plik, tekst: null }; throw e }
}

/** Przedział dla redaktora: lata z tomów (z widocznymi lukami), w razie braku – pole księgi. */
function lataDoPodgladu(k: Ksiega): string {
    const tomy = k.volumes.flatMap((v) => zakresyLat(v.years))
    const zakresy = scalZakresy(tomy.length ? tomy : zakresyLat(k.years))
    return zakresy.length ? zakresyTekst(zakresy) : (k.years.trim() || 'nie określono')
}

/** Jedna realna jednostka do obejrzenia; gdy brak linków tomów, wyraźnie oznaczony link do zespołu. */
function przykladJednostki(r: Rekord): { url: string | null; etykieta: string } {
    const tom = r.ksiega.volumes.find((v) => v.scans)
    if (tom?.scans) return { url: tom.scans, etykieta: tom.identifier || tom.years }
    if (r.ksiega.scans) return { url: r.ksiega.scans, etykieta: 'skany zespołu (nie pojedynczego tomu)' }
    if (r.zrodloZespolu) return { url: r.zrodloZespolu, etykieta: 'wykaz zespołu — brak linku do tomu' }
    return { url: null, etykieta: 'brak adresu jednostki — uzupełnij w Calc' }
}

export async function podgladImportu(z: Zestaw) {
    const wpisy = []
    const istniejeSig = await istniejaceSygnatury()
    for (const r of z.rekordy) {
        const stare = await odczytajObecne(r.id)
        const kolizje = stare.tekst === null && r.ksiega.identifier ? (istniejeSig.get(r.ksiega.identifier) ?? []).filter((id) => id !== r.id) : []
        wpisy.push({ id: r.id, nazwa: r.ksiega.title, lata: lataDoPodgladu(r.ksiega), przyklad: przykladJednostki(r), parafia: r.ksiega.parish || '', parafiaNazwa: r.parafiaNazwa, instytucjeDodatkowe: r.ksiega.relatedParishes, wyznania: r.ksiega.relatedReligions, tomy: r.liczbaTomow, stan: stare.tekst == null ? 'nowa' : 'istnieje', kolizje })
    }
    return { wpisy, uwagi: z.uwagi }
}

export async function zapiszImport(
    z: Zestaw, tryb: 'pomin' | 'dopelnij', potwierdzoneKolizje = false,
    widocznosc: 'ja' | 'bliscy' | 'publiczne' = 'ja', zmienIstniejace = false, potwierdzPublikacje = false,
) {
    if (!['ja', 'bliscy', 'publiczne'].includes(widocznosc)) throw new Error('Niepoprawna widoczność.')
    if (widocznosc === 'publiczne' && !potwierdzPublikacje) throw new Error('Publikacja całego importu wymaga osobnego potwierdzenia.')
    // Brak ustalonej instytucji jest dozwolony; nie wymuszamy historycznie błędnego przypisania.
    const istniejeSig = await istniejaceSygnatury()
    if (!potwierdzoneKolizje) for (const r of z.rekordy) {
        const obecny = await odczytajObecne(r.id)
        const idy = (istniejeSig.get(r.ksiega.identifier) ?? []).filter((id) => id !== r.id)
        if (obecny.tekst === null && r.ksiega.identifier && idy.length)
            throw new Error(`Księga o sygnaturze ${r.ksiega.identifier} już istnieje pod identyfikatorem: ${idy.join(', ')}. Dopasuj ID w arkuszu albo świadomie potwierdź utworzenie odrębnego wpisu.`)
    }
    const zapisy: { id: string; plik: string; poprzedni: string | null; wynik: string }[] = []
    let pominiete = 0
    // Cała paczka jest sprawdzana przed pierwszym zapisem.
    for (const r of z.rekordy) {
        const { plik, tekst: poprzedni } = await odczytajObecne(r.id)
        if (poprzedni !== null && tryb === 'pomin' && !zmienIstniejace) { pominiete++; continue }
        const zawartosc = poprzedni == null
            ? { ...r.ksiega, visibility: widocznosc }
            : (tryb === 'dopelnij' ? dopelnij(toObj(yaml.load(poprzedni)), r.ksiega) : { ...toObj(yaml.load(poprzedni)) })
        if (poprzedni !== null && zmienIstniejace) zawartosc.visibility = widocznosc
        const wynik = yaml.dump(zawartosc, { lineWidth: -1, noRefs: true, quotingType: '"', forceQuotes: false })
        // Kontrola odczytu przed zapisaniem: nigdy nie podmieniamy pliku pustym YAML-em.
        toObj(yaml.load(wynik))
        if (poprzedni === wynik) { pominiete++; continue }
        zapisy.push({ id: r.id, plik, poprzedni, wynik })
    }
    const wynik = await wykonajPartie(zapisy as ZmianaImportu[], ROOT(), BACKUP())
    return { dodane: wynik.dodane, uzupelnione: wynik.uzupelnione, pominiete, backup: wynik.backup }

}

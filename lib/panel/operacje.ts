// P5 (IMP-08/09, PNL-09): wspólny mechanizm „podgląd + cofnij” dla operacji na wielu plikach treści –
// import ksiąg, import drzewa (GEDCOM) i zmiany zbiorcze z listy panelu.
//  • blokada `content/_operacje/.blokada` – jedna operacja naraz; respektuje ją też zapis z Keystatic (route.ts);
//    P6a (KOREKTA P5): dawniej `content/.operacja.lock` – usługa nie ma prawa zapisu w samym content/ (Krok 0 P6),
//  • przed pierwszym zapisem: kontrola, że każdy plik ma treść z podglądu (inaczej „zmieniony w międzyczasie”),
//  • kopia: `content/_operacje/<id>/` – manifest.json, `przed/<n>` i `po/<n>` (decyzja właściciela 18.11: w content/,
//    więc wchodzi do kopii całości; 30 ostatnich operacji),
//  • zapis atomowy (plik tymczasowy → rename; nowy plik przez link – nie nadpisze równoległego),
//  • błąd w trakcie → cofnięcie zapisanych plików (bez nadpisywania równoległej poprawki),
//  • „cofnij” po udanej operacji = nowa operacja z odwróconymi zmianami (też do cofnięcia),
//  • awaria procesu (manifest „przygotowane”, blokada bez żywej operacji) → „dokończ” albo „cofnij” z panelu.
// Cofnięcie nigdy nie nadpisuje pliku zmienionego po operacji – taki plik jest konfliktem do ręcznej decyzji.
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { zapewnijKatalog } from './katalogi'

export type RodzajOperacji = 'import-ksiag' | 'import-drzewa' | 'zbiorcza' | 'odtworzenie' | 'przywrocenie'
export const NAZWY_OPERACJI: Record<RodzajOperacji, string> = { 'import-ksiag': 'import ksiąg', 'import-drzewa': 'import drzewa (GEDCOM)', zbiorcza: 'zmiana zbiorcza', odtworzenie: 'odtworzenie z kopii', przywrocenie: 'przywrócenie wersji / z kosza' }
export type StanOperacji = 'przygotowane' | 'zapisane' | 'wycofane' | 'wycofane-czesciowo' | 'cofniete' | 'dokonczone'

/** Zmiana jednego pliku. `plik` – ścieżka względem `content/` (ukośniki). `null` = pliku nie ma (utworzenie / usunięcie). */
export interface ZmianaPliku { plik: string; poprzedni: string | null; wynik: string | null }

export interface PozycjaManifestu { plik: string; operacja: 'utworz' | 'zmien' | 'usun'; przed: string | null; po: string | null }
export interface Manifest {
    wersja: 1; id: string; rodzaj: RodzajOperacji; opis: string; utworzono: string; stan: StanOperacji
    zmiany: PozycjaManifestu[]
    /** Dane do widoku (np. liczby z importu, wybrane pozycje). Bez treści plików. */
    szczegoly?: Record<string, unknown>
    cofa?: string; cofnietaPrzez?: string; zakonczono?: string; problemy?: string[]
    /** Prawa plików tej operacji – te same przy cofaniu i dokańczaniu. */
    prawa?: { tryb?: number; grupaKatalogu?: boolean }
}

export const ZACHOWAJ_OPERACJI = 30
const KAT = '_operacje'
const BLOKADA = path.join(KAT, '.blokada')
const ID = /^\d{8}-\d{6}-\d{5}-[a-f0-9]{4}$/

const tresc = (korzen: string) => path.join(/*turbopackIgnore: true*/ korzen, 'content')
const katOperacji = (korzen: string) => path.join(tresc(korzen), KAT)

let licznik = 0
/** Identyfikator rosnący w czasie (sortowanie = kolejność): data-czas UTC, milisekundy + licznik, losowy dopisek. */
function noweId(d = new Date()): string {
    const z = (n: number, w = 2) => String(n).padStart(w, '0')
    licznik = (licznik + 1) % 100
    return `${d.getUTCFullYear()}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}-${z(d.getUTCHours())}${z(d.getUTCMinutes())}${z(d.getUTCSeconds())}-${z(d.getUTCMilliseconds(), 3)}${z(licznik)}-${randomBytes(2).toString('hex')}`
}

/** Ścieżka pliku treści – tylko wewnątrz content/, bez „..”, bez katalogu operacji i plików ukrytych. */
export function sciezkaTresci(korzen: string, rel: string): string {
    if (!rel || path.isAbsolute(rel) || rel.includes('\\') || rel.split('/').some((c) => c === '..' || c === '' || c.startsWith('.')))
        throw new Error(`Niedozwolona ścieżka pliku: ${rel.slice(0, 120)}`)
    if (rel.split('/')[0] === KAT) throw new Error('Operacja nie może zmieniać kopii operacji.')
    const baza = tresc(korzen), p = path.resolve(/*turbopackIgnore: true*/ baza, rel)
    if (!p.startsWith(baza + path.sep)) throw new Error(`Ścieżka poza content/: ${rel.slice(0, 120)}`)
    return p
}

async function czytaj(p: string): Promise<string | null> {
    try { return await fs.readFile(/*turbopackIgnore: true*/ p, 'utf8') }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e }
}

// ---------- blokada ----------
const aktywne = new Set<string>()

export interface StanBlokady { id: string; czas: string; rodzaj: RodzajOperacji; opis: string; martwa: boolean }

/** Blokada jest „martwa”, gdy jej operacja nie trwa w tym procesie (awaria lub restart w trakcie). */
export async function stanBlokady(korzen = process.cwd()): Promise<StanBlokady | null> {
    const t = await czytaj(path.join(tresc(korzen), BLOKADA, 'info.json'))
    if (t === null) {
        try { await fs.stat(path.join(tresc(korzen), BLOKADA)) } catch { return null }
        return { id: '', czas: '', rodzaj: 'zbiorcza', opis: 'blokada bez opisu', martwa: true }
    }
    try {
        const b = JSON.parse(t) as Omit<StanBlokady, 'martwa'>
        return { ...b, martwa: !aktywne.has(b.id) }
    } catch { return { id: '', czas: '', rodzaj: 'zbiorcza', opis: 'uszkodzony opis blokady', martwa: true } }
}

/** Dla trasy zapisu Keystatic: komunikat, gdy trwa operacja (zapis ręczny poczeka albo zostanie odrzucony), inaczej null. */
export async function blokadaZapisu(korzen = process.cwd()): Promise<string | null> {
    const b = await stanBlokady(korzen)
    if (!b) return null
    return b.martwa
        ? `Zapis wstrzymany: operacja „${b.opis}” została przerwana. Dokończ albo cofnij ją w panelu (kopie → ostatnie operacje).`
        : `Trwa ${b.opis} – zapisz ponownie za chwilę.`
}

async function zablokuj(korzen: string, m: Pick<Manifest, 'id' | 'rodzaj' | 'opis'>) {
    const kat = path.join(tresc(korzen), BLOKADA)
    await zapewnijKatalog(korzen, '_operacje')
    try { await fs.mkdir(kat) } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
        const b = await stanBlokady(korzen)
        throw new Error(b?.martwa
            ? `Poprzednia operacja („${b.opis}”) została przerwana. Najpierw ją dokończ albo cofnij w panelu.`
            : `Trwa inna operacja${b ? ` („${b.opis}”)` : ''}. Spróbuj za chwilę.`)
    }
    aktywne.add(m.id)
    await fs.writeFile(path.join(kat, 'info.json'), JSON.stringify({ id: m.id, czas: new Date().toISOString(), rodzaj: m.rodzaj, opis: m.opis }), { mode: 0o600 })
}

async function odblokuj(korzen: string, id: string) {
    aktywne.delete(id)
    const kat = path.join(tresc(korzen), BLOKADA)
    await fs.rm(path.join(kat, 'info.json'), { force: true }).catch(() => {})
    await fs.rmdir(kat).catch(() => {})
}

// ---------- zapis plików ----------
async function zapiszTymczasowy(cel: string, tekst: string, prawa: { tryb: number; grupaKatalogu: boolean }): Promise<string> {
    await fs.mkdir(path.dirname(cel), { recursive: true })
    const tmp = `${cel}.${randomBytes(6).toString('hex')}.op.tmp`
    await fs.writeFile(tmp, tekst, { flag: 'wx', mode: 0o600 })
    try {
        if (prawa.grupaKatalogu) {
            // księgi: plik musi być czytelny dla grupy katalogu (użytkownik budujący Next.js) – jak dawny import
            const [rodzic, st] = await Promise.all([fs.stat(path.dirname(cel)), fs.stat(tmp)])
            if (st.gid !== rodzic.gid) await fs.chown(tmp, st.uid, rodzic.gid)
            await fs.chmod(tmp, prawa.tryb)
            const g = await fs.stat(tmp)
            if ((g.mode & 0o777) !== prawa.tryb || g.gid !== rodzic.gid) throw new Error('Nie udało się nadać grupie katalogu dostępu do odczytu pliku.')
        } else await fs.chmod(tmp, prawa.tryb)
    } catch (e) { await fs.rm(tmp, { force: true }).catch(() => {}); throw e }
    return tmp
}

async function trybPliku(cel: string, domyslny: number): Promise<number> {
    try { return (await fs.stat(cel)).mode & 0o777 } catch { return domyslny }
}

/** Jeden plik: z `obecny` (musi się zgadzać) na `nowy`. */
async function zapiszPlik(cel: string, obecny: string | null, nowy: string | null, prawa: OpcjeOperacji['prawa']) {
    if (await czytaj(cel) !== obecny) throw new Error(`Plik ${path.basename(cel)} zmienił się w trakcie operacji.`)
    if (nowy === null) { if (obecny !== null) await fs.unlink(cel); return }
    const tryb = prawa?.grupaKatalogu ? (prawa.tryb ?? 0o640) : await trybPliku(cel, prawa?.tryb ?? 0o640)
    const tmp = await zapiszTymczasowy(cel, nowy, { tryb, grupaKatalogu: !!prawa?.grupaKatalogu })
    try {
        if (obecny === null) { await fs.link(tmp, cel) } // nie nadpisze pliku utworzonego równolegle
        else await fs.rename(tmp, cel)
    } finally { await fs.rm(tmp, { force: true }).catch(() => {}) }
}

// ---------- manifest ----------
async function zapiszManifest(korzen: string, m: Manifest) {
    const p = path.join(katOperacji(korzen), m.id, 'manifest.json'), tmp = `${p}.${randomBytes(4).toString('hex')}.tmp`
    await fs.writeFile(tmp, JSON.stringify(m, null, 1), { mode: 0o600 })
    await fs.rename(tmp, p)
}

export async function wczytajManifest(id: string, korzen = process.cwd()): Promise<Manifest | null> {
    if (!ID.test(id)) return null
    const t = await czytaj(path.join(katOperacji(korzen), id, 'manifest.json'))
    if (t === null) return null
    try { return JSON.parse(t) as Manifest } catch { return null }
}

const plikKopii = (korzen: string, id: string, nazwa: string) => path.join(katOperacji(korzen), id, nazwa)

async function zawartoscKopii(korzen: string, id: string, nazwa: string | null): Promise<string | null> {
    if (nazwa === null) return null
    const t = await czytaj(plikKopii(korzen, id, nazwa))
    if (t === null) throw new Error(`Brak kopii ${nazwa} operacji ${id}.`)
    return t
}

export async function listaOperacji(korzen = process.cwd()): Promise<Manifest[]> {
    let n: string[] = []
    try { n = (await fs.readdir(katOperacji(korzen))).filter((x) => ID.test(x)) } catch { return [] }
    const L: Manifest[] = []
    for (const id of n.sort().reverse()) { const m = await wczytajManifest(id, korzen); if (m) L.push(m) }
    return L
}

async function sprzataj(korzen: string) {
    const L = await listaOperacji(korzen)
    for (const m of L.slice(ZACHOWAJ_OPERACJI)) {
        if (m.stan === 'przygotowane') continue // przerwana – zostaje do decyzji
        await fs.rm(path.join(katOperacji(korzen), m.id), { recursive: true, force: true }).catch(() => {})
    }
}

// ---------- operacja ----------
export interface OpcjeOperacji {
    korzen?: string
    rodzaj: RodzajOperacji
    opis: string
    zmiany: ZmianaPliku[]
    szczegoly?: Record<string, unknown>
    cofa?: string
    /** Prawa nowych plików: domyślnie jak istniejący plik albo 0640; `grupaKatalogu` – jak dawny import ksiąg. */
    prawa?: { tryb?: number; grupaKatalogu?: boolean }
    /** Kontrola po zapisie wszystkich plików (np. odczyt czytnikiem Keystatic); błąd = cofnięcie całości. */
    sprawdz?: () => Promise<void>
    /** Tylko testy: hak przed zapisem n-tego pliku (odtworzenie awarii w połowie). */
    przedZapisem?: (n: number) => Promise<void>
}

export interface WynikOperacji { id: string | null; zapisane: number; utworzone: number; zmienione: number; usuniete: number }

/** Wykonuje operację w całości albo wcale (w granicach systemu plików – zob. nagłówek). Zwraca id do „cofnij”. */
export async function wykonajOperacje(o: OpcjeOperacji): Promise<WynikOperacji> {
    const korzen = o.korzen ?? process.cwd()
    const zmiany = o.zmiany.filter((z) => z.poprzedni !== z.wynik)
    const pusty = { id: null, zapisane: 0, utworzone: 0, zmienione: 0, usuniete: 0 }
    if (!zmiany.length) return pusty
    const bylo = new Set<string>()
    for (const z of zmiany) {
        sciezkaTresci(korzen, z.plik)
        if (bylo.has(z.plik)) throw new Error(`Plik ${z.plik} występuje w operacji dwa razy.`)
        bylo.add(z.plik)
    }
    const id = noweId()
    const m: Manifest = {
        wersja: 1, id, rodzaj: o.rodzaj, opis: o.opis.slice(0, 300), utworzono: new Date().toISOString(), stan: 'przygotowane',
        zmiany: zmiany.map((z, i) => ({
            plik: z.plik, operacja: z.poprzedni === null ? 'utworz' : z.wynik === null ? 'usun' : 'zmien',
            przed: z.poprzedni === null ? null : `przed/${i}`, po: z.wynik === null ? null : `po/${i}`,
        })),
        ...(o.szczegoly ? { szczegoly: o.szczegoly } : {}), ...(o.cofa ? { cofa: o.cofa } : {}), ...(o.prawa ? { prawa: o.prawa } : {}),
    }
    await zablokuj(korzen, m)
    const zrobione: number[] = []
    let manifestZapisany = false
    try {
        // 1. kontrola przed pierwszym zapisem
        for (const z of zmiany) if (await czytaj(sciezkaTresci(korzen, z.plik)) !== z.poprzedni)
            throw new Error(`Plik ${z.plik} zmienił się od podglądu. Odśwież podgląd i spróbuj ponownie.`)
        // 2. kopia „przed” i „po” + manifest
        const kat = path.join(katOperacji(korzen), id)
        await fs.mkdir(path.join(kat, 'przed'), { recursive: true, mode: 0o700 })
        await fs.mkdir(path.join(kat, 'po'), { mode: 0o700 })
        await fs.chmod(kat, 0o700)
        for (let i = 0; i < zmiany.length; i++) {
            if (zmiany[i].poprzedni !== null) await fs.writeFile(path.join(kat, 'przed', String(i)), zmiany[i].poprzedni!, { flag: 'wx', mode: 0o600 })
            if (zmiany[i].wynik !== null) await fs.writeFile(path.join(kat, 'po', String(i)), zmiany[i].wynik!, { flag: 'wx', mode: 0o600 })
        }
        await zapiszManifest(korzen, m); manifestZapisany = true
        // 3. zapis
        for (let i = 0; i < zmiany.length; i++) {
            if (o.przedZapisem) await o.przedZapisem(i)
            await zapiszPlik(sciezkaTresci(korzen, zmiany[i].plik), zmiany[i].poprzedni, zmiany[i].wynik, o.prawa)
            zrobione.push(i)
        }
        if (o.sprawdz) await o.sprawdz()
        m.stan = 'zapisane'; m.zakonczono = new Date().toISOString()
        await zapiszManifest(korzen, m)
        if (o.cofa) {
            const c = await wczytajManifest(o.cofa, korzen)
            if (c) { c.stan = 'cofniete'; c.cofnietaPrzez = id; await zapiszManifest(korzen, c) }
        }
        await sprzataj(korzen)
        return {
            id, zapisane: zmiany.length,
            utworzone: m.zmiany.filter((x) => x.operacja === 'utworz').length,
            zmienione: m.zmiany.filter((x) => x.operacja === 'zmien').length,
            usuniete: m.zmiany.filter((x) => x.operacja === 'usun').length,
        }
    } catch (blad) {
        const problemy: string[] = []
        for (const i of [...zrobione].reverse()) {
            const z = zmiany[i], cel = sciezkaTresci(korzen, z.plik)
            try {
                // bezwarunkowe cofnięcie mogłoby skasować równoległą poprawkę redaktora
                if (await czytaj(cel) !== z.wynik) { problemy.push(`${z.plik}: zmieniony po zapisie – nie cofnięto automatycznie`); continue }
                await zapiszPlik(cel, z.wynik, z.poprzedni, o.prawa)
            } catch (e) { problemy.push(`${z.plik}: ${e instanceof Error ? e.message : String(e)}`) }
        }
        if (manifestZapisany) {
            m.stan = problemy.length ? 'wycofane-czesciowo' : 'wycofane'; m.zakonczono = new Date().toISOString()
            m.problemy = [String(blad instanceof Error ? blad.message : blad).slice(0, 300), ...problemy]
            await zapiszManifest(korzen, m).catch(() => {})
        } else await fs.rm(path.join(katOperacji(korzen), id), { recursive: true, force: true }).catch(() => {})
        if (problemy.length) throw new Error(`Operacja przerwana; cofnięcie NIEPEŁNE: ${problemy.join('; ')}. Kopie: content/${KAT}/${id}.`)
        throw blad
    } finally {
        await odblokuj(korzen, id)
    }
}

// ---------- cofnij ----------
export interface PodgladCofniecia { id: string; opis: string; pliki: number; konflikty: string[]; mozna: boolean; powod?: string }

async function odwrocone(korzen: string, m: Manifest): Promise<{ zmiany: ZmianaPliku[]; konflikty: string[] }> {
    const zmiany: ZmianaPliku[] = [], konflikty: string[] = []
    for (const z of m.zmiany) {
        const przed = await zawartoscKopii(korzen, m.id, z.przed), po = await zawartoscKopii(korzen, m.id, z.po)
        const teraz = await czytaj(sciezkaTresci(korzen, z.plik))
        if (teraz === przed) continue // już jak przed operacją
        if (teraz !== po) { konflikty.push(z.plik); continue }
        zmiany.push({ plik: z.plik, poprzedni: po, wynik: przed })
    }
    return { zmiany, konflikty }
}

export async function podgladCofniecia(id: string, korzen = process.cwd()): Promise<PodgladCofniecia> {
    const m = await wczytajManifest(id, korzen)
    if (!m) return { id, opis: '', pliki: 0, konflikty: [], mozna: false, powod: 'Nie ma takiej operacji.' }
    if (m.stan !== 'zapisane' && m.stan !== 'dokonczone') return { id, opis: m.opis, pliki: 0, konflikty: [], mozna: false, powod: m.stan === 'przygotowane' ? 'Operacja przerwana – użyj „dokończ” albo „cofnij przerwaną”.' : 'Tej operacji nie trzeba cofać.' }
    const { zmiany, konflikty } = await odwrocone(korzen, m)
    return { id, opis: m.opis, pliki: zmiany.length, konflikty, mozna: zmiany.length > 0 }
}

/** Cofnięcie udanej operacji. Pliki zmienione później (konflikty): odmowa, a przy `pominKonflikty` – zostają bez zmian, reszta wraca. */
export async function cofnijOperacje(id: string, opcje: { korzen?: string; pominKonflikty?: boolean; sprawdz?: () => Promise<void> } = {}): Promise<WynikOperacji & { konflikty: string[] }> {
    const korzen = opcje.korzen ?? process.cwd()
    const m = await wczytajManifest(id, korzen)
    if (!m) throw new Error('Nie ma takiej operacji.')
    if (m.stan !== 'zapisane' && m.stan !== 'dokonczone') throw new Error('Tej operacji nie można cofnąć (stan: ' + m.stan + ').')
    const { zmiany, konflikty } = await odwrocone(korzen, m)
    if (konflikty.length && !opcje.pominKonflikty)
        throw new Error(`Po operacji zmieniono ${konflikty.length} ${konflikty.length === 1 ? 'plik' : 'plików'} (${konflikty.slice(0, 5).join(', ')}). Cofnij resztę świadomie albo popraw je ręcznie.`)
    const w = await wykonajOperacje({
        korzen, rodzaj: m.rodzaj, opis: `cofnięcie: ${m.opis}`, zmiany, cofa: id, prawa: m.prawa, sprawdz: opcje.sprawdz,
        szczegoly: { cofa: id, konflikty: konflikty.length },
    })
    if (!w.id) { m.stan = 'cofniete'; await zapiszManifest(korzen, m) }
    return { ...w, konflikty }
}

// ---------- awaria procesu ----------
/** Przerwana operacja (stan „przygotowane”): dokończ (zapisz brakujące „po”) albo cofnij (przywróć „przed”). */
export async function rozstrzygnijPrzerwana(id: string, decyzja: 'dokoncz' | 'cofnij', korzen = process.cwd()): Promise<{ zmienione: number; konflikty: string[] }> {
    const m = await wczytajManifest(id, korzen)
    if (!m || m.stan !== 'przygotowane') throw new Error('To nie jest przerwana operacja.')
    const b = await stanBlokady(korzen)
    if (b && !b.martwa) throw new Error('Operacja nadal trwa.')
    let zmienione = 0
    const konflikty: string[] = []
    for (const z of m.zmiany) {
        const przed = await zawartoscKopii(korzen, id, z.przed), po = await zawartoscKopii(korzen, id, z.po)
        const cel = sciezkaTresci(korzen, z.plik), teraz = await czytaj(cel)
        const [skad, dokad] = decyzja === 'dokoncz' ? [przed, po] : [po, przed]
        if (teraz === dokad) continue
        if (teraz !== skad) { konflikty.push(z.plik); continue }
        await zapiszPlik(cel, skad, dokad, m.prawa)
        zmienione++
    }
    m.stan = decyzja === 'dokoncz' ? 'dokonczone' : 'wycofane'
    m.zakonczono = new Date().toISOString()
    if (konflikty.length) m.problemy = [...(m.problemy ?? []), ...konflikty.map((k) => `${k}: zmieniony ręcznie – pominięty`)]
    await zapiszManifest(korzen, m)
    if (b?.martwa && (b.id === id || !b.id)) await odblokuj(korzen, b.id)
    return { zmienione, konflikty }
}

/** Zdjęcie martwej blokady bez manifestu (awaria przed zapisem manifestu – nic nie zmieniono w treściach). */
export async function zdejmijMartwaBlokade(korzen = process.cwd()): Promise<string | null> {
    const b = await stanBlokady(korzen)
    if (!b) return null
    if (!b.martwa) return 'Operacja nadal trwa.'
    const m = b.id ? await wczytajManifest(b.id, korzen) : null
    if (m?.stan === 'przygotowane') return 'Najpierw dokończ albo cofnij przerwaną operację.'
    await odblokuj(korzen, b.id)
    return null
}

/** Skrót operacji do listy w panelu (bez treści plików). */
export function skrotOperacji(m: Manifest) {
    return {
        id: m.id, rodzaj: m.rodzaj, nazwa: NAZWY_OPERACJI[m.rodzaj] ?? m.rodzaj, opis: m.opis, utworzono: m.utworzono, stan: m.stan,
        pliki: m.zmiany.length, utworzone: m.zmiany.filter((x) => x.operacja === 'utworz').length,
        zmienione: m.zmiany.filter((x) => x.operacja === 'zmien').length, usuniete: m.zmiany.filter((x) => x.operacja === 'usun').length,
        cofa: m.cofa ?? null, cofnietaPrzez: m.cofnietaPrzez ?? null, problemy: m.problemy ?? [], przyklady: m.zmiany.slice(0, 8).map((x) => x.plik),
    }
}


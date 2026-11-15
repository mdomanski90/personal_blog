// Bezpieczny zapis wielu plików Keystatic: preflight, blokada importu, kopie i rollback.
// Nie jest to transakcja bazodanowa; przy awarii systemu pozostaje manifest w katalogu backupu.
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

export interface ZmianaImportu { id: string; plik: string; poprzedni: string | null; wynik: string }

async function zawartosc(plik: string): Promise<string | null> {
    try { return await fs.readFile(plik, 'utf8') }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e }
}
// Pliki ksiąg musi móc odczytać użytkownik budujący Next.js (członek grupy
// katalogu content/ksiegi). Kopie importerowe w backupRoot pozostają 0600/0700.
const TRYB_PLIKU_KSIEGI = 0o640
async function plikTymczasowy(plik: string, tekst: string): Promise<string> {
    const tym = `${plik}.${randomBytes(8).toString('hex')}.import.tmp`
    await fs.writeFile(tym, tekst, { flag: 'wx', mode: 0o600 })
    try {
        const [rodzic, tymStat] = await Promise.all([fs.stat(path.dirname(plik)), fs.stat(tym)])
        // Jeśli katalog ma SGID, grupa jest dziedziczona automatycznie. W innym
        // przypadku ustawiamy grupę katalogu. Jeśli proces nie ma do niej prawa,
        // import ma się zatrzymać PRZED opublikowaniem pierwszego rekordu.
        if (tymStat.gid !== rodzic.gid) await fs.chown(tym, tymStat.uid, rodzic.gid)
        // chmod po zapisie, bo umask=0077 może usunąć grupowe r nawet przy mode=0640.
        await fs.chmod(tym, TRYB_PLIKU_KSIEGI)
        const gotowy = await fs.stat(tym)
        if ((gotowy.mode & 0o777) !== TRYB_PLIKU_KSIEGI || gotowy.gid !== rodzic.gid)
            throw new Error('Nie udało się nadać grupie katalogu dostępu do odczytu księgi.')
    } catch (e) {
        await fs.rm(tym, { force: true }).catch(() => {})
        throw e
    }
    return tym
}

/** `przedZapisiem` to hak tylko do testu odtwarzania błędu w środku partii. */
export async function wykonajPartie(
    zmiany: ZmianaImportu[], root: string, backupRoot: string,
    przedZapisem?: (numer: number) => Promise<void>,
): Promise<{ dodane: number; uzupelnione: number; backup: string | null }> {
    await fs.mkdir(root, { recursive: true })
    const lock = path.join(root, '.import-ksiegi.lock')
    try { await fs.mkdir(lock) }
    catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('Trwa inny import lub istnieje blokada po awarii. Sprawdź stan importu i nie usuwaj blokady w ciemno.')
        throw e
    }
    const prepared: { zmiana: ZmianaImportu; tmp: string }[] = []
    const done: ZmianaImportu[] = []
    let dir: string | null = null
    try {
        // Weryfikacja wszystkich precondition przed pierwszym zapisem.
        for (const r of zmiany) {
            if (path.resolve(path.dirname(r.plik)) !== path.resolve(root) || path.extname(r.plik) !== '.yaml')
                throw new Error('Zapis tylko do plików YAML ksiąg w ustalonym katalogu.')
            if (await zawartosc(r.plik) !== r.poprzedni) throw new Error(`Księga ${r.id} została zmieniona podczas przygotowania importu. Ponów podgląd.`)
        }
        if (!zmiany.length) return { dodane: 0, uzupelnione: 0, backup: null }
        dir = path.join(backupRoot, `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(5).toString('hex')}`)
        await fs.mkdir(dir, { recursive: true, mode: 0o700 })
        // Zapisz kopię KAŻDEGO istniejącego rekordu zanim pierwszy rekord się zmieni.
        for (const r of zmiany) {
            if (r.poprzedni !== null) await fs.writeFile(path.join(dir, `${r.id}.yaml`), r.poprzedni, { flag: 'wx', mode: 0o600 })
            prepared.push({ zmiana: r, tmp: await plikTymczasowy(r.plik, r.wynik) })
        }
        await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify({
            wersja: 2, status: 'przygotowane', zmiany: zmiany.map((r) => ({ id: r.id, operacja: r.poprzedni === null ? 'utworz' : 'uzupelnij' })),
        }, null, 2), { flag: 'wx', mode: 0o600 })
        for (let i = 0; i < prepared.length; i++) {
            const { zmiana: r, tmp } = prepared[i]
            if (przedZapisem) await przedZapisem(i)
            if (await zawartosc(r.plik) !== r.poprzedni) throw new Error(`Księga ${r.id} została zmieniona w Keystatic w trakcie importu.`)
            if (r.poprzedni === null) {
                // Nie pozwól nadpisać pliku utworzonego równolegle.
                await fs.link(tmp, r.plik)
                done.push(r)
                await fs.unlink(tmp)
            } else {
                await fs.rename(tmp, r.plik)
                done.push(r)
            }
        }
        await fs.writeFile(path.join(dir, 'wynik.json'), JSON.stringify({ status: 'zapisane', zapisanych: done.length }), { mode: 0o600 })
        return { dodane: done.filter((r) => r.poprzedni === null).length, uzupelnione: done.filter((r) => r.poprzedni !== null).length, backup: dir }
    } catch (error) {
        const problemy: string[] = []
        for (const r of [...done].reverse()) {
            try {
                // Bezwarunkowy rollback mógłby skasować równoległą poprawkę redaktora.
                if (await zawartosc(r.plik) !== r.wynik) { problemy.push(`${r.id}: zmieniono po imporcie, nie nadpisano automatycznie`); continue }
                if (r.poprzedni === null) await fs.unlink(r.plik)
                else {
                    const tmp = await plikTymczasowy(r.plik, r.poprzedni)
                    try { await fs.rename(tmp, r.plik) } finally { await fs.rm(tmp, { force: true }) }
                }
            } catch (e) { problemy.push(`${r.id}: ${e instanceof Error ? e.message : String(e)}`) }
        }
        if (dir) await fs.writeFile(path.join(dir, 'wynik.json'), JSON.stringify({ status: problemy.length ? 'rollback-niepelny' : 'rollback', problemy, powod: String(error) }), { mode: 0o600 }).catch(() => {})
        if (problemy.length) throw new Error(`Import przerwany; rollback NIEPEŁNY: ${problemy.join('; ')}. Kopie w ${dir}. Przywracanie tylko po ręcznej kontroli.`)
        throw error
    } finally {
        for (const p of prepared) await fs.rm(p.tmp, { force: true }).catch(() => {})
        await fs.rmdir(lock).catch(() => {})
    }
}

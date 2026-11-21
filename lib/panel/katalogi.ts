// P6a: katalogi kopii panelu w content/ – operacje (P5), historia wersji i kosz treści (P6).
// Usługa (użytkownik blog) nie ma prawa zapisu w samym content/ (Krok 0 P6, 18.11: drwxr-sr-x ubuntu:blog), więc katalogi
// zakłada raz właściciel (KOMENDA_KATALOGOW), a kod tylko w nich pisze. Każdy dostaje .gitignore z „*”: Keystatic po każdym
// zapisie czyta i liczy skrót wszystkich plików projektu poza .gitignore (read-local…node.js:23–62), a git na VPS (gałąź local)
// nie powinien widzieć kopii. Kopia całości i kopia nocna (tar) obejmują je dalej.
import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'

export const KATALOGI_KOPII = ['_operacje', '_historia', '_kosz'] as const
export type KatalogKopii = typeof KATALOGI_KOPII[number]
export const KOMENDA_KATALOGOW = 'cd /opt/personal_blog && sudo install -d -o blog -g blog -m 2750 content/_operacje content/_historia content/_kosz'

export const katalogKopii = (korzen: string, k: KatalogKopii) => path.join(/*turbopackIgnore: true*/ korzen, 'content', k)

export class BrakKataloguKopii extends Error {
    constructor(k: KatalogKopii) {
        super(`Brak katalogu content/${k} z prawem zapisu dla serwera – nic nie zmieniono. Jednorazowo na serwerze: ${KOMENDA_KATALOGOW}`)
    }
}

/** Katalog kopii gotowy do zapisu (z .gitignore). Gdy go nie ma, próbuje założyć (działa lokalnie i w testach); brak prawa → BrakKataloguKopii. */
export async function zapewnijKatalog(korzen: string, k: KatalogKopii): Promise<string> {
    const kat = katalogKopii(korzen, k)
    try {
        await fs.mkdir(kat, { recursive: true, mode: 0o750 })
        await fs.access(/*turbopackIgnore: true*/ kat, constants.W_OK)
    } catch (e) {
        const kod = (e as NodeJS.ErrnoException).code
        if (kod === 'EACCES' || kod === 'EPERM' || kod === 'EROFS' || kod === 'ENOENT' || kod === 'ENOTDIR' || kod === 'EEXIST') throw new BrakKataloguKopii(k)
        throw e
    }
    await fs.writeFile(path.join(/*turbopackIgnore: true*/ kat, '.gitignore'), '*\n', { flag: 'wx', mode: 0o640 }).catch((e) => {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
    })
    return kat
}

/** Do uwag technicznych na pulpicie: katalogi, których brakuje albo w których serwer nie może pisać. */
export async function brakujaceKatalogi(korzen = process.cwd()): Promise<KatalogKopii[]> {
    const wyn: KatalogKopii[] = []
    const mozeZalozyc = await fs.access(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ korzen, 'content'), constants.W_OK).then(() => true, () => false)
    for (const k of KATALOGI_KOPII) {
        try { await fs.access(/*turbopackIgnore: true*/ katalogKopii(korzen, k), constants.W_OK) } catch (e) {
            if (!(mozeZalozyc && (e as NodeJS.ErrnoException).code === 'ENOENT')) wyn.push(k)
        }
    }
    return wyn
}

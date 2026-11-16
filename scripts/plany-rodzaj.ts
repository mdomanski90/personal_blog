// PH1: migracja pola `rodzaj` planów – uruchamiana ręcznie, NIE przy budowaniu (zasada 2.1, jak etapy 1–2).
//   npm run plany:rodzaj              – tylko raport (nic nie zapisuje): który plan jaki rodzaj dostanie
//   npm run plany:rodzaj -- --zapisz  – zapis; oryginał każdego zmienionego planu najpierw do content/plany/_kosz/
//   npm run plany:rodzaj -- --cofnij  – przywraca oryginały z _kosz, jeśli planu od migracji nikt nie zmieniał (wersja = migracja)
// Reguła ogólna (lib/plany/migracja-rodzaj.ts). Zapis podnosi wersję planu – otwarty edytor dostanie konflikt (409).
// Wypisuje wyłącznie identyfikatory planów i liczby – bez nazwisk i napisów.
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { listaPlanow, wczytajPlan, wczytajUstawienia } from '../lib/plany/dane'
import { propozycjaRodzaju } from '../lib/plany/migracja-rodzaj'
import { RODZAJE_PLANU } from '../lib/plany/metadane'
import { katalog } from '../lib/plany/typy'

const zapisz = process.argv.includes('--zapisz'), cofnij = process.argv.includes('--cofnij')
const KATALOG = path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'content', 'plany')
const KOSZ = path.join(/*turbopackIgnore: true*/ KATALOG, '_kosz')
const ZNACZNIK = '-przed-rodzajem-'

async function zapiszAtomowo(plik: string, tresc: string) {
    const tmp = `${plik}.${randomBytes(4).toString('hex')}.tmp`
    await fs.promises.writeFile(tmp, tresc)
    await fs.promises.rename(tmp, plik)
}

async function wycofaj() {
    const kopie = (await fs.promises.readdir(KOSZ).catch(() => [] as string[])).filter((n) => n.includes(ZNACZNIK)).sort().reverse()
    const zrobione = new Set<string>()
    let n = 0
    for (const k of kopie) {
        const slug = k.slice(0, k.indexOf(ZNACZNIK))
        if (zrobione.has(slug)) continue
        zrobione.add(slug)
        const obecny = await wczytajPlan(slug)
        const stary = JSON.parse(await fs.promises.readFile(path.join(/*turbopackIgnore: true*/ KOSZ, k), 'utf8')) as { wersja?: number }
        if (!obecny || obecny.wersja !== (stary.wersja ?? 0) + 1) { console.log(`${slug}: pominięty – plan zmieniony po migracji (wersja ${obecny?.wersja ?? '—'}), cofnij ręcznie z ${k}`); continue }
        await zapiszAtomowo(path.join(/*turbopackIgnore: true*/ KATALOG, `${slug}.json`), JSON.stringify({ ...stary, wersja: obecny.wersja + 1, zmieniono: new Date().toISOString() }, null, 1))
        console.log(`${slug}: przywrócono stan sprzed migracji (wersja ${obecny.wersja + 1})`); n++
    }
    console.log(`\nCofnięto: ${n} plan(ów).`)
}

async function main() {
    if (cofnij) return wycofaj()
    const typy = katalog(await wczytajUstawienia())
    const plany = await listaPlanow()
    if (!plany.length) { console.log('Brak planów w content/plany.'); return }
    let doZmiany = 0
    for (const p of plany) {
        const r = propozycjaRodzaju(p, typy)
        console.log(`${p.slug} (wersja ${r.wersja}, widoczność ${p.widocznosc}): elementów ${r.elementow}, grobów ${r.grobow} → ${r.nowy ? RODZAJE_PLANU[r.nowy] : `bez zmian (${RODZAJE_PLANU[r.obecny!]})`}`)
        if (!r.nowy) continue
        doZmiany++
        if (!zapisz) continue
        const plik = path.join(/*turbopackIgnore: true*/ KATALOG, `${p.slug}.json`)
        await fs.promises.mkdir(KOSZ, { recursive: true })
        const kopia = path.join(/*turbopackIgnore: true*/ KOSZ, `${p.slug}${ZNACZNIK}${Date.now()}.json`)
        await fs.promises.copyFile(plik, kopia)
        // tylko jedno pole i wersja – reszta pliku bez zmian (bez przepisywania całego planu przez popraw)
        const surowy = JSON.parse(await fs.promises.readFile(plik, 'utf8')) as Record<string, unknown>
        await zapiszAtomowo(plik, JSON.stringify({ ...surowy, rodzaj: r.nowy, wersja: p.wersja + 1, zmieniono: new Date().toISOString() }, null, 1))
        const po = await wczytajPlan(p.slug)
        if (!po || po.rodzaj !== r.nowy || po.elementy.length !== p.elementy.length) {
            await fs.promises.copyFile(kopia, plik)
            throw new Error(`${p.slug}: kontrola po zapisie nie przeszła – przywrócono oryginał`)
        }
        console.log(`  ZAPISANO (wersja ${po.wersja}); oryginał: ${path.relative(process.cwd(), kopia)}`)
    }
    console.log(zapisz ? `\nGotowe: zmieniono ${doZmiany} plan(ów).`
        : `\nNic nie zapisano. ${doZmiany ? `Do zmiany: ${doZmiany} plan(ów) – zapis: npm run plany:rodzaj -- --zapisz` : 'Wszystkie plany mają rodzaj.'}`)
}

main().catch((e) => { console.error('BŁĄD:', e instanceof Error ? e.message : e); process.exit(1) })

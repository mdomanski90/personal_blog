// Migracja statusów grobów (etap 1, CEM-22) – uruchamiana ręcznie, NIE przy budowaniu.
//   npm run plany:statusy             – tylko liczy: ile grobów i jak zmieni status (nic nie zapisuje)
//   npm run plany:statusy -- --zapisz – zapisuje; oryginał każdego zmienionego planu trafia najpierw do content/plany/_kosz/
// Zapis podnosi numer wersji planu, więc otwarty edytor dostanie konflikt (409) zamiast nadpisać migrację starą wersją.
// Powtórne uruchomienie niczego nie zmienia.

import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { listaPlanow, wczytajPlan, wczytajUstawienia } from '../lib/plany/dane'
import { migrujPlan, raportStatusow } from '../lib/plany/statusy'
import { katalog } from '../lib/plany/typy'

const zapisz = process.argv.includes('--zapisz')
const KATALOG = path.resolve(process.cwd(), 'content', 'plany')

async function main() {
    const typy = katalog(await wczytajUstawienia())
    const plany = await listaPlanow()
    if (!plany.length) { console.log('Brak planów w content/plany.'); return }
    let doZmiany = 0
    for (const p of plany) {
        const r = raportStatusow(p, typy)
        console.log(`\n${p.slug} (wersja ${p.wersja}): grobów ${r.grobow}`)
        console.log(`  przed: ok ${r.przed.ok} · auto ${r.przed.auto} · przyp ${r.przed.przyp} · bez statusu ${r.przed.brak} · już po migracji ${r.przed.juz}`)
        console.log(`  po:    narysowany ${r.po.narysowany} · opracowany ${r.po.opracowany} · sprawdzony ${r.po.sprawdzony}`)
        for (const [k, n] of Object.entries(r.przejscia).sort()) console.log(`         ${k}: ${n}`)
        console.log(`  do zapisania: ${r.zmienione} element(ów)`)
        if (!r.zmienione) continue
        doZmiany++
        if (!zapisz) continue
        const plik = path.join(KATALOG, `${p.slug}.json`)
        const kosz = path.join(KATALOG, '_kosz')
        await fs.promises.mkdir(kosz, { recursive: true })
        const kopia = path.join(kosz, `${p.slug}-przed-statusami-${Date.now()}.json`)
        await fs.promises.copyFile(plik, kopia)
        const nowy = { ...migrujPlan(p, typy), wersja: p.wersja + 1, zmieniono: new Date().toISOString() }
        const { slug: _s, ...bezSluga } = nowy
        const tmp = `${plik}.${randomBytes(4).toString('hex')}.tmp`
        await fs.promises.writeFile(tmp, JSON.stringify({ slug: p.slug, ...bezSluga }, null, 1))
        await fs.promises.rename(tmp, plik)
        const po = await wczytajPlan(p.slug)
        const r2 = po ? raportStatusow(po, typy) : null
        if (!po || r2!.zmienione || po.elementy.length !== p.elementy.length) {
            await fs.promises.copyFile(kopia, plik)
            throw new Error(`${p.slug}: kontrola po zapisie nie przeszła – przywrócono oryginał`)
        }
        console.log(`  ZAPISANO (wersja ${po.wersja}); oryginał: ${path.relative(process.cwd(), kopia)}`)
    }
    console.log(zapisz
        ? `\nGotowe: zmieniono ${doZmiany} plan(ów).`
        : `\nNic nie zapisano. ${doZmiany ? `Do zmiany: ${doZmiany} plan(ów) – zapis: npm run plany:statusy -- --zapisz` : 'Wszystkie plany są już po migracji.'}`)
}

main().catch((e) => { console.error('BŁĄD:', e instanceof Error ? e.message : e); process.exit(1) })

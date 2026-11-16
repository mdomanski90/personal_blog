// Migracja numerów grobów (etap 2, CEM-21) – uruchamiana ręcznie, NIE przy budowaniu.
//   npm run plany:oznaczenia             – tylko liczy (nic nie zapisuje): ile grobów dostanie numer i u ilu czytelnik zobaczy inny numer niż dotąd
//   npm run plany:oznaczenia -- --zapisz – zapisuje; oryginał każdego zmienionego planu trafia najpierw do content/plany/_kosz/
// Numery = dotychczasowa numeracja z położenia, liczona z pełnego planu (tak, jak widział ją redaktor). Plan, który ma już
// choć jeden zapisany numer, jest pomijany – powtórne uruchomienie niczego nie zmienia; nowe groby numeruje się w edytorze.
// Zapis podnosi numer wersji planu, więc otwarty edytor dostanie konflikt (409) zamiast nadpisać migrację starą wersją.
// Wypisuje wyłącznie liczby i nazwy kwater – bez nazwisk i napisów.

import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { listaPlanow, wczytajPlan, wczytajUstawienia } from '../lib/plany/dane'
import { duplikaty, raportNumerow, zastosujNumery } from '../lib/plany/numeracja'
import { katalog } from '../lib/plany/typy'

const zapisz = process.argv.includes('--zapisz')
const KATALOG = path.resolve(process.cwd(), 'content', 'plany')

async function main() {
    const ust = await wczytajUstawienia(), typy = katalog(ust)
    const plany = await listaPlanow()
    if (!plany.length) { console.log('Brak planów w content/plany.'); return }
    let doZmiany = 0
    for (const p of plany) {
        const r = raportNumerow(p, typy, ust)
        console.log(`\n${p.slug} (wersja ${p.wersja}): grobów ${r.grobow}`)
        if (r.nazwyKwater.length) console.log(`  UWAGA: powtórzone nazwy kwater: ${r.nazwyKwater.join(', ')} – numery będą wyglądać tak samo w dwóch kwaterach; zmień nazwę w edytorze`)
        if (r.poMigracji) { console.log(`  już po migracji – bez numeru: ${r.bezNumeru} (nadaj w edytorze: „uzupełnij brakujące”)`); continue }
        console.log(`  numer dostanie: ${r.zmiany.length} grobów`)
        console.log(`  czytelnik publiczny zobaczy inny numer niż dotąd: ${r.inaczejPublicznie} · zalogowany bliski: ${r.inaczejBliscy} (luki po grobach dla niego niewidocznych)`)
        if (!r.zmiany.length) continue
        doZmiany++
        if (!zapisz) continue
        const plik = path.join(KATALOG, `${p.slug}.json`)
        const kosz = path.join(KATALOG, '_kosz')
        await fs.promises.mkdir(kosz, { recursive: true })
        const kopia = path.join(kosz, `${p.slug}-przed-numerami-${Date.now()}.json`)
        await fs.promises.copyFile(plik, kopia)
        const nowy = { ...p, elementy: zastosujNumery(p.elementy, r.zmiany), wersja: p.wersja + 1, zmieniono: new Date().toISOString() }
        const { slug: _s, ...bezSluga } = nowy
        void _s
        const tmp = `${plik}.${randomBytes(4).toString('hex')}.tmp`
        await fs.promises.writeFile(tmp, JSON.stringify({ slug: p.slug, ...bezSluga }, null, 1))
        await fs.promises.rename(tmp, plik)
        // kontrola po zapisie: plan się wczytuje, tyle samo elementów, każdy grób ma numer, bez powtórzeń; inaczej oryginał wraca
        const po = await wczytajPlan(p.slug)
        const r2 = po ? raportNumerow(po, typy, ust) : null
        if (!po || !r2!.poMigracji || r2!.bezNumeru || duplikaty(po).size || po.elementy.length !== p.elementy.length) {
            await fs.promises.copyFile(kopia, plik)
            throw new Error(`${p.slug}: kontrola po zapisie nie przeszła – przywrócono oryginał`)
        }
        console.log(`  ZAPISANO (wersja ${po.wersja}); oryginał: ${path.relative(process.cwd(), kopia)}`)
    }
    console.log(zapisz
        ? `\nGotowe: zmieniono ${doZmiany} plan(ów).`
        : `\nNic nie zapisano. ${doZmiany ? `Do zmiany: ${doZmiany} plan(ów) – zapis: npm run plany:oznaczenia -- --zapisz` : 'Wszystkie plany są już po migracji.'}`)
}

main().catch((e) => { console.error('BŁĄD:', e instanceof Error ? e.message : e); process.exit(1) })

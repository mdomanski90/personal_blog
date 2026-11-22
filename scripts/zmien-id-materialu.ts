// Decyzja 22.11: przeniesienie powiązań po zmianie identyfikatora materiału (gdy zmiana była przed tą łatką albo hak zapisu nie zadziałał).
// Użycie (z katalogu serwisu, jako użytkownik usługi):
//   sudo -u blog npm run zmien-id -- <stary> <nowy>            plan (nic nie zmienia)
//   sudo -u blog npm run zmien-id -- <stary> <nowy> --zapisz   wykonanie + kontrola strony (inaczej cofnięcie)
import { planZmianyIdMaterialu, wykonajZmianeId } from '../lib/panel/zmiana-id'

const [stary, nowy] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const zapisz = process.argv.includes('--zapisz')
const BAZA = (process.env.BAZA || 'http://127.0.0.1:3000').replace(/\/$/, '')
if (!stary || !nowy) { console.error('Użycie: npm run zmien-id -- <stary> <nowy> [--zapisz]'); process.exit(1) }

async function main() {
    const plan = await planZmianyIdMaterialu(process.cwd(), stary, nowy)
    console.log(`Zmiana identyfikatora materiału: ${stary} → ${nowy}`)
    for (const p of plan.przeniesienia) console.log(`  przeniesienie: ${p.z} → ${p.na}`)
    for (const e of plan.edycje) console.log(`  poprawka: ${e.plik} (${e.opis})`)
    for (const b of plan.bledy) console.log(`  BŁĄD: ${b}`)
    if (!plan.przeniesienia.length && !plan.edycje.length && !plan.bledy.length) { console.log('Nic do zrobienia.'); return }
    if (plan.bledy.length) { console.log('Nic nie zmieniono.'); process.exitCode = 1; return }
    if (!zapisz) { console.log('Podgląd – nic nie zmieniono. Wykonanie: dopisz --zapisz'); return }

    const w = await wykonajZmianeId(process.cwd(), plan)
    if (!w.ok) { console.error(w.komunikat); process.exitCode = 1; return }
    const kod = async (a: string) => (await fetch(BAZA + a, { redirect: 'manual', signal: AbortSignal.timeout(20000) }).catch(() => ({ status: 0 }))).status
    const k = { nowy: await kod(`/archiwum/${nowy}`), stary: await kod(`/archiwum/${stary}`), glowna: await kod('/') }
    // materiał „tylko ja” / „dla bliskich” daje publicznie 404 – sprawdzamy, że strona działa (główna 200) i nie ma błędu 500
    if (k.glowna !== 200 || k.nowy >= 500 || k.stary >= 500) {
        await w.cofnij?.()
        console.error(`Kontrola nieudana (główna ${k.glowna}, nowy ${k.nowy}, stary ${k.stary}) – cofnięto zmiany.`)
        process.exitCode = 1; return
    }
    console.log(`${w.komunikat}\nKontrola: główna ${k.glowna}, /archiwum/${nowy} ${k.nowy}, /archiwum/${stary} ${k.stary} (308 = przekierowanie; 404 – materiał niepubliczny).`)
}

main().catch((e) => { console.error(e); process.exitCode = 1 })

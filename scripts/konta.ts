// P7a (KON-01): konta – komendy właściciela na serwerze (w katalogu strony). Instrukcja: scripts/pocket-id/README.md
//
//   sudo grep '^STATIC_API_KEY=' /etc/pocket-id/pocket-id.env | npm run --silent konta:przygotuj
//       klient OIDC „odniepamieci.pl” w Pocket ID + ustawienia kont w .env.local (klucz API z wejścia, nie jest wyświetlany).
//       Ponowne uruchomienie niczego nie zmienia. Potem: sudo systemctl restart blog
//
//   sudo -u blog npx tsx scripts/konta.ts administrator <nazwa użytkownika Pocket ID> [--link]
//       pierwszy administrator panelu (konto z /setup) albo ratunek: konto dostaje rolę administratora i stan „aktywne”;
//       --link – jednorazowy link (ważny godzinę) do połączenia nowego urządzenia, gdy administrator stracił wszystkie klucze.
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { zmienKonta } from '../lib/konta/dane'
import { adresPolaczenia, kodJednorazowy, listaKlientow, listaOsob, zalozKlienta } from '../lib/konta/pocket-id'
import { ADRES_STRONY } from '../lib/strona'

const PLIK = path.join(process.cwd(), '.env.local')
const NAZWA_KLIENTA = 'odniepamieci.pl'

function czytajEnv(): Map<string, string> {
    const m = new Map<string, string>()
    for (const l of (fs.existsSync(PLIK) ? fs.readFileSync(PLIK, 'utf8') : '').split('\n')) { const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) m.set(l.slice(0, i).trim(), l.slice(i + 1).trim()) }
    return m
}
function zapiszEnv(zmiany: Record<string, string>) {
    const linie = (fs.existsSync(PLIK) ? fs.readFileSync(PLIK, 'utf8') : '').split('\n').filter((l) => l && !Object.keys(zmiany).some((k) => l.startsWith(`${k}=`)))
    for (const [k, v] of Object.entries(zmiany)) linie.push(`${k}=${v}`)
    fs.writeFileSync(PLIK, linie.join('\n') + '\n', { encoding: 'utf8', mode: 0o640 })
    fs.chmodSync(PLIK, 0o640)
    // strona działa jako inny użytkownik niż ten, który wpisuje polecenie – plik dostaje grupę katalogu content/ (jak npm run haslo)
    try { fs.chownSync(PLIK, -1, fs.statSync(path.join(process.cwd(), 'content')).gid) } catch { console.log('! Nie udało się ustawić grupy pliku – wpisz: sudo chgrp --reference=content .env.local') }
}
const wejscie = () => (process.stdin.isTTY ? '' : fs.readFileSync(0, 'utf8'))

async function przygotuj() {
    const env = czytajEnv()
    const zWejscia = /^STATIC_API_KEY=(\S{16,})$/m.exec(wejscie())?.[1]
    const kluczApi = zWejscia ?? env.get('KONTA_KLUCZ_API') ?? ''
    if (!kluczApi) throw new Error("Brak klucza API. Uruchom: sudo grep '^STATIC_API_KEY=' /etc/pocket-id/pocket-id.env | npm run --silent konta:przygotuj")
    const adres = env.get('KONTA_ADRES') ?? 'https://konto.odniepamieci.pl'
    const wewn = env.get('KONTA_ADRES_WEWN') ?? 'http://127.0.0.1:1411'
    const strona = env.get('KONTA_STRONA') ?? ADRES_STRONY
    const k = { wewn, kluczApi }
    const klienci = await listaKlientow(k)
    const zmiany: Record<string, string> = { KONTA_ADRES: adres, KONTA_ADRES_WEWN: wewn, KONTA_KLUCZ_API: kluczApi }
    const jest = klienci.find((c) => c.id === env.get('KONTA_KLIENT_ID'))
    if (jest && env.get('KONTA_KLIENT_SEKRET')) console.log(`Klient OIDC „${jest.name}” już jest – bez zmian.`)
    else {
        const stary = klienci.find((c) => c.name === NAZWA_KLIENTA)
        if (stary) throw new Error(`W Pocket ID jest już klient „${NAZWA_KLIENTA}”, ale w .env.local nie ma jego sekretu. Usuń go w Pocket ID (Administracja → Klienci OIDC) i uruchom komendę ponownie.`)
        const nowy = await zalozKlienta(k, NAZWA_KLIENTA, strona)
        zmiany.KONTA_KLIENT_ID = nowy.id; zmiany.KONTA_KLIENT_SEKRET = nowy.sekret
        console.log(`Założono klienta OIDC „${NAZWA_KLIENTA}” (powrót: ${strona}/api/konto/powrot).`)
    }
    if (!env.get('SEKRET_SESJI')) { zmiany.SEKRET_SESJI = randomBytes(32).toString('base64url'); console.log('Dodano SEKRET_SESJI (hasła „dla bliskich” nie było – zostaje wyłączone).') }
    zapiszEnv(zmiany)
    console.log(`Zapisano w .env.local: ${Object.keys(zmiany).join(', ')} (wartości nie są wyświetlane).`)
    console.log('Teraz: sudo systemctl restart blog, potem pierwszy administrator: sudo -u blog npx tsx scripts/konta.ts administrator <nazwa użytkownika z /setup>')
}

async function administrator(nazwa: string | undefined, link: boolean) {
    const env = czytajEnv()
    const k = { wewn: env.get('KONTA_ADRES_WEWN') ?? env.get('KONTA_ADRES') ?? '', kluczApi: env.get('KONTA_KLUCZ_API') ?? '', adres: env.get('KONTA_ADRES') ?? '' }
    if (!k.wewn || !k.kluczApi) throw new Error('Konta nie są przygotowane – najpierw npm run konta:przygotuj (scripts/pocket-id/README.md).')
    const osoby = (await listaOsob(k)).filter((o) => !o.username.startsWith('static-api-user'))
    const o = osoby.find((x) => x.username === nazwa)
    if (!o) throw new Error(`${nazwa ? `Nie ma użytkownika „${nazwa}” w Pocket ID.` : 'Podaj nazwę użytkownika Pocket ID.'} Dostępni: ${osoby.map((x) => x.username).join(', ') || '(nikt – najpierw /setup)'}`)
    let nowe = false
    zmienKonta((p) => {
        const x = p.konta.find((y) => y.id === o.id)
        if (x) { if (!x.role.includes('administrator')) x.role.push('administrator'); x.stan = 'aktywny'; delete x.zablokowano }
        // nowe konto: na co dzień redaktor z pełnymi uprawnieniami redakcyjnymi, administrator na żądanie (ponowne użycie klucza, 30 minut)
        else { nowe = true; p.konta.push({ id: o.id, imie: o.displayName || o.username, uzytkownik: o.username, role: ['redaktor', 'administrator'], dodane: ['publikowanie', 'usuwanie', 'operacje', 'zyjacy'], odebrane: [], zakres: { kregi: [], miejsca: [] }, stan: 'aktywny', utworzono: new Date().toISOString() }) }
        return p
    })
    console.log(nowe ? `Dodano konto „${o.displayName || o.username}”: redaktor (na co dzień, z publikowaniem, usuwaniem, operacjami i danymi osób żyjących) + administrator (na żądanie).` : `Konto „${o.displayName || o.username}” ma rolę administratora i jest aktywne.`)
    // godzina, nie kwadrans: przy ważności do 15 minut Pocket ID daje krótki kod do wpisania ręcznie, a nie link, który loguje od razu
    if (link) console.log(`Link awaryjny (jednorazowy, ważny godzinę) – otwórz na urządzeniu, które chcesz połączyć (telefon; Firefox na Linuksie obsługuje tylko klucze USB):\n${adresPolaczenia(k, await kodJednorazowy(k, o.id, 1))}`)
}

const [polecenie, ...reszta] = process.argv.slice(2).filter((a) => a !== '--')
const zadanie = polecenie === 'przygotuj' ? przygotuj() : polecenie === 'administrator' ? administrator(reszta.find((a) => !a.startsWith('--')), reszta.includes('--link')) : Promise.reject(new Error('Użycie: konta.ts przygotuj | administrator <nazwa użytkownika> [--link]'))
zadanie.catch((e: Error) => { console.error(e.message); process.exit(1) })

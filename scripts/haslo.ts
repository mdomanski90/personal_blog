// Ustawia (albo zmienia) hasło „dla bliskich” w pliku .env.local. Zmiana hasła wylogowuje wszystkich.
//
//   npm run haslo -- 'nowe hasło'
//   npm run haslo -- --wylacz       # wyłącza logowanie (usuwa hasło)
//
// Potem: sudo systemctl restart blog

import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { hashHasla } from '../lib/sesja'

const PLIK = path.join(process.cwd(), '.env.local')
const arg = process.argv.slice(2).find((a) => a !== '--')

if (!arg) {
    console.error("Podaj hasło: npm run haslo -- 'nowe hasło'   (albo --wylacz)")
    process.exit(1)
}
if (arg !== '--wylacz' && arg.length < 8) {
    console.error('Hasło powinno mieć co najmniej 8 znaków.')
    process.exit(1)
}

const stare = (fs.existsSync(PLIK) ? fs.readFileSync(PLIK, 'utf8') : '').split('\n').filter(Boolean)
// P7a (KON-01): SEKRET_SESJI podpisuje też sesje kont – gdy konta są przygotowane (KONTA_KLIENT_ID), sekret zostaje:
// zmiana hasła wylogowuje bliskich (ciasteczko zależy od skrótu hasła), ale nie konta, a „--wylacz” nie wyłącza kont.
const konta = stare.some((l) => l.startsWith('KONTA_KLIENT_ID='))
const linie = stare.filter((l) => !(konta ? /^HASLO_BLISKICH_HASH=/ : /^(HASLO_BLISKICH_HASH|SEKRET_SESJI)=/).test(l))
if (arg !== '--wylacz') {
    // w .env znak $ rozwija zmienne – skrót scrypt go nie zawiera (tylko litery, cyfry i dwukropki)
    linie.push(`HASLO_BLISKICH_HASH=${hashHasla(arg)}`)
    if (!linie.some((l) => l.startsWith('SEKRET_SESJI='))) linie.push(`SEKRET_SESJI=${randomBytes(32).toString('base64url')}`)
}
fs.writeFileSync(PLIK, linie.join('\n') + '\n', { encoding: 'utf8', mode: 0o640 })
fs.chmodSync(PLIK, 0o640)
// strona działa jako inny użytkownik niż ten, który wpisuje polecenie – plik dostaje grupę katalogu content/
try {
    fs.chownSync(PLIK, -1, fs.statSync(path.join(process.cwd(), 'content')).gid)
} catch {
    console.log('! Nie udało się ustawić grupy pliku – wpisz: sudo chgrp --reference=content .env.local')
}
console.log(arg === '--wylacz' ? 'Logowanie wyłączone.' : 'Hasło zapisane w .env.local (wszyscy zostaną wylogowani).')
console.log('Teraz: sudo systemctl restart blog')

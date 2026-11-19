// P7a: zaproszenia – link z naszej strony (/zaproszenie/<kod>) z kodem jednorazowym Pocket ID. W pliku kont jest tylko skrót kodu.
import { createHash } from 'node:crypto'
import type { Konto, PlikKont } from './model'

/** Zaproszenie ważne 7 dni (decyzja właściciela 19.11.2026 16:55); nowy link do klucza – tak samo. */
export const DNI_ZAPROSZENIA = 7
export const KOD = /^[A-Za-z0-9]{6,64}$/
export const skrotKodu = (kod: string) => createHash('sha256').update(kod).digest('hex')

/** Konto, do którego prowadzi kod z linku – tylko gdy link jeszcze ważny i konto nie jest zablokowane. */
export function kontoZKodu(plik: Pick<PlikKont, 'konta'>, kod: string, teraz = Date.now()): Konto | null {
    if (!KOD.test(kod)) return null
    const s = skrotKodu(kod)
    const k = plik.konta.find((x) => x.zaproszenie?.skrot === s)
    return k && k.stan !== 'zablokowany' && Date.parse(k.zaproszenie!.do) > teraz ? k : null
}

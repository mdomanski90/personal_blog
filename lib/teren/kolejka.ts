// P7b-2 (TER-06): praca w terenie bez internetu – czysta logika kolejki w telefonie (bez IndexedDB i sieci, testowana w npm test).
// Każda czynność i każde nowe miejsce najpierw trafia do kolejki; z siecią wysyłka idzie od razu, bez sieci czeka (decyzje 19.11:
// wysyłka przy otwartej aplikacji, bez wysyłki w tle; istniejących zdjęć grobów nie pobieramy; dane planu w telefonie do
// „usuń z telefonu”, wylogowania albo 30 dni bez otwarcia). Powtórki są bezpieczne – serwer rozpoznaje identyfikator czynności.
import type { Plan } from '../plany/model'
import type { UstawieniaPlanow } from '../plany/typy'
import { zastosujCzynnosc, type Czynnosc } from './czynnosci'

export type StanPozycji = 'czeka' | 'problem'

interface PozycjaWspolna {
    /** identyfikator czynności / nowego miejsca nadany w telefonie (ten sam przy każdej powtórce) */
    id: string
    /** konto, które zapisało pozycję – z innego konta nie wysyłamy (podpis „kto” musi się zgadzać) */
    konto: string
    czas: string
    stan: StanPozycji
    /** opis problemu prostym językiem (stan „problem”) */
    blad?: string
}
export interface PozycjaCzynnosci extends PozycjaWspolna {
    rodzaj: 'czynnosc'
    plan: string
    tytul: string
    numer?: string
    czynnosc: Czynnosc
}
export interface PozycjaMiejsca extends PozycjaWspolna {
    rodzaj: 'miejsce'
    pola: { rodzaj: string; nazwa: string; notatka: string; lat?: number; lon?: number; dokl?: number }
    zdjec: number
}
export type PozycjaKolejki = PozycjaCzynnosci | PozycjaMiejsca

/** Nazwa zdjęcia, które jeszcze czeka w telefonie – w planie pokazywane z pamięci telefonu, serwer nada własną. */
export const LOKALNE = 'lokalne-'
export const plikLokalny = (id: string) => `${LOKALNE}${id}.jpg`
export const czyLokalny = (plik: string) => plik.startsWith(LOKALNE)

export const DNI_W_TELEFONIE = 30

/** Co zrobić z odpowiedzią serwera na wysłaną pozycję. */
export type Ocena =
    | { co: 'wyslane' }
    | { co: 'ponow' }
    | { co: 'zaloguj' }
    | { co: 'problem'; blad: string }

/** `status` – kod odpowiedzi albo „siec” (brak połączenia, przerwane żądanie); `blad` – komunikat serwera. */
export function ocenOdpowiedz(status: number | 'siec', blad?: string): Ocena {
    if (status === 'siec' || status === 0 || status === 408 || status === 429 || status >= 500) return { co: 'ponow' }
    if (status >= 200 && status < 300) return { co: 'wyslane' }
    if (status === 401) return { co: 'zaloguj' }
    const powod: Record<number, string> = {
        403: 'Ten plan nie jest już przydzielony twojemu kontu albo konto nie ma tego uprawnienia.',
        404: 'Tego grobu albo planu nie ma już na serwerze.',
        409: 'Taki wpis już istnieje na serwerze.',
        413: 'Zdjęcie jest za duże.',
    }
    return { co: 'problem', blad: blad?.trim() || powod[status] || 'Serwer nie przyjął tej zmiany.' }
}

/** Kolejność wysyłki: od najstarszej, tylko czekające z bieżącego konta. */
export function doWyslania(L: PozycjaKolejki[], konto: string): PozycjaKolejki[] {
    return L.filter((p) => p.stan === 'czeka' && p.konto === konto).sort((a, b) => a.czas.localeCompare(b.czas) || a.id.localeCompare(b.id))
}

/** Pozycje innego konta zapisane w tym telefonie (np. po zmianie osoby) – nie wysyłamy, pokazujemy do usunięcia. */
export const cudze = (L: PozycjaKolejki[], konto: string) => L.filter((p) => p.konto !== konto)

/**
 * Plan, jaki widzi współpracownik: pobrany plan + jego czekające czynności, nałożone tą samą funkcją co na serwerze.
 * Zdjęcie czekające w telefonie dostaje nazwę lokalną (pokazywane z pamięci telefonu). Czynność, której nie da się
 * nałożyć (grobu już nie ma), jest pomijana – jej los rozstrzygnie wysyłka.
 */
export function zOczekujacymi(plan: Plan, L: PozycjaKolejki[], kto: { id: string; imie: string; pelne: boolean }, u: UstawieniaPlanow, teraz = new Date()): Plan {
    let p = plan
    for (const poz of L) {
        if (poz.rodzaj !== 'czynnosc' || poz.plan !== plan.slug || poz.konto !== kto.id) continue
        const cz: Czynnosc = poz.czynnosc.rodzaj === 'zdjecie' ? { ...poz.czynnosc, plik: plikLokalny(poz.id) } : poz.czynnosc
        const w = zastosujCzynnosc(p, cz, kto, u, teraz)
        if ('plan' in w) p = w.plan
    }
    return p
}

/** Dane planu w telefonie wygasają po 30 dniach bez otwarcia (decyzja 19.11, pyt. 3). */
export function wygaslo(otwarto: string, teraz = new Date(), dni = DNI_W_TELEFONIE): boolean {
    const t = Date.parse(otwarto)
    return !Number.isFinite(t) || teraz.getTime() - t > dni * 86400_000
}

/** Rozmiar do „pobierz do pracy bez internetu (12 MB)”. */
export function rozmiar(bajty: number): string {
    if (bajty < 1024 * 1024) return `${Math.max(1, Math.round(bajty / 1024))} kB`
    const mb = bajty / (1024 * 1024)
    return `${mb < 10 ? mb.toFixed(1).replace('.', ',') : Math.round(mb)} MB`
}

/** Wymiary zdjęcia zmniejszanego w telefonie: dłuższy bok najwyżej 2400 px (tak jak na serwerze), bez powiększania. */
export function wymiaryPoZmniejszeniu(szer: number, wys: number, maks = 2400): { szer: number; wys: number } {
    const k = Math.min(1, maks / Math.max(szer, wys, 1))
    return { szer: Math.max(1, Math.round(szer * k)), wys: Math.max(1, Math.round(wys * k)) }
}

/** Opis pozycji na liście „do wysłania” (tytuł i co to jest). */
export function opisPozycji(p: PozycjaKolejki, nazwaRodzaju: (k: string) => string): { tytul: string; opis: string } {
    if (p.rodzaj === 'miejsce') return { tytul: p.pola.nazwa || nazwaRodzaju(p.pola.rodzaj), opis: `nowe miejsce · zdjęcia: ${p.zdjec}` }
    const co = { zdjecie: 'zdjęcie', napis: 'napis z nagrobka', notatka: 'notatka', sprawdzony: '„sprawdzony”' }[p.czynnosc.rodzaj]
    return { tytul: `${p.tytul} · ${p.numer ?? 'grób bez numeru'}`, opis: co }
}

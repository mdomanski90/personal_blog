// P7a (KON-01): konta i uprawnienia – model i czyste reguły. Bez fs i bez sieci – plik wspólny dla serwera, panelu i testów.
// Pocket ID odpowiada tylko na pytanie „kim jesteś”; role, uprawnienia i zakres trzyma panel (content/_panel/konta.json).
// Decyzje właściciela 19.11.2026 (07:20, 09:04–09:38, 16:55): kilka ról na koncie, administrator na żądanie (najwyżej 30 minut),
// ostatniemu administratorowi nie można odebrać roli, „tylko ja” = osoby z rolą administratora.

import { odmiana } from '../tekst'
export type Uprawnienie =
    | 'bliscy' | 'panel'
    | 'wpisy' | 'miejsca' | 'archiwum' | 'biblioteka' | 'osoby' | 'plany' | 'slownik'
    | 'plany-teren' | 'teren'
    | 'publikowanie' | 'usuwanie' | 'operacje' | 'zgloszenia' | 'zyjacy' | 'administracja'

export interface OpisUprawnienia {
    klucz: Uprawnienie; nazwa: string
    /** dział treści – do zdania „Twoja rola (…) nie obejmuje działu …” i do wyboru działów w zaproszeniu */
    dzial?: boolean
    /** krótko, do zdania „możesz: …” na stronie „moje konto” */
    mozesz: string
}

export const UPRAWNIENIA: OpisUprawnienia[] = [
    { klucz: 'bliscy', nazwa: 'treści „dla bliskich” na stronie', mozesz: 'czytać treści „dla bliskich”' },
    { klucz: 'panel', nazwa: 'panel – oglądanie', mozesz: 'oglądać panel' },
    { klucz: 'wpisy', nazwa: 'wpisy i tematy', dzial: true, mozesz: 'wpisy i tematy' },
    { klucz: 'miejsca', nazwa: 'miejsca i obiekty', dzial: true, mozesz: 'miejsca i obiekty' },
    { klucz: 'archiwum', nazwa: 'archiwum', dzial: true, mozesz: 'archiwum' },
    { klucz: 'biblioteka', nazwa: 'biblioteka i księgi', dzial: true, mozesz: 'bibliotekę i księgi' },
    { klucz: 'osoby', nazwa: 'osoby i drzewo', dzial: true, mozesz: 'osoby i drzewo' },
    { klucz: 'plany', nazwa: 'plany – rysowanie i opis', dzial: true, mozesz: 'plany' },
    { klucz: 'slownik', nazwa: 'słownik', dzial: true, mozesz: 'słownik' },
    { klucz: 'plany-teren', nazwa: 'plany – zdjęcia grobów, napisy (wybrane plany)', mozesz: 'dodawać zdjęcia grobów i napisy na wybranych planach' },
    { klucz: 'teren', nazwa: '„w terenie” – nowe miejsca z telefonu', mozesz: 'zapisywać nowe miejsca z telefonu' },
    { klucz: 'publikowanie', nazwa: 'publikowanie („publiczne”)', mozesz: 'publikować' },
    { klucz: 'usuwanie', nazwa: 'usuwanie (do kosza)', mozesz: 'usuwać do kosza' },
    { klucz: 'operacje', nazwa: 'operacje: importy, zmiany zbiorcze, „połącz”', mozesz: 'wykonywać importy i zmiany zbiorcze' },
    { klucz: 'zgloszenia', nazwa: 'zgłoszenia', mozesz: 'obsługiwać zgłoszenia' },
    { klucz: 'zyjacy', nazwa: 'dane osób żyjących', mozesz: 'widzieć dane osób żyjących' },
    { klucz: 'administracja', nazwa: 'konta, kopie, ustawienia', mozesz: 'zarządzać kontami, kopiami i ustawieniami' },
]
const KLUCZE = new Set<string>(UPRAWNIENIA.map((u) => u.klucz))
export const jestUprawnieniem = (x: unknown): x is Uprawnienie => typeof x === 'string' && KLUCZE.has(x)
export const nazwaUprawnienia = (u: Uprawnienie) => UPRAWNIENIA.find((x) => x.klucz === u)?.nazwa ?? u
export const DZIALY = UPRAWNIENIA.filter((u) => u.dzial).map((u) => u.klucz)

export type KluczRoli = 'administrator' | 'redaktor' | 'teren' | 'podglad' | 'bliski'
export interface Rola { klucz: KluczRoli; nazwa: string; opis: string; uprawnienia: Uprawnienie[] }

/** Zestawy domyślne (plansza „role i uprawnienia”). Nazwy, opisy i zestawy – poza administratorem – można zmienić w panelu. */
export const ROLE_DOMYSLNE: Rola[] = [
    { klucz: 'administrator', nazwa: 'administrator', opis: 'wszystko, także konta, kopie i ustawienia', uprawnienia: UPRAWNIENIA.map((u) => u.klucz) },
    { klucz: 'redaktor', nazwa: 'redaktor', opis: 'treści, archiwum, plany, osoby, zgłoszenia', uprawnienia: ['bliscy', 'panel', 'wpisy', 'miejsca', 'archiwum', 'biblioteka', 'osoby', 'plany', 'slownik', 'plany-teren', 'teren', 'zgloszenia'] },
    { klucz: 'teren', nazwa: 'współpracownik terenowy', opis: 'nowe miejsca z telefonu, zdjęcia grobów i napisy na wybranych planach; widzi tylko „w terenie”', uprawnienia: ['bliscy', 'plany-teren', 'teren'] },
    { klucz: 'podglad', nazwa: 'podgląd', opis: 'widzi panel, niczego nie zmienia', uprawnienia: ['bliscy', 'panel'] },
    { klucz: 'bliski', nazwa: 'bliski', opis: 'czyta treści „dla bliskich” na stronie', uprawnienia: ['bliscy'] },
]
export const KLUCZE_ROL = ROLE_DOMYSLNE.map((r) => r.klucz)
export const jestRola = (x: unknown): x is KluczRoli => typeof x === 'string' && (KLUCZE_ROL as string[]).includes(x)

export type StanKonta = 'zaproszony' | 'aktywny' | 'zablokowany'
/** `plany` (P7b): plany, na których konto pracuje „w terenie” (uprawnienie „plany-teren” bez działu „plany”) */
export interface Zakres { kregi: string[]; miejsca: string[]; plany?: string[] }
export interface Konto {
    /** identyfikator osoby w Pocket ID (sub) – stały, nigdy nie pokazywany jako nazwa */
    id: string
    imie: string
    email?: string
    /** nazwa użytkownika w Pocket ID (do komend na serwerze) */
    uzytkownik?: string
    role: KluczRoli[]
    /** odstępstwa od ról: dodane i odebrane tylko tej osobie */
    dodane: Uprawnienie[]
    odebrane: Uprawnienie[]
    zakres: Zakres
    stan: StanKonta
    utworzono: string
    ostatnio?: string
    zaprosil?: string
    /** link do połączenia urządzenia: skrót kodu (sam kod jest tylko w linku) i termin */
    zaproszenie?: { skrot: string; do: string }
    /** sesje wydane wcześniej są nieważne („wyloguj ze wszystkich urządzeń”) */
    sesjeOd?: string
    zablokowano?: string
}
export type ZmianaRoli = { nazwa?: string; opis?: string; uprawnienia?: Uprawnienie[] }
export interface PlikKont { wersja: number; role: Partial<Record<KluczRoli, ZmianaRoli>>; konta: Konto[] }
export const PUSTY_PLIK: PlikKont = { wersja: 0, role: {}, konta: [] }

const tekst = (x: unknown, maks: number) => (typeof x === 'string' ? x.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maks) : '')
const lista = <T>(x: unknown, f: (v: unknown) => v is T): T[] => (Array.isArray(x) ? [...new Set(x.filter(f))] : [])
const napis = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200

/** Odczyt pliku kont z dowolnego JSON: nieznane role, uprawnienia i pola są pomijane (zły plik nie daje nikomu więcej, niż zapisano). */
export function odczytajPlik(j: unknown): PlikKont {
    if (!j || typeof j !== 'object') return { ...PUSTY_PLIK }
    const o = j as Record<string, unknown>
    const role: PlikKont['role'] = {}
    if (o.role && typeof o.role === 'object') for (const [k, v] of Object.entries(o.role as Record<string, unknown>)) {
        if (!jestRola(k) || !v || typeof v !== 'object') continue
        const r = v as Record<string, unknown>, z: ZmianaRoli = {}
        if (tekst(r.nazwa, 60)) z.nazwa = tekst(r.nazwa, 60)
        if (typeof r.opis === 'string') z.opis = tekst(r.opis, 200)
        if (Array.isArray(r.uprawnienia) && k !== 'administrator') z.uprawnienia = lista(r.uprawnienia, jestUprawnieniem).filter((u) => u !== 'administracja')
        role[k] = z
    }
    const konta: Konto[] = []
    for (const v of Array.isArray(o.konta) ? o.konta : []) {
        if (!v || typeof v !== 'object') continue
        const k = v as Record<string, unknown>
        const id = tekst(k.id, 100)
        if (!id || konta.some((x) => x.id === id)) continue
        const zakres = (k.zakres && typeof k.zakres === 'object' ? k.zakres : {}) as Record<string, unknown>
        const zap = (k.zaproszenie && typeof k.zaproszenie === 'object' ? k.zaproszenie : null) as Record<string, unknown> | null
        konta.push({
            id, imie: tekst(k.imie, 80) || 'bez imienia',
            ...(tekst(k.email, 120) ? { email: tekst(k.email, 120) } : {}),
            ...(tekst(k.uzytkownik, 80) ? { uzytkownik: tekst(k.uzytkownik, 80) } : {}),
            role: lista(k.role, jestRola),
            dodane: lista(k.dodane, jestUprawnieniem).filter((u) => u !== 'administracja'),
            odebrane: lista(k.odebrane, jestUprawnieniem),
            zakres: { kregi: lista(zakres.kregi, napis), miejsca: lista(zakres.miejsca, napis), ...(lista(zakres.plany, napis).length ? { plany: lista(zakres.plany, napis) } : {}) },
            stan: k.stan === 'aktywny' || k.stan === 'zablokowany' ? k.stan : 'zaproszony',
            utworzono: tekst(k.utworzono, 40) || new Date(0).toISOString(),
            ...(tekst(k.ostatnio, 40) ? { ostatnio: tekst(k.ostatnio, 40) } : {}),
            ...(tekst(k.zaprosil, 100) ? { zaprosil: tekst(k.zaprosil, 100) } : {}),
            ...(zap && /^[a-f0-9]{64}$/.test(String(zap.skrot)) && tekst(zap.do, 40) ? { zaproszenie: { skrot: String(zap.skrot), do: tekst(zap.do, 40) } } : {}),
            ...(tekst(k.sesjeOd, 40) ? { sesjeOd: tekst(k.sesjeOd, 40) } : {}),
            ...(tekst(k.zablokowano, 40) ? { zablokowano: tekst(k.zablokowano, 40) } : {}),
        })
    }
    return { wersja: Number.isInteger(o.wersja) && (o.wersja as number) >= 0 ? (o.wersja as number) : 0, role, konta }
}

/** Role po uwzględnieniu zmian z panelu. Administrator ma zawsze wszystko; „konta, kopie, ustawienia” ma tylko on. */
export function definicjeRol(plik: Pick<PlikKont, 'role'> | null | undefined): Rola[] {
    return ROLE_DOMYSLNE.map((r) => {
        const z = plik?.role?.[r.klucz]
        if (!z) return r
        return { klucz: r.klucz, nazwa: z.nazwa || r.nazwa, opis: z.opis ?? r.opis, uprawnienia: r.klucz === 'administrator' ? r.uprawnienia : (z.uprawnienia ?? r.uprawnienia).filter((u) => u !== 'administracja') }
    })
}
export const nazwaRoli = (role: Rola[], k: KluczRoli) => role.find((r) => r.klucz === k)?.nazwa ?? k

/** Role „na co dzień” (bez administratora) – z nich wynikają zwykłe uprawnienia konta. */
export const roleCodzienne = (k: Pick<Konto, 'role'>) => k.role.filter((r) => r !== 'administrator')
export const maRoleAdministratora = (k: Pick<Konto, 'role'>) => k.role.includes('administrator')

/** Uprawnienia z samych ról (kolumna „z roli” na karcie konta). */
export function uprawnieniaZRol(k: Pick<Konto, 'role'>, role: Rola[]): Set<Uprawnienie> {
    const s = new Set<Uprawnienie>()
    for (const r of roleCodzienne(k)) for (const u of role.find((x) => x.klucz === r)?.uprawnienia ?? []) if (u !== 'administracja') s.add(u)
    return s
}

/**
 * Uprawnienia konta w tej chwili. Na co dzień: role bez administratora + dodane − odebrane (nigdy „konta, kopie, ustawienia”).
 * Jako administrator (po ponownym użyciu klucza, najwyżej 30 minut): wszystko.
 * Konto zablokowane albo jeszcze niepołączone nie ma nic.
 */
export function uprawnieniaKonta(k: Konto, role: Rola[], jakoAdministrator = false): Set<Uprawnienie> {
    if (k.stan !== 'aktywny') return new Set()
    if (jakoAdministrator && maRoleAdministratora(k)) return new Set(UPRAWNIENIA.map((u) => u.klucz))
    const s = uprawnieniaZRol(k, role)
    for (const u of k.dodane) if (u !== 'administracja') s.add(u)
    for (const u of k.odebrane) s.delete(u)
    // sam administrator (bez roli na co dzień) poza trybem administratora tylko ogląda panel i czyta „dla bliskich”
    if (maRoleAdministratora(k)) { s.add('panel'); s.add('bliscy') }
    return s
}

/** „Tylko ja” w widoczności = osoby z rolą administratora (także gdy pracują w roli na co dzień). */
export const mozeTylkoJa = (k: Konto) => k.stan === 'aktywny' && maRoleAdministratora(k)

/** Ilu administratorów może się zalogować (aktywne konta z rolą administratora). */
export const liczbaAdministratorow = (plik: Pick<PlikKont, 'konta'>) => plik.konta.filter((k) => k.stan === 'aktywny' && maRoleAdministratora(k)).length

/**
 * Kontrola zmiany pliku kont: nie można zostać bez administratora (odebranie roli, zablokowanie albo usunięcie ostatniego).
 * Zwraca komunikat odmowy albo null.
 */
export function odmowaZmianyKont(przed: PlikKont, po: PlikKont): string | null {
    if (liczbaAdministratorow(przed) > 0 && liczbaAdministratorow(po) === 0)
        return 'To jedyne konto z rolą administratora. Najpierw nadaj tę rolę innej osobie – inaczej nikt nie odzyska dostępu do kont i ustawień.'
    for (const k of po.konta) {
        if (!k.role.length) return `Konto „${k.imie}” musi mieć co najmniej jedną rolę.`
        if (k.dodane.includes('administracja')) return 'Uprawnienie „konta, kopie, ustawienia” ma tylko rola administratora.'
    }
    return null
}

// ---------- opis słowny ----------
const wylicz = (L: string[]) => L.join(', ')

/** „redaktor: wpisy i tematy, miejsca i obiekty, archiwum” – do komunikatu odmowy (plansza „odmowa zapisu”). */
export function opisRoliZDzialami(k: Konto, role: Rola[], jakoAdministrator = false): string {
    const u = uprawnieniaKonta(k, role, jakoAdministrator)
    const nazwy = (jakoAdministrator && maRoleAdministratora(k) ? ['administrator'] : roleCodzienne(k).map((r) => nazwaRoli(role, r)))
    const dzialy = UPRAWNIENIA.filter((x) => x.dzial && u.has(x.klucz)).map((x) => x.nazwa)
    return `${nazwy.join(' + ') || 'bez roli na co dzień'}${dzialy.length ? `: ${wylicz(dzialy)}` : ''}`
}

/** „edytować wpisy i tematy, archiwum; publikować; obsługiwać zgłoszenia” – strona „moje konto”. */
export function opisMozesz(u: Set<Uprawnienie>): string {
    const dzialy = UPRAWNIENIA.filter((x) => x.dzial && u.has(x.klucz)).map((x) => x.mozesz)
    // „zdjęcia i napisy na wybranych planach” – tylko gdy konto nie edytuje planów w całości
    const reszta = UPRAWNIENIA.filter((x) => !x.dzial && x.klucz !== 'bliscy' && x.klucz !== 'panel' && !(x.klucz === 'plany-teren' && u.has('plany')) && u.has(x.klucz)).map((x) => x.mozesz)
    const czesci = [...(dzialy.length ? [`edytować ${wylicz(dzialy)}`] : []), ...reszta]
    if (czesci.length) return czesci.join('; ')
    if (u.has('panel')) return 'oglądać panel (bez zapisu)'
    return u.has('bliscy') ? 'czytać treści „dla bliskich”' : 'na razie nic – poproś o uprawnienia'
}

/** Kolumna „zakres” na liście kont. */
export function opisZakresu(k: Konto, role: Rola[], nazwyKregow: Record<string, string> = {}): string {
    if (maRoleAdministratora(k) && !roleCodzienne(k).length) return 'wszystko'
    const u = uprawnieniaKonta({ ...k, stan: 'aktywny' }, role)
    const dzialy = UPRAWNIENIA.filter((x) => x.dzial && u.has(x.klucz)).map((x) => x.nazwa.replace(' – rysowanie i opis', ''))
    const miejsce = [...k.zakres.kregi.map((id) => nazwyKregow[id] ?? `krąg ${id}`), ...k.zakres.miejsca]
    // konto tylko terenowe (bez żadnego działu): ile planów ma przydzielonych
    const teren = dzialy.length ? '' : u.has('plany-teren') ? `w terenie: ${k.zakres.plany?.length ? odmiana(k.zakres.plany.length, ['plan', 'plany', 'planów']) : 'żaden plan'}` : u.has('teren') ? 'w terenie: nowe miejsca' : ''
    const co = dzialy.length === DZIALY.length ? 'wszystkie działy' : dzialy.length ? wylicz(dzialy) : u.has('panel') ? 'cały panel (bez zapisu)' : teren ? '' : u.has('bliscy') ? 'treści „dla bliskich”' : '—'
    return [co, teren, miejsce.length ? wylicz(miejsce) : ''].filter(Boolean).join(' · ')
}

// ---------- trasy API panelu ----------
/**
 * Uprawnienia wymagane przez trasę /api/keystatic/… (wszystkie naraz). Odczyt = „panel”; zapis = dział.
 * Test lib/konta/model.test.ts sprawdza, że każda trasa i metoda z app/api/keystatic ma tu regułę.
 * Trasa zapisu Keystatic (…/update) sprawdza dodatkowo każdy plik (ocenZapis).
 */
export function uprawnieniaTrasy(sciezka: string, metoda: string): Uprawnienie[] | null {
    const p = sciezka.replace(/^\/api\/keystatic/, '').replace(/\/+$/, '') || '/'
    const m = metoda.toUpperCase()
    const odczyt = m === 'GET' || m === 'HEAD'
    const pasuje = (r: RegExp) => r.test(p)
    // konta, kopie, wygląd strony – tylko administrator (także odczyt: kopia zawiera wszystko, lista kont – dane osób)
    if (pasuje(/^\/panel\/(konta|kopia)(\/|$)/)) return ['administracja']
    if (pasuje(/^\/osoby\/eksport$/)) return ['administracja']
    // P7b (TER-01): teren. Zapis czynności i odczyt planu „dla terenu” – „plany-teren” (trasa sprawdza jeszcze listę planów konta);
    // plik planu – trasa sama sprawdza „panel” albo dostęp terenowy do tego planu; nowe miejsca – „teren”; reszta tras terenowych
    // wymaga tylko zalogowania, a trasa wydaje wyłącznie to, co wolno temu kontu (własne wpisy, własne plany).
    // P7c (TER-04): „utwórz obiekt…” ze skrzynki – podgląd i zapis: redakcja działu „miejsca i obiekty” (trasa sprawdza jeszcze „tylko ja”)
    if (pasuje(/^\/teren\/miejsca\/[^/]+\/obiekt$/)) return ['panel', 'miejsca']
    if (pasuje(/^\/plany\/[^/]+\/teren$/)) return ['plany-teren']
    if (pasuje(/^\/plany\/[^/]+\/plik\/[^/]+$/) && odczyt) return []
    if (pasuje(/^\/teren\/miejsca$/) && !odczyt) return ['teren']
    if (pasuje(/^\/teren\/miejsca\/[^/]+$/) && !odczyt) return ['miejsca']
    if (pasuje(/^\/teren\/zmiany$/) && !odczyt) return ['plany']
    if (pasuje(/^\/teren(\/|$)/) && odczyt) return []
    if (odczyt) return ['panel']
    if (pasuje(/^\/panel\/wyglad$/)) return ['administracja']
    if (pasuje(/^\/panel\/praca$/)) return ['panel'] // własne „przypięte” i „ostatnie”
    if (pasuje(/^\/(zgloszenia|plany\/zgloszenia|panel\/zgloszenia|panel\/jakosc)$/)) return ['zgloszenia']
    if (pasuje(/^\/panel\/(ksiegi-import|lista|polacz|operacje|historia)$/) || p === '/panel') return ['operacje']
    if (pasuje(/^\/plany(\/|$)/)) return m === 'DELETE' && pasuje(/^\/plany\/[^/]+$/) ? ['plany', 'usuwanie'] : ['plany']
    if (pasuje(/^\/osoby(\/|$)/)) return m === 'DELETE' ? ['osoby', 'usuwanie'] : ['osoby']
    if (pasuje(/^\/materialy(\/|$)/)) return ['archiwum']
    return null
}

// ---------- zapis treści (Keystatic) ----------
const DZIAL_KATALOGU: Record<string, Uprawnienie> = {
    posts: 'wpisy', tematy: 'wpisy', miejsca: 'miejsca', obiekty: 'miejsca',
    materialy: 'archiwum', zbiory: 'archiwum', strony: 'archiwum',
    publikacje: 'biblioteka', parafie: 'biblioteka', ksiegi: 'biblioteka', zespoly: 'biblioteka',
    hasla: 'slownik', biogramy: 'osoby', osoby: 'osoby', plany: 'plany',
}
/** Dział pliku zapisywanego przez Keystatic. Wszystko, czego nie znamy (ustawienia, strony serwisu) – „konta, kopie, ustawienia”. */
export function dzialSciezki(rel: string): Uprawnienie {
    const c = rel.split('/')
    if (c[0] === 'content') return DZIAL_KATALOGU[c[1]] ?? 'administracja'
    if (c[0] === 'public' && c[1] === 'images') return DZIAL_KATALOGU[c[2]] ?? 'administracja'
    if (c[0] === 'pliki-archiwum') return c[1] === 'obiekty' ? 'miejsca' : 'archiwum'
    return 'administracja'
}

/** To, co reguły muszą wiedzieć o pliku treści (z nagłówka pliku): widoczność i przypisane miejscowości. */
export interface MetaPliku { widocznosc: string | null; miejsca: string[] }
export interface PlikZapisu { sciezka: string; przed: MetaPliku | null; po: MetaPliku | null }
export interface KtoZapisuje { uprawnienia: Set<Uprawnienie>; zakres: Zakres; tylkoJa: boolean; opisRoli: string }

/** Czy miejscowości pliku mieszczą się w zakresie konta. Pusty zakres = bez ograniczeń; plik bez miejscowości – decyduje dział. */
export function wZakresie(zakres: Zakres, miejscaPliku: string[], miejscaKregow: (kragId: string) => string[]): boolean {
    if (!zakres.kregi.length && !zakres.miejsca.length) return true
    if (!miejscaPliku.length) return true
    const dozwolone = new Set([...zakres.miejsca, ...zakres.kregi.flatMap(miejscaKregow)])
    return miejscaPliku.some((m) => dozwolone.has(m))
}

/**
 * Ocena zapisu Keystatic: każdy plik osobno, pierwsza odmowa zatrzymuje cały zapis (nic nie zmieniono).
 * Zwraca komunikat prostym językiem (plansza „odmowa zapisu”) albo null.
 */
export function ocenZapis(kto: KtoZapisuje, pliki: PlikZapisu[], miejscaKregow: (kragId: string) => string[] = () => []): string | null {
    const odmowa = (co: string) => `Zapis wstrzymany. ${co} Nic nie zmieniono – poproś administratora o uprawnienie.`
    for (const p of pliki) {
        const dzial = dzialSciezki(p.sciezka)
        if (!kto.uprawnienia.has(dzial)) {
            return dzial === 'administracja'
                ? odmowa('Ustawienia i strony serwisu zmienia tylko administrator (przełącz rolę w menu pod swoim imieniem).')
                : odmowa(`Twoja rola (${kto.opisRoli}) nie obejmuje działu „${nazwaUprawnienia(dzial).replace(' – rysowanie i opis', '')}”.`)
        }
        if (p.po === null && !kto.uprawnienia.has('usuwanie')) return odmowa('Twoja rola nie obejmuje usuwania (do kosza).')
        const ja = p.przed?.widocznosc === 'ja' || p.po?.widocznosc === 'ja'
        if (ja && !kto.tylkoJa) return odmowa('Ta pozycja ma widoczność „tylko ja” – zmienia ją tylko administrator.')
        const publikuje = p.po?.widocznosc === 'publiczne' && p.przed?.widocznosc !== 'publiczne' && p.po.widocznosc !== null
        if (publikuje && !kto.uprawnienia.has('publikowanie')) return odmowa('Twoja rola nie obejmuje publikowania – zapisz pozycję jako „dla bliskich” albo poproś o publikację.')
        for (const meta of [p.przed, p.po]) {
            if (meta && !wZakresie(kto.zakres, meta.miejsca, miejscaKregow)) return odmowa('Ta pozycja dotyczy miejscowości spoza Twojego zakresu.')
        }
    }
    return null
}

// ---------- menu panelu ----------
/** Uprawnienie potrzebne, żeby pozycja menu panelu miała sens (klucze z lib/panel/menu.ts). Brak wpisu = wystarczy „panel”. */
const MENU_UPRAWNIENIE: Record<string, Uprawnienie> = {
    zgloszenia: 'zgloszenia', osoby: 'osoby',
    posts: 'wpisy', tematy: 'wpisy', miejsca: 'miejsca', obiekty: 'miejsca', biogramy: 'osoby', polacz: 'operacje',
    materialy: 'archiwum', zbiory: 'archiwum', 'strony-skanow': 'archiwum',
    publikacje: 'biblioteka', parafie: 'biblioteka', ksiegi: 'biblioteka', zespoly: 'biblioteka', 'ksiegi-import': 'operacje', 'raport-ksiag': 'biblioteka',
    hasla: 'slownik',
    stronaGlowna: 'administracja', wstepyDzialow: 'administracja', oProjekcie: 'administracja',
    'plany-cmentarz': 'plany', 'plany-historyczny': 'plany', 'plany-schemat': 'plany', 'plany-typy': 'plany',
    dostep: 'administracja', wyglad: 'administracja', menuPanelu: 'administracja', kregiStopka: 'administracja', przekierowania: 'administracja',
    system: 'administracja', operacje: 'operacje', szablony: 'administracja', wzorce: 'administracja',
}
/** Czy pozycja menu jest dla tego konta. Rola „podgląd” (bez żadnego działu) widzi wszystkie działy treści – tylko bez zapisu. */
export function pozycjaMenuDlaKonta(klucz: string, u: Set<Uprawnienie>): boolean {
    // P7b: „w terenie” – konta z uprawnieniami terenowymi; „z terenu” – redakcja skrzynki (miejsca) albo planów
    if (klucz === 'w-terenie') return maTeren(u)
    if (klucz === 'z-terenu') return u.has('panel') && (u.has('miejsca') || u.has('plany'))
    const w = MENU_UPRAWNIENIE[klucz]
    if (!w) return u.has('panel')
    if (u.has(w)) return true
    const maDzial = DZIALY.some((d) => u.has(d))
    return !maDzial && u.has('panel') && (DZIALY as string[]).includes(w)
}

/** P7b: czy konto ma cokolwiek „w terenie” (wejście na /keystatic/teren). */
export const maTeren = (u: Set<Uprawnienie>) => u.has('teren') || u.has('plany-teren')
/** P7b: czy konto pracuje „w terenie” na tym planie: dział „plany” – na każdym; samo „plany-teren” – tylko na planach z listy konta. */
export function planWTerenie(u: Set<Uprawnienie>, zakres: Zakres, slug: string): boolean {
    if (!u.has('plany-teren')) return false
    return u.has('plany') || !!zakres.plany?.includes(slug)
}
/**
 * P7b: dokąd odesłać konto ze strony panelu (null = wolno wejść). Strony terenowe – dla kont z „teren” / „plany-teren”;
 * reszta panelu – „panel” (konto tylko terenowe widzi wyłącznie „w terenie”), strony ustawień – „administracja”.
 */
export function celStronyPanelu(sciezka: string, u: Set<Uprawnienie>): string | null {
    if (/^\/keystatic\/teren(\/|$)/.test(sciezka)) return maTeren(u) ? null : u.has('panel') ? '/keystatic/panel' : '/moje-konto?panel=brak'
    if (!u.has('panel')) return maTeren(u) ? '/keystatic/teren' : '/moje-konto?panel=brak'
    return u.has(uprawnienieStrony(sciezka)) ? null : '/keystatic/panel?odmowa=administrator'
}

/** Strona panelu (ścieżka) → uprawnienie do jej otwarcia; reszta panelu – „panel”. */
export function uprawnienieStrony(sciezka: string): Uprawnienie {
    if (/^\/keystatic\/panel\/(dostep|wyglad|system|szablony|wzorce)(\/|$)/.test(sciezka)) return 'administracja'
    if (/^\/keystatic\/singleton\/(menuPanelu|kregiStopka|przekierowania|stronaGlowna|wstepyDzialow|oProjekcie)(\/|$)/.test(sciezka)) return 'administracja'
    return 'panel'
}

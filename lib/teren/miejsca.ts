// P7b (TER-01): „nowe miejsce” z telefonu – wpis do skrzynki „z terenu” (decyzja 19.11: nie od razu obiekt).
// Czysta logika: kształt wpisu, rodzaje („co to jest”), najbliższa miejscowość z odległością i kierunkiem.

/** „Co to jest” – krótka lista na telefon; redakcja wybiera właściwy rodzaj obiektu przy opracowaniu. */
export const RODZAJE_TERENU: [string, string][] = [
    ['krzyz', 'krzyż przydrożny'], ['kapliczka', 'kapliczka, figura'], ['grob', 'grób, mogiła'], ['cmentarz', 'cmentarz'],
    ['budynek', 'budynek'], ['slad', 'ślad po budynku, fundamenty'], ['pomnik', 'pomnik, tablica'], ['inne', 'coś innego'],
]
export const nazwaRodzajuTerenu = (k: string) => RODZAJE_TERENU.find(([x]) => x === k)?.[1] ?? 'coś innego'

export type StanMiejsca = 'nowe' | 'opracowane' | 'odrzucone'
export interface ZdjecieTerenu { plik: string; szer: number; wys: number }
export interface MiejsceTerenu {
    /** identyfikator nadany w telefonie – ponowna wysyłka nie tworzy drugiego wpisu */
    id: string
    czas: string
    kto: string
    imie: string
    rodzaj: string
    nazwa: string
    notatka: string
    /** położenie z telefonu (tylko w panelu; zdjęcia zapisane bez danych GPS – zasada 1.8) */
    lat?: number
    lon?: number
    /** dokładność położenia w metrach */
    dokl?: number
    /** najbliższa miejscowość w chwili zapisu */
    blisko?: { id: string; nazwa: string; km: number; kierunek: string }
    zdjecia: ZdjecieTerenu[]
    stan: StanMiejsca
    /** co redakcja z tym zrobiła (np. „obiekt: krzyż w Testowie”) */
    opis?: string
    rozstrzygnal?: string
    rozstrzygnieto?: string
}

export const ID_MIEJSCA = /^[A-Za-z0-9_-]{8,64}$/
const czysc = (x: unknown, maks: number) => (typeof x === 'string' ? x.normalize('NFC').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, maks) : '')
const liczba = (x: unknown, min: number, maks: number, miejsc = 6) => { const n = typeof x === 'string' && x.trim() ? Number(x) : x; return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= maks ? +n.toFixed(miejsc) : undefined }

/** Pola nowego miejsca z formularza telefonu; zwraca je albo zdanie o błędzie. Wymagane: zdjęcie albo nazwa (sprawdza trasa). */
export function odczytajNoweMiejsce(o: Record<string, unknown>): Pick<MiejsceTerenu, 'id' | 'rodzaj' | 'nazwa' | 'notatka' | 'lat' | 'lon' | 'dokl'> | string {
    const id = typeof o.id === 'string' ? o.id : ''
    if (!ID_MIEJSCA.test(id)) return 'Wpis bez identyfikatora.'
    const rodzaj = RODZAJE_TERENU.some(([k]) => k === o.rodzaj) ? (o.rodzaj as string) : 'inne'
    const lat = liczba(o.lat, -90, 90), lon = liczba(o.lon, -180, 180), dokl = liczba(o.dokl, 0, 100000, 0)
    return { id, rodzaj, nazwa: czysc(o.nazwa, 120), notatka: czysc(o.notatka, 2000), ...(lat !== undefined && lon !== undefined ? { lat, lon, ...(dokl !== undefined ? { dokl } : {}) } : {}) }
}

/** Wpis z pliku (dowolny JSON) – złe pola pomijane. */
export function odczytajMiejsce(j: unknown): MiejsceTerenu | null {
    if (!j || typeof j !== 'object') return null
    const o = j as Record<string, unknown>
    const p = odczytajNoweMiejsce(o)
    if (typeof p === 'string') return null
    const b = (o.blisko && typeof o.blisko === 'object' ? o.blisko : null) as Record<string, unknown> | null
    const zdjecia = (Array.isArray(o.zdjecia) ? o.zdjecia : []).flatMap((z): ZdjecieTerenu[] => {
        const x = z as Record<string, unknown>
        return x && typeof x.plik === 'string' && /^[\w-]+(\.[\w-]+)*$/.test(x.plik) ? [{ plik: x.plik, szer: Number(x.szer) || 0, wys: Number(x.wys) || 0 }] : []
    })
    return {
        ...p, czas: czysc(o.czas, 40) || new Date(0).toISOString(), kto: czysc(o.kto, 100), imie: czysc(o.imie, 80) || 'bez imienia', zdjecia,
        ...(b && czysc(b.nazwa, 120) ? { blisko: { id: czysc(b.id, 120), nazwa: czysc(b.nazwa, 120), km: Number(b.km) || 0, kierunek: czysc(b.kierunek, 20) } } : {}),
        stan: o.stan === 'opracowane' || o.stan === 'odrzucone' ? o.stan : 'nowe',
        ...(czysc(o.opis, 300) ? { opis: czysc(o.opis, 300) } : {}),
        ...(czysc(o.rozstrzygnal, 100) ? { rozstrzygnal: czysc(o.rozstrzygnal, 100) } : {}),
        ...(czysc(o.rozstrzygnieto, 40) ? { rozstrzygnieto: czysc(o.rozstrzygnieto, 40) } : {}),
    }
}

// ---------- najbliższa miejscowość ----------
const R = 6371
const rad = (x: number) => (x * Math.PI) / 180
/** Odległość po kuli w kilometrach. */
export function odlegloscKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dφ = rad(lat2 - lat1), dλ = rad(lon2 - lon1)
    const a = Math.sin(dφ / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dλ / 2) ** 2
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}
const KIERUNKI = ['płn.', 'płn.-wsch.', 'wsch.', 'płd.-wsch.', 'płd.', 'płd.-zach.', 'zach.', 'płn.-zach.']
/** W którą stronę od miejscowości leży punkt: „płn.-wsch.”. */
export function kierunek(odLat: number, odLon: number, lat: number, lon: number): string {
    const y = Math.sin(rad(lon - odLon)) * Math.cos(rad(lat)), x = Math.cos(rad(odLat)) * Math.sin(rad(lat)) - Math.sin(rad(odLat)) * Math.cos(rad(lat)) * Math.cos(rad(lon - odLon))
    const kat = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
    return KIERUNKI[Math.round(kat / 45) % 8]
}
export interface PunktMiejscowosci { id: string; nazwa: string; lat: number; lon: number }
/** Najbliższa miejscowość do punktu (do 30 km) z odległością i kierunkiem od niej. */
export function najblizszaMiejscowosc(lat: number, lon: number, miejscowosci: PunktMiejscowosci[]): MiejsceTerenu['blisko'] | undefined {
    let n: PunktMiejscowosci | null = null, d = Infinity
    for (const m of miejscowosci) { const x = odlegloscKm(m.lat, m.lon, lat, lon); if (x < d) { d = x; n = m } }
    if (!n || d > 30) return undefined
    return { id: n.id, nazwa: n.nazwa, km: +d.toFixed(d < 10 ? 1 : 0), kierunek: d < 0.05 ? '' : kierunek(n.lat, n.lon, lat, lon) }
}
/** „Testowo (0,4 km na płn.-wsch.)” */
export function opisBlisko(b: NonNullable<MiejsceTerenu['blisko']>): string {
    return b.kierunek ? `${b.nazwa} (${String(b.km).replace('.', ',')} km na ${b.kierunek})` : b.nazwa
}

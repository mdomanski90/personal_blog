// Objaśnienia na skanach – część wspólna dla serwera i przeglądarki (bez dostępu do plików).

export type RodzajObjasnienia = 'odczyt' | 'tlumaczenie' | 'objasnienie' | 'pieczec'
export type WidocznoscObjasnienia = 'publiczne' | 'bliscy' | 'ja'

/** Rodzaj → nazwa na stronie i „purpose” ciała adnotacji W3C. */
export const RODZAJE_OBJASNIEN: Record<RodzajObjasnienia, { nazwa: string; cel: string; opis: string }> = {
    odczyt: { nazwa: 'odczyt', cel: 'transcribing', opis: 'tekst dosłownie, z zachowaniem pisowni; luki w nawiasach […]' },
    tlumaczenie: { nazwa: 'tłumaczenie', cel: 'translating', opis: 'przekład na polski' },
    objasnienie: { nazwa: 'objaśnienie', cel: 'commenting', opis: 'co to jest, kto, co znaczy skrót' },
    pieczec: { nazwa: 'pieczęć', cel: 'identifying', opis: 'pieczęć, stempel, podpis, znak' },
}
/** Języki tekstu – kod BCP 47 (jak wymaga W3C) → nazwa. */
export const JEZYKI: Record<string, string> = {
    pl: 'polski', la: 'łacina', ru: 'rosyjski', uk: 'ukraiński', be: 'białoruski', cu: 'cerkiewnosłowiański',
    de: 'niemiecki', yi: 'jidysz', he: 'hebrajski', fr: 'francuski',
}
/** Objaśnienie przygotowane dla czytelnika (lib/archiwum objasnieniaDoWidoku). */
export interface ObjasnienieWidoku {
    id: string
    /** numer strony w przeglądarce (od 0) */
    strona: number
    x: number
    y: number
    w: number
    h: number
    rodzaj: RodzajObjasnienia
    tekst: string
    /** nazwa języka */
    jezyk?: string
    powiazania: { nazwa: string; adres: string }[]
    opracowal: string
    weryfikacja?: string
}

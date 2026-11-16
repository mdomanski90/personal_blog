// „Jak cytować” – wspólne dane dla wszystkich kart (uwaga właściciela 16.11: ta sama część tabeli karty wszędzie,
// także tam, gdzie jej wcześniej nie było). Opis cytatu i pliki BibTeX / RIS składa komponent JakCytowac.
import { ADRES_STRONY, AUTOR_STRONY } from './strona'

export interface DaneCytatu { tytul: string; adres: string; opracowal: string; autor?: string; rok?: string; oryginal?: string; rodzaj?: string; /** KAT-03: nr kat.; adres wtedy = stały adres /k/NR */ nrKat?: string | null }

/** Dane cytatu karty: stały adres /k/NR, gdy karta ma numer katalogowy, inaczej adres strony (ścieżka od „/”). */
export function daneCytatu(o: { tytul: string; sciezka: string; nrKat?: string | null; rodzaj: string; opracowal?: string; autor?: string; rok?: string; oryginal?: string }): DaneCytatu {
    return {
        tytul: o.tytul,
        adres: o.nrKat ? `${ADRES_STRONY}/k/${o.nrKat}` : `${ADRES_STRONY}${o.sciezka}`,
        opracowal: o.opracowal || AUTOR_STRONY,
        rodzaj: o.rodzaj,
        ...(o.nrKat ? { nrKat: o.nrKat } : {}),
        ...(o.autor ? { autor: o.autor } : {}),
        ...(o.rok ? { rok: o.rok } : {}),
        ...(o.oryginal ? { oryginal: o.oryginal } : {}),
    }
}

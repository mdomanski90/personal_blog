// PH-23: opis planu na listach (pozycja w karcie z miniaturą, siatka „wszystkie plany”). Czyste funkcje – bez plików.
// Liczy z planu W WERSJI DLA CZYTELNIKA (lib/plany/serwer.ts) – liczby nie zdradzają elementów ukrytych.
import type { Plan } from './model'
import { typGrobu, type TypElementu } from './typy'
import { DOKLADNOSCI, RODZAJE_PLANU, RODZAJE_ZRODLA, planGrobowy, rodzajPlanu } from './metadane'
import { formatujEdtf } from '../edtf'
import { odmiana } from '../tekst'

/**
 * Adres planu: plan zrekonstruowany ze skanu ma jedną stronę – materiał w archiwum (jeden widok dokumentu, decyzja 16.11),
 * o ile czytelnik widzi ten materiał; inaczej strona planu jak dotąd.
 */
export const adresPlanu = (p: Pick<Plan, 'slug' | 'zrodlo'>, widoczneMaterialy: ReadonlySet<string> = new Set()) =>
    p.zrodlo?.material && widoczneMaterialy.has(p.zrodlo.material) ? `/archiwum/${p.zrodlo.material}#warstwa-rekonstrukcji` : `/plany/${p.slug}`

export interface OpisPlanu { prawa: string; linia: string; pola: [string, string][] }

export function opisPlanu(p: Plan, typy: Map<string, TypElementu>): OpisPlanu {
    const groby = planGrobowy(p) ? p.elementy.filter((e) => typGrobu(typy.get(e.typ))).length : 0
    const okres = p.okres ? formatujEdtf(p.okres) : ''
    const zawartosc = groby ? odmiana(groby, ['grób', 'groby', 'grobów']) : odmiana(p.elementy.length, ['element', 'elementy', 'elementów'])
    const zrodlo = [p.rodzajZrodla && RODZAJE_ZRODLA[p.rodzajZrodla], p.tworca].filter(Boolean).join(' · ')
    const pola: [string, string][] = [
        ['rodzaj', RODZAJE_PLANU[rodzajPlanu(p)]],
        ['stan przedstawiony', okres],
        ['sporządzono', p.sporzadzono ? formatujEdtf(p.sporzadzono) : ''],
        ['źródło', zrodlo],
        ['dokładność', p.dokladnosc ? DOKLADNOSCI[p.dokladnosc] : ''],
        ['zasięg', p.zasieg ?? ''],
        ['na planie', zawartosc],
    ]
    return { prawa: okres || zawartosc, linia: [RODZAJE_PLANU[rodzajPlanu(p)].split(' (')[0], okres].filter(Boolean).join(' · '), pola: pola.filter(([, v]) => v) }
}

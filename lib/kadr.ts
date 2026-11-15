/** P7C-3 (JV-20): pole „Kadr miniatury” → object-position. Bez automatycznego przycinania – decyduje redaktor. */
const POZYCJE: Record<string, string> = { srodek: '50% 50%', gora: '50% 15%', dol: '50% 85%', lewa: '15% 50%', prawa: '85% 50%' }
export const pozycjaKadru = (k?: string | null): string => POZYCJE[k ?? ''] ?? POZYCJE.srodek

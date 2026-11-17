/**
 * P1 · UX-05: komunikat błędu zgłoszenia – mówi, co się stało i co zrobić; 429 (limit) i 400 (treść) nie wyglądają jak brak internetu.
 * Czysta funkcja (test: lib/zgloszenie-blad.test.ts); używa jej app/components/Zgloszenie.tsx.
 */
export interface KomunikatBledu { tytul: string; tresc: string; /** pole formularza, którego dotyczy błąd (aria-invalid + fokus) */ pole?: 'tresc' }

/** `status` = kod HTTP odpowiedzi albo null, gdy odpowiedzi nie było (brak sieci). */
export function komunikatBleduZgloszenia(status: number | null): KomunikatBledu {
    if (status === null) return { tytul: 'nie udało się wysłać zgłoszenia.', tresc: 'Sprawdź połączenie z internetem i spróbuj ponownie – treść zostaje w polu.' }
    if (status === 429) return { tytul: 'osiągnięto limit zgłoszeń.', tresc: 'Do redakcji trafiło ostatnio dużo zgłoszeń. Spróbuj ponownie później – treść zostaje w polu, możesz ją skopiować.' }
    if (status === 400) return { tytul: 'zgłoszenie odrzucone.', tresc: 'Sprawdź treść zgłoszenia: wpisz co najmniej kilka znaków (do 4000) i spróbuj ponownie – treść zostaje w polu.', pole: 'tresc' }
    return { tytul: 'serwis nie przyjął zgłoszenia.', tresc: 'Po stronie serwisu coś poszło nie tak. Spróbuj ponownie za chwilę – treść zostaje w polu.' }
}

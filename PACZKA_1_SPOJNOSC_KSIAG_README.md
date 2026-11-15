# Paczka 1 – spójność ksiąg, wyszukiwarka, diagnostyka

Stan: **łatka przygotowana, niepotwierdzona na VPS**. Bazuje na kodzie `main` z 14.11.2026.

## Działanie
- Jeden uniwersalny algorytm `ksiegaDotyczyMiejsca`: bez wyjątków dla nazw, slugów, sygnatur czy konkretnych wsi; jawne przypisanie ma pierwszeństwo, pośrednie wymaga pokrycia dat i przynajmniej jednej granicy przynależności.
- Karta miejscowości i filtr biblioteki korzystają z tej samej reguły.
- Wyszukiwarka ogólna obejmuje księgi metrykalne (także sygnatury tomów), parafie/urzędy i hasła słownika. Podpowiedzi korzystają z istniejącego mechanizmu.
- Wynik księgi prowadzi do jej wiersza `#ksiega-<slug>` w bibliotece. Nie tworzono jeszcze samodzielnych kart ksiąg.
- `npx tsx scripts/sprawdz-powiazania-ksieg.ts` raportuje uszkodzone slugi i niewiadome okresy, bez zmiany plików.

## Ważne ograniczenia
- Samo dopisanie kodu nie odtworzy powiązań utraconych przy zmianie identyfikatora w Keystatic. Naprawiasz je w edytorze na podstawie raportu.
- Jeżeli księga nie ma bezpośredniego przypisania do wsi, a daty przynależności są zupełnie nieznane, nie uznajemy automatycznie, że dotyczy tej miejscowości.
- Nie wprowadzono jeszcze modelu księgi wieloparafialnej, nie ma nowego widoku katalogu grupowanego według miejscowości — to dalsze paczki.
- Wyszukiwarka uwzględnia *istniejące* kolekcje biblioteki (księgi i słownik). Nie indeksuje jeszcze nieistniejącego katalogu bibliografii.
- Księgi ze zmienionym/nieistniejącym slugiem parafii mogą nadal nie mieć widocznego odnośnika w katalogu; najpierw popraw relację na podstawie raportu.

## Testy odbioru po wdrożeniu
1. Uruchom `npm run typecheck` oraz `npx tsx --test lib/ksiegi-powiazania.test.ts`; zachowaj wyniki.
2. Sprawdź `npx tsx scripts/sprawdz-powiazania-ksieg.ts` i popraw rzeczywiście błędne identyfikatory w Keystatic.
3. Porównaj kartę `/miejsca/prochenki` z filtrem `/biblioteka/ksiegi?miejsce=prochenki` przy takim samym poziomie uprawnień.
4. W `/szukaj` wpisz nazwę, sygnaturę księgi, sygnaturę tomu, hasło słownikowe; otwórz wynik, sprawdź powiązanie.
5. Sprawdź, że księgi prywatne nie trafiają do wyników niezalogowanego użytkownika.

Bez zmian w danych `content/`; brak nowych zależności npm.

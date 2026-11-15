# Paczka 4 – parafie i urzędy, spójność wizualna, dwuznakowy filtr ksiąg

- Strony `/parafie` i `/parafie/[slug]`, w istniejących komponentach `Uklad` i `Karta`.
- Paraﬁa/urząd pozostaje odrębną instytucją, NIE obiektem przestrzennym. Wspólna kolekcja `parafie` bez migracji slugów.
- Czasy instytucji, przynależności miejscowości i ksiąg są niezależne.
- Relacje miejscowość–instytucja pochodzą tylko z `miejsca.parishes`.
- Relacje obiekt–instytucja są teraz dopisywane na kartach obiektów; nie tworzymy duplikatów po stronie instytucji.
- Puste dane w istniejących rekordach Keystatic pozostają opcjonalne.
- Księgi i obiekty filtrujemy po widoczności przed renderowaniem.
- Lokalny filtr miejscowości w katalogu aktywuje się od dwóch liter, lecz stare adresy `?miejsce=slug` zachowują ścisłe dopasowanie.
- Pole wyszukiwania ponownie używa gotowego komponentu `PoleSzukania` (zamiast ręcznie stylowanego inputa). Kolory, typografia, linie, wiersze i linki pozostają we wspólnych klasach projektu; nie tworzono nowego systemu stylów.
- Nie zmieniono plików `content/` ani schematu danych przynależności na kartach miejscowości.

Przed wdrożeniem sprawdzić na rzeczywistym repozytorium: `git apply --check`, `npm run typecheck`, testy paczki, `npm test`, build. Dopiero po powodzeniu oznaczyć wdrożenie.

# odniepamieci.pl – pakiety 1+2 (aktualizacja na kodzie z VPS)

Podstawa: archiwum `odniepamieci-kod-przed-paczkami-20261114-190818.tar.gz` dostarczone 14.11.2026.
Lokalny commit VPS: `4486382` z 14.11.2026 12:36:33 UTC; serwer miał niezacommitowane zmiany w czterech plikach importera i karty miejscowości. W tych czterech plikach niczego nie resetowano.
Status: **PATCH PRZYGOTOWANY, NIE WDROŻONY**. Zastępuje przygotowane wcześniej osobne patche paczki 1 v2 i paczki 2 v1. Nie instalować ich po tym patchu.

## Zakres

1. Uniwersalna reguła dopasowania ksiąg do miejscowości, zgodna z relacją miejscowość–parafia i latami tego powiązania; jawne przypisanie miejscowości ma pierwszeństwo.
2. Ten sam mechanizm na karcie miejscowości, w katalogu ksiąg i wyszukiwaniu. Raport odczytowy wykrywający zerwane identyfikatory.
3. Rozszerzenie ogólnego wyszukiwania o księgi (również sygnatury tomów), parafie/urzędy i słownik; brak wyjątków dla konkretnych wsi.
4. Jedna księga może dotyczyć wielu instytucji i wyznań; nieznana instytucja główna nie blokuje zapisu.
5. Nowa opcjonalna kolekcja `Zespoły archiwalne` w Keystatic (`content/zespoly/*`). Księgi mogą się z nią wiązać przez pole `fonds` (opcjonalne). Dotychczasowe sygnatury i YAML pozostają ważne. Importer nie tworzy zespołów automatycznie – trzeba utworzyć je w Keystatic lub pozostawić relację pustą.
6. Tomy mają osobny oryginalny tytuł, liczbę skanów (`0` ≠ brak danych) i status digitalizacji. Znane jednostki bez skanów nie są usuwane.
7. Import: etapowe zapisanie i próba automatycznego cofnięcia zmian po błędzie, kopie, dziennik i blokada równoległych importów (nie jest to pełna transakcja bazodanowa przy awarii sprzętu).

## Nowe opcjonalne kolumny importera

`powiazane_parafie_id` — identyfikatory istniejących instytucji rozdzielone `|`;
`wyznania_ktorych_dotyczy` — kody wyznań rozdzielone `|`;
`zespol_archiwalny_id` — identyfikator istniejącego rekordu w nowej kolekcji Keystatic. Puste = niepowiązany;
`parafia_id` — znany wytwórca lub instytucja główna. Puste = nieustalone, nie wymuszać fikcyjnego przypisania.

## Rozróżnienia i ograniczenia

- **Nie ma migracji starych danych**. Nowe pola są opcjonalne, a dawne pliki pozostają czytelne.
- **Nie ma automatycznej naprawy slugów** — diagnostyka jedynie je raportuje.
- **Nie ma jeszcze dwóch widoków katalogu** (wg miejscowości / parafii). To paczka 3.
- Nie zmieniono tego, gdzie edytuje się historyczną przynależność parafialną: nadal na karcie miejscowości w Keystatic.
- Księgi bez instytucji mogą wystąpić w katalogu w grupie „instytucja nieustalona”; nie są sztucznie przypisywane do parafii.
- Nowa kolekcja zespołów jest oddzielnym źródłem metadanych; dane dotychczasowych ksiąg nie są automatycznie przenoszone. Przed ewentualną późniejszą migracją potrzebne są testy i mapa identyfikatorów.
- Komponent `app/components/Ksiegi.tsx` i wcześniejszy `IMPORT_KSIEGI_README.md` nie były częścią przesłanego wycinka VPS. Kod komponentu porównano z gałęzią main na GitHubie; pełna zgodność instalacji musi zostać dodatkowo sprawdzona przez `git apply --check` na VPS.
- Pełny `npm run typecheck`, `npm test` i `next build` wymagają repozytorium i zależności na VPS. Testy izolowane nie zastępują testu produkcyjnego.

## Testy wymagane przed publikacją

1. `git apply --check` i `git diff --check` (przed i po zastosowaniu patcha).
2. `npm run typecheck` i `npm test` oraz oba nowe pliki testów: `npx tsx --test lib/ksiegi-powiazania.test.ts lib/panel/zapis-importu.test.ts`.
3. `npx tsx scripts/sprawdz-powiazania-ksieg.ts` — odczytać raport; uszkodzone identyfikatory poprawiać świadomie w Keystatic.
4. Otwarcie istniejącej księgi i nowego rekordu w Keystatic; także pustej kolekcji zespołów archiwalnych.
5. Podgląd XLSX z kilkoma arkuszami, ponowny import bez duplikatów, publikacja zbiorowa ze świadomym potwierdzeniem, rekord z instytucją nieustaloną, jednostka z liczbą skanów 0.
6. Sprawdzić prywatność: księgi „tylko ja” nie pojawiają się w wyszukiwaniu ani publicznej bibliotece.
7. Po teście funkcjonalnym uruchomić istniejący skrypt build/deploy (należy go wcześniej zweryfikować — nie był w przesłanym archiwum).

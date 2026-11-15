# Import ksiąg metrykalnych — panel odniepamieci.pl

W panelu: `/keystatic/panel/ksiegi-import`.

## Pliki

- XLSX: zakładki **Zespoły** i **Tomy**. Pozostałe zakładki nie są importowane.
- CSV: osobny plik z nagłówkami ksiąg oraz opcjonalny plik tomów. Kodowanie UTF-8; separatory `;` lub `,` (CSV z Calc).
- Format zgodny z zestawami `odniepamieci_ksiegi_9_zespolow_35_tomow.xlsx`, `odniepamieci_import_ksiegi.csv`, `odniepamieci_import_tomy.csv`.
- Przykładowe kolumny ksiąg: `ksiega_id`, `nazwa`, `parafia_id`, `parafia_nazwa`, `rodzaje_aktow`, `miejscowosci_id`, `lata`, `zespol_i_sygnatura`, `dostep`, `skany_url`, `indeks_url`, `notatka_robocza`.
- Kolumny tomów: `ksiega_id`, `kolejnosc`, `rok_lub_lata`, `sygnatura_tomu`, `skany_tomu_url`, `uwagi_tomu`, `liczba_skanow`, `tytul_jednostki`.

## Zasady bezpieczeństwa

1. Domyślnie nowe wpisy są prywatne: `visibility: ja`. W v2 operator może świadomie wybrać widoczność całej grupy, z obowiązkowym potwierdzeniem publikacji.
2. Relacja z parafią/urzędem musi wskazywać istniejący rekord Keystatic. W formularzu można wybrać właściwy rekord.
3. Tryb domyślny **pomija** wszystkie istniejące księgi. Tryb **dopełnij** uzupełnia tylko puste pola i dopisuje nieistniejące tomy. Nie zmienia identyfikatorów, nie usuwa tomów, nie zmienia widoczności istniejącego wpisu.
4. Jeżeli sygnatura zespołu istnieje pod innym `ksiega_id`, importer ostrzega przed potencjalnym duplikatem i wymaga osobnego potwierdzenia (zalecane: wpisać istniejący `ksiega_id` w Calc).
5. Przed dopełnieniem istniejącego pliku importer kopiuje oryginalny YAML do `data/import-ksiegi-backup/` i zapisuje wynik przez plik tymczasowy.
6. Dane, dla których Keystatic nie ma odrębnych pól, trafiają do `note` (księga) i `gaps` (tom), np. źródło, liczba skanów, tytuł jednostki. Dzięki temu nie są tracone i można je poprawić przez Keystatic.
7. Import jest dwustopniowy: podgląd danych i dopiero potem świadomy zapis. Brakujący link nie jest zastępowany adresem zespołu.
8. Pojedynczy plik do 5 MB, maksymalnie 500 ksiąg / 8000 tomów.

## Wdrożenie

- Wymagane zależności Node: `read-excel-file`, `js-yaml`. Po zastosowaniu patcha wykonaj `npm install --no-audit --no-fund` **i zachowaj nowy `package-lock.json`**. Nie przywracaj starego lockfile.
- Zrób kopię `content/` przed uruchomieniem importera.
- Po aktualizacji wykonaj `npm run typecheck` i `npm run build`, a potem standardową procedurę uruchomienia usługi.
- Importer nie modyfikuje plików w `content/` podczas wdrażania łatki. Dane w tym katalogu zapisuje wyłącznie po zatwierdzeniu importu w panelu.

## Zakres

To pierwszy etap importu ksiąg: wspiera CSV i XLSX, tworzenie oraz bezpieczne dopełnianie wpisów. Nie zapewnia zaawansowanej transakcyjnej operacji „wszystko albo nic” dla paczki wielu plików ani harmonogramu odświeżania danych z Szukaj w Archiwach. Pojedyncze pliki są zapisywane atomowo, a istniejące mają kopię przed zmianą.


## Uzupełnienie v4 (po instalacji łatki v1) — stan obowiązujący

- Podgląd pokazuje **lata** wynikające z tomów (z zachowaniem przerw), liczbę tomów oraz **jeden link** prowadzący do pierwszej jednostki ze skanami. Jeśli linków tomów nie ma, pokazuje odpowiednio adres zespołu lub komunikat o braku linku; nigdy nie wymyśla odnośników.
- Operator może zbiorczo oznaczyć importowaną grupę jako `ja`, `bliscy` lub `publiczne` (dla wszystkich). Publiczny zapis wymaga dodatkowego zaznaczenia potwierdzenia i okna dialogowego.
- Domyślnie zbiorczy wybór widoczności dotyczy **nowo tworzonych** ksiąg. Osobna opcja pozwala objąć zmianą widoczności również **istniejące** rekordy; ich pozostałe dane są chronione tak jak dotąd.
- Metryczka miejscowości pokazuje parafie/urzędy przypisane przez istniejące pole „Parafie” na KARCIE MIEJSCOWOŚCI, wraz z niezależnymi latami „Od roku”/„Do roku” z tego samego wpisu. Przykład: parafia istnieje 1500–1900, ale konkretna wieś należy 1600–1788 — w metryczce widnieje 1600–1788. Nie wolno zastępować tych dat okresem istnienia parafii ani latami zachowanych ksiąg.
- Ta łatka nie aktualizuje ani nie naprawia identyfikatorów parafii/urzędów zmienionych w Keystatic. Użytkownik ręcznie ponownie przypisuje księgi do istniejących rekordów.

- **Nie tworzymy pola „Miejscowości należące” w karcie parafii ani żadnego drugiego magazynu powiązań.** Dotychczasowa relacja miejscowość ↔ parafia z opcjonalnymi własnymi latami jest źródłem prawdy. Pole „Okres istnienia” w karcie parafii opisuje WYŁĄCZNIE parafię.
- Dawna propozycja łatki v3, która przenosiła relacje do karty parafii, jest ANULOWANA. Nie wdrażać `odniepamieci_ksiegi_podglad_widocznosc_przynaleznosc_parafie_v3.patch`.

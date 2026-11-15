# odniepamieci.pl · paczka 3 — katalog ksiąg

## Zależności i stan
Paczka wymaga **wdrożonych paczek 1+2** (mechanizm `lib/ksiegi-powiazania.ts`, model ksiąg wieloinstytucjonalnych i jednostek bez skanów).
Łatka opracowana na odtworzonym kodzie VPS z 14.11.2026 oraz na wdrożonym patchu paczek 1+2. Przed instalacją wymagany `git apply --check` na bieżącym VPS.

## Zmiany
- `/biblioteka/ksiegi` — dwa widoki na jednej podstronie: domyślnie **według miejscowości**, alternatywnie **według parafii / urzędu** (`?widok=parafie`).
- Oba widoki mają wspólne filtry: wyznanie, miejscowość oraz **tylko ze skanami online** (`?skany=1`). Parametry są zachowywane przy zmianie widoku.
- Miejscowości są grupami rozwijanymi natywnym `<details>`; nie dodano biblioteki UI. Lista miejscowości w filtrze nie jest ograniczana do już wypełnionych relacji – pokazuje wszystkie miejscowości widoczne dla czytelnika.
- Jedna księga może figurować w kilku grupach, ale licznik ksiąg jest unikatowy; kotwica `#ksiega-<id>` jest w HTML tylko raz. Otwarcie odnośnika z wyszukiwarki rozwija właściwą grupę.
- Księgi z brakującymi / nieznanymi relacjami nie znikają: widok miejscowości zawiera grupę „bez ustalonej miejscowości”, a widok parafii — „instytucja nieustalona”.
- Nie stosujemy wyjątków dla nazw wsi, parafii ani sygnatur. Wykorzystujemy dotychczasową funkcję `ksiegaDotyczyMiejsca`.
- Filtr skanów obejmuje również **tomy** oraz ich pasek roczników; domyślny widok nadal pokazuje jednostki bez skanów.
- Ze względu na późniejszy projekt samodzielnych kart instytucji istniejące odnośniki do parafii prowadzą tymczasowo do `?widok=parafie#slug`.

## Ograniczenia
- Paczka 3 **nie** tworzy osobnych kart parafii; to paczka 4.
- Brak przypisania do miejscowości w Keystatic nie jest automatycznie uzupełniany. Księgi bez wiarygodnego przypisania są zachowane w grupie nieprzypisanej.
- Nie zmienia schematu Keystatic ani danych `content/`; nie dodaje zależności npm.
- Nie zainstalowano jej automatycznie na VPS. Pełne testy TS/Next.js trzeba wykonać podczas wdrażania.

## Testy odbioru
1. TypeScript (`npm run typecheck`), 9 testów grupowania i istniejące testy powiązań, testy aplikacji (`npm test`) oraz build/restart.
2. Domyślny widok według miejscowości. Przełącz na parafie i z powrotem: licznik unikatowych ksiąg pozostaje ten sam dla tych samych filtrów.
3. Filtr miejscowości + wyznanie; adres parametrów działa także po odświeżeniu.
4. Bez skanów: jednostki z `0` skanów są widoczne domyślnie; z `?skany=1` nie są pokazywane.
5. Link z wyszukiwarki `#ksiega-...` otwiera i przewija właściwą grupę. Link z karty miejscowości do parafii otwiera widok parafialny.
6. Księgi bez instytucji lub bez miejscowości pozostają dostępne w grupie „nieustalona”. Brak duplikacji identyfikatorów HTML.
7. Sprawdź zarówno niezalogowanego użytkownika, jak i rekord z widocznością „tylko ja”: żaden prywatny rekord nie wycieka.

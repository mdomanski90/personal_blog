# odniepamieci.pl — paczka 3.1 · importer i lokalne szukanie miejscowości

## Zakres i zależności
- Wymaga już wdrożonych paczek 1, 2 i 3 oraz ręcznej korekty `BACKUP` na `/var/lib/odniepamieci/import-ksiegi-backup`.
- `lib/panel/zapis-importu.ts`: nowe i atomowo aktualizowane `content/ksiegi/*.yaml` trafiają na dysk z `0640` i GID katalogu `content/ksiegi`. W razie błędu te same zasady obowiązują rollback. Nie zmieniamy automatycznie właściciela istniejących plików; nie zmieniamy całego drzewa content.
- Prywatne kopie importera nadal `0600` (pliki) i `0700` (katalogi). Opcjonalny `ODNIEPAMIECI_IMPORT_BACKUP_DIR` pozwala zmienić lokalizację; bez ustawienia używa już funkcjonującego `/var/lib/odniepamieci/import-ksiegi-backup`.
- Wymagane: użytkownik `blog` może pisać do `content/ksiegi`, grupa katalogu umożliwia czytanie użytkownikowi budującemu Next.js (`ubuntu` należy do grupy `blog`). Nie ustawiamy 777/644.
- `/biblioteka/ksiegi`: lokalne pole `szukaj miejscowość` w miejsce listy rozwijanej. Filtrowanie natychmiast podczas pisania, bez pobierania kolejnych danych. Uwzględnia fragmenty, polskie znaki, nazwy alternatywne i formy odmiany. Wyznanie, skany i oba widoki nadal działają; wyniki w parafiach zawierają tylko księgi przypisane do pasujących miejscowości.
- Stosowana jest wyłącznie reguła `ksiegaDotyczyMiejsca` z paczki 1. Nie zgadujemy powiązań z nazw księgi. Niekompletne rekordy nie giną w pełnym katalogu.
- Zewnętrzne `?miejsce=slug` nadal działa; tekst wyszukiwania zapisuje się jako `?q=` i pozostaje przy zmianie widoku/wyznania/skanów.
- Bez dodatkowych zależności npm; bez zmian w danych `content/`.

## Testy odbioru
1. `git apply --check`, kopie bezpieczeństwa, `npm run typecheck`, testy `lib/ksiegi-katalog.test.ts` i `lib/panel/zapis-importu.test.ts`, `npm test`, standardowy deploy.
2. Wpisz `proch`, `prochE`, `LOS`, `msza` — wyniki filtrują się w miejscu, bez kliknięcia `pokaż`.
3. Włącz widok parafialny, wpisz `Próchenki`; wynikowe parafie nie pokazują ksiąg innych miejscowości.
4. Sprawdź główne filtry i stare linki `?miejsce=...`, `#ksiega-...`.
5. Sprawdź księgi bez przypisania oraz brak ksiąg prywatnych w oknie incognito.
6. Kontrola nowego zaimportowanego YAML: `stat -c '%U:%G %a %n' content/ksiegi/<plik>.yaml` → oczekiwane `blog:blog 640`, kopie bez rozszerzenia uprawnień.
7. Mimo testów prawa dostępu warto zweryfikować NOWY import na kontrolnym pliku: testy nie odtwarzają na VPS wszystkich ustawień ACL/umask/usługi.

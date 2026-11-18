# odniepamieci.pl

Społeczne archiwum pamięci lokalnej: wsie wokół Olszanki i Łosic – dokumenty, zdjęcia, wspomnienia, ludzie, miejsca,
plany cmentarzy, księgi metrykalne.

## Technologia

- Next.js 16 (App Router), React 18, TypeScript
- Keystatic 0.6 (tryb lokalny) – treści w `content/`; własny panel w `/keystatic/panel` (rama, listy z filtrami i
  zmianami zbiorczymi, ostatnie operacje, raport ksiąg, kopie)
- SQLite (better-sqlite3) – indeks wyszukiwania i bazy w `data/`
- MapLibre GL, OpenSeadragon + Annotorious (skany i objaśnienia), IIIF Presentation 3 (manifesty materiałów publicznych)
- Tailwind CSS 4 bez preflight + tokeny w `app/globals.css` (strona) i `app/keystatic/panel.css` (panel)

## Dane poza repozytorium

`content/`, `pliki-archiwum/` i `data/` żyją tylko na serwerze (i w kopiach) – nigdy w Git. Na serwerze `.gitignore`
nie może mieć linii `content/` (Keystatic czyta `.gitignore`).

## Polecenia

    npm test            # testy jednostkowe (node:test + tsx)
    npm run typecheck   # tsc --noEmit
    npm run lint
    npm run build       # testy, lint, miniatury, next build, migracje, numery katalogowe, eksport Omeka S

Wdrożenie na VPS: `bash /opt/personal_blog/scripts/wdroz.sh --lista`, potem bez `--lista` (kopia, nałożenie commitów,
budowa, restart, test, dziennik `~/kopie-blog/wdrozenia.log`, przy błędzie powrót do poprzedniej wersji).

## Kopie i odtwarzanie

- panel → „kopie, eksport, ustawienia”: kopia na komputer albo do katalogu na serwerze
- kopia nocna (timer systemd) i pobieranie przez węzeł domowy: `scripts/systemd/kopie-nocne.md`
- sprawdzenie i odtworzenie: `npx tsx scripts/sprawdz-kopie.ts <kopia.tar.gz>` (zawsze najpierw obok, podmiana tylko z `--tak`)
- importy i zmiany zbiorcze mają własne kopie i „cofnij” – panel → „ostatnie operacje”

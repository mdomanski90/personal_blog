#!/usr/bin/env bash
# Etap 0A (audyt nr 2): wdrożenie na VPS jedną komendą – kopia, wyliczenie brakujących commitów, nałożenie (git am -3),
# budowa, restart, test; przy błędzie przywraca poprzednią zbudowaną wersję. Bez git reset / git clean.
# Użycie (na serwerze): bash /opt/personal_blog/scripts/wdroz.sh            – pokazuje listę i pyta o zgodę
#                       bash /opt/personal_blog/scripts/wdroz.sh --lista    – tylko lista, nic nie zmienia
# Zmienne: KOPIE (katalog kopii, domyślnie ~/kopie-blog), ZRODLO (klon GitHub, domyślnie ~/blog-main), BAZA (adres testu).
# P5 (OPS-05): dziennik wdrożeń $KOPIE/wdrozenia.log – co było na serwerze, co weszło, kopia, build, wynik, jak cofnąć.
set -euo pipefail
STRONA="${STRONA:-/opt/personal_blog}"
ZRODLO="${ZRODLO:-$HOME/blog-main}"
KOPIE="${KOPIE:-$HOME/kopie-blog}"
cd "$STRONA"
DZIENNIK="$KOPIE/wdrozenia.log"
dziennik() { mkdir -p "$KOPIE" && printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$DZIENNIK" || true; }
stop() { echo "STOP: $*" >&2; [ "${ZAPISUJ:-0}" = 1 ] && dziennik "STOP: $*"; exit 1; }
[ "$(git rev-parse --abbrev-ref HEAD)" = local ] || stop "gałąź inna niż local"
[ ! -d .git/rebase-apply ] || stop "niedokończone git am – najpierw: git am --abort"
git -C "$ZRODLO" fetch -q origin

# brakujące commity: idziemy po main od najstarszego; commit jest „na serwerze”, gdy jego temat jest wśród ostatnich 300 tematów gałęzi local
# tematy w tablicy asocjacyjnej – bez potoku „printf | grep -q”, który przy pipefail losowo dawał fałsz (SIGPIPE; lekcja 16.11)
declare -A TEMATY=()
while IFS= read -r t; do TEMATY["$t"]=1; done < <(git log -300 --format=%s)
jest() { local t; t=$(git -C "$ZRODLO" log -1 --format=%s "$1"); [ -n "${TEMATY[$t]+x}" ]; }
mapfile -t MAIN < <(git -C "$ZRODLO" rev-list --reverse --max-count=40 origin/main)
# do wdrożenia: wszystko PO najnowszym commicie main obecnym na serwerze (po temacie). Starsze commity bez odpowiednika
# na local (np. „Kod z serwera” – powstały na GitHubie z kodu serwera) tylko wypisujemy jako ostrzeżenie.
OSTATNI=""; BRAK=(); STARSZE=()
for c in "${MAIN[@]}"; do
    if jest "$c"; then STARSZE+=("${BRAK[@]}"); BRAK=(); OSTATNI=$c
    else BRAK+=("$c"); fi
done
if [ ${#STARSZE[@]} -gt 0 ]; then
    echo "UWAGA: starsze commity main bez odpowiednika na serwerze (pomijam – sprawdź, czy ich treść już tam jest):"
    for c in "${STARSZE[@]}"; do git -C "$ZRODLO" log -1 --format='  %h %s' "$c"; done
fi
[ ${#BRAK[@]} -gt 0 ] || { echo "Nic do wdrożenia – serwer ma wszystkie commity z main."; exit 0; }
[ -n "$OSTATNI" ] || stop "nie znalazłem na serwerze żadnego z ostatnich 40 commitów main"
echo "Na serwerze ostatni: $(git -C "$ZRODLO" log -1 --format='%h %s' "$OSTATNI")"
echo "Do wdrożenia (${#BRAK[@]}):"; for c in "${BRAK[@]}"; do git -C "$ZRODLO" log -1 --format='  %h %s' "$c"; done
[ "${1:-}" = "--lista" ] && exit 0
read -r -p "Wdrożyć? [t/N] " odp; [ "$odp" = t ] || stop "przerwane"
PRZED=$(git rev-parse --short HEAD)
ZAPISUJ=1
dziennik "START: na serwerze $PRZED ($(git log -1 --format=%s)); do wdrożenia ${#BRAK[@]}: $(for c in "${BRAK[@]}"; do git -C "$ZRODLO" log -1 --format='%h' "$c"; done | tr '\n' ' ')"

# 1. kopia danych
mkdir -p "$KOPIE"
PLIK="$KOPIE/odniepamieci-kopia-$(date +%Y%m%d-%H%M%S).tar.gz"
sudo tar --use-compress-program='gzip -1' -cf "$PLIK" content pliki-archiwum data
sudo chown "$USER" "$PLIK"
tar -tzf "$PLIK" >/dev/null || stop "kopia uszkodzona: $PLIK"
ls -1t "$KOPIE"/odniepamieci-kopia-*.tar.gz | tail -n +6 | xargs -r rm -f
echo "Kopia: $PLIK ($(du -h "$PLIK" | cut -f1))"
dziennik "KOPIA: $PLIK ($(du -h "$PLIK" | cut -f1))"

# 2. zapas obecnej zbudowanej wersji
rm -rf .next-poprzedni; cp -a .next .next-poprzedni
przywroc() { echo "Przywracam poprzednią zbudowaną wersję…" >&2; dziennik "PRZYWRÓCONO poprzedni build (.next-poprzedni)"; rm -rf .next; mv .next-poprzedni .next; sudo systemctl restart blog; sleep 4; systemctl is-active blog >&2 || true; }

# 3. nałożenie commitów
git -C "$ZRODLO" format-patch --stdout "$OSTATNI..origin/main" | git am -3 || { git am --abort; stop "konflikt przy nakładaniu – nic nie zmieniono w kodzie, przyślij wynik"; }

# 4. zależności (tylko gdy zmienił się package-lock.json) i budowa
if git -C "$ZRODLO" diff --name-only "$OSTATNI" origin/main | grep -qx package-lock.json; then npm ci || { przywroc; stop "npm ci nie powiódł się – działa poprzednia wersja"; }; fi
npm run build || { przywroc; stop "budowa nie powiodła się – działa poprzednia wersja; kod jest już nałożony, przyślij wynik"; }

# 5. restart i test
sudo systemctl restart blog; sleep 5
systemctl is-active blog || { przywroc; stop "usługa nie wstała – działa poprzednia wersja"; }
bash scripts/sprawdz-wdrozenie.sh "${BAZA:-https://odniepamieci.pl}" || { przywroc; stop "test po wdrożeniu nie przeszedł – działa poprzednia wersja"; }
rm -rf .next-poprzedni
WYNIK="WDROŻONE: $(git log -1 --format='%h %s') · build $(stat -c %y .next/BUILD_ID | cut -d. -f1) UTC"
dziennik "$WYNIK"
dziennik "COFNIĘCIE (gdyby trzeba): kod – git revert --no-edit $PRZED..HEAD && npm run build && sudo systemctl restart blog (bez reset --hard); treści – kopia $PLIK (scripts/sprawdz-kopie.ts)"
echo "$WYNIK"
echo "Dziennik: $DZIENNIK"

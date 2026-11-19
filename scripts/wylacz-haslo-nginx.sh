#!/usr/bin/env bash
# KON-07: wyłączenie hasła nginx (auth_basic) dla /keystatic i /api/keystatic – po odbiorze kont (P7a).
# Po tej zmianie panel chronią wyłącznie konta (klucze dostępu). Skrypt:
#   1. sprawdza, że konta działają i że zmyślone hasło w nagłówku niczego nie otwiera,
#   2. dopisuje PANEL_TYLKO_KONTA=1 do .env.local (gdyby konta kiedyś przestały działać, panel się ZAMKNIE, a nie otworzy),
#   3. robi kopię pliku nginx, wyłącza (komentuje) linie auth_basic, sprawdza składnię, przeładowuje nginx,
#   4. sprawdza z zewnątrz, że panel bez zalogowania jest zamknięty – przy innym wyniku sam przywraca kopię.
# Użycie (na serwerze):  bash /opt/personal_blog/scripts/wylacz-haslo-nginx.sh             – tylko sprawdza, nic nie zmienia
#                        bash /opt/personal_blog/scripts/wylacz-haslo-nginx.sh --wykonaj   – ZMIENIA STAN
#                        bash /opt/personal_blog/scripts/wylacz-haslo-nginx.sh --przywroc  – ZMIENIA STAN: wraca hasło nginx z ostatniej kopii
# Zmienne (do testów): STRONA, BAZA, APP, PLIK, KOPIE.
set -euo pipefail
STRONA="${STRONA:-/opt/personal_blog}"
BAZA="${BAZA:-https://odniepamieci.pl}"
APP="${APP:-http://127.0.0.1:3000}"
KOPIE="${KOPIE:-$HOME/kopie-blog}"
PLIK="${PLIK:-$(readlink -f /etc/nginx/sites-enabled/blog)}"
TRYB="${1:-}"
DZIENNIK="$KOPIE/wdrozenia.log"
dziennik() { mkdir -p "$KOPIE" && printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$DZIENNIK" || true; }
stop() { echo "STOP: $*" >&2; exit 1; }
kod() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$@" || true; }
AKTYWNE='^[[:space:]]*auth_basic(_user_file)?[[:space:]]'
ile_aktywnych() { sudo grep -cE "$AKTYWNE" "$PLIK" || true; }
przeladuj() { sudo nginx -t && sudo systemctl reload nginx && sleep 2; }

[ -f "$PLIK" ] || stop "nie znaleziono pliku nginx strony ($PLIK)"

if [ "$TRYB" = --przywroc ]; then
    # najnowsza wg nazwy (data w nazwie); czas pliku nie nadaje się – cp -a zachowuje czas oryginału
    OST=$(ls -1 "$KOPIE"/nginx-blog-przed-kon07-* 2>/dev/null | sort | tail -1 || true)
    [ -n "$OST" ] || stop "brak kopii nginx-blog-przed-kon07-* w $KOPIE"
    sudo cp -a "$OST" "$PLIK"; przeladuj || stop "nginx nie przyjął przywróconego pliku – przyślij wynik: sudo nginx -t"
    echo "PRZYWRÓCONE: hasło nginx z kopii $OST · /api/keystatic/osoby bez hasła: $(kod "$BAZA/api/keystatic/osoby") (oczekiwane 401)"
    dziennik "KON-07 COFNIĘTE: hasło nginx przywrócone z $OST"
    exit 0
fi

# ---------- 1. kontrole (nic nie zmieniają) ----------
echo "Plik nginx: $PLIK"
N=$(ile_aktywnych)
echo "Aktywne linie auth_basic: $N"
[ "$N" = 0 ] && { echo "Hasło nginx jest już wyłączone – nic do zrobienia."; exit 0; }
[ "$N" = 4 ] || stop "spodziewane 4 linie (2 × auth_basic + auth_basic_user_file, odczyt 19.11), są $N – plik wygląda inaczej; przyślij: sudo grep -n auth_basic $PLIK"
KONTA=$(curl -s --max-time 20 "$APP/api/konto/ja" || true)
case "$KONTA" in *'"konta":true'*) echo "Konta: włączone";; *) stop "konta nie są włączone (odpowiedź /api/konto/ja: ${KONTA:0:80}) – najpierw npm run konta:przygotuj";; esac
K=$(kod -H 'Authorization: Basic eDp4' "$APP/api/keystatic/osoby")
[ "$K" = 401 ] || stop "aplikacja wpuszcza ze zmyślonym hasłem w nagłówku (kod $K, oczekiwany 401) – nie wyłączam hasła nginx"
echo "Aplikacja ze zmyślonym hasłem w nagłówku: 401 (dobrze)"
K=$(kod "$APP/api/keystatic/tree")
[ "$K" = 401 ] || stop "trasa treści Keystatic bez zalogowania odpowiada $K (oczekiwane 401)"
echo "Treści Keystatic bez zalogowania: 401 (dobrze)"
if [ "$TRYB" != --wykonaj ]; then
    echo "KONTROLA: wszystko gotowe. Nic nie zmieniono. Wykonanie: bash $STRONA/scripts/wylacz-haslo-nginx.sh --wykonaj"
    exit 0
fi

# ---------- 2. bezpiecznik w aplikacji ----------
if ! grep -q '^PANEL_TYLKO_KONTA=1$' "$STRONA/.env.local"; then
    printf '\n# KON-07: hasło nginx wyłączone – bez działających kont panel jest zamknięty\nPANEL_TYLKO_KONTA=1\n' >> "$STRONA/.env.local"
    sudo systemctl restart blog; sleep 5
    systemctl is-active blog >/dev/null || stop "usługa blog nie wstała po dopisaniu PANEL_TYLKO_KONTA – hasło nginx bez zmian; usuń tę linię z .env.local i uruchom: sudo systemctl restart blog"
    case "$(curl -s --max-time 20 "$APP/api/konto/ja" || true)" in *'"konta":true'*) ;; *) stop "po restarcie konta nie odpowiadają – hasło nginx bez zmian";; esac
    echo "Bezpiecznik PANEL_TYLKO_KONTA=1 dopisany, blog active"
fi

# ---------- 3. nginx ----------
mkdir -p "$KOPIE"
KOPIA="$KOPIE/nginx-blog-przed-kon07-$(date +%Y%m%d-%H%M%S)"
sudo cp -a "$PLIK" "$KOPIA"
cofnij() { sudo cp -a "$KOPIA" "$PLIK"; przeladuj || true; dziennik "KON-07 NIEUDANE: $1 – przywrócono $KOPIA"; stop "$1 – przywrócono poprzedni plik nginx (hasło działa jak dotąd)"; }
sudo sed -i -E "s/$AKTYWNE/# KON-07 wyłączone: &/" "$PLIK"
[ "$(ile_aktywnych)" = 0 ] || cofnij "nie udało się wyłączyć wszystkich linii auth_basic"
przeladuj || cofnij "nginx nie przyjął zmienionego pliku"

# ---------- 4. kontrola z zewnątrz ----------
bledy=0
jest() { if [ "$2" = "$3" ]; then echo "  ok   $2 $1"; else echo "  BŁĄD $2 (oczekiwano $3) $1"; bledy=$((bledy + 1)); fi; }
jest "strona główna" "$(kod "$BAZA/")" 200
jest "/api/keystatic/osoby bez zalogowania" "$(kod "$BAZA/api/keystatic/osoby")" 401
jest "/api/keystatic/tree bez zalogowania" "$(kod "$BAZA/api/keystatic/tree")" 401
jest "/api/keystatic/osoby ze zmyślonym hasłem" "$(kod -H 'Authorization: Basic eDp4' "$BAZA/api/keystatic/osoby")" 401
W=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 20 "$BAZA/keystatic" || true)
case "$W" in '307 '*'/zaloguj?wroc='*) echo "  ok   307 /keystatic → zaloguj";; *) echo "  BŁĄD $W (oczekiwano 307 na /zaloguj) /keystatic"; bledy=$((bledy + 1));; esac
[ "$bledy" = 0 ] || cofnij "kontrola po zmianie: $bledy błędów"
echo "WYŁĄCZONE: hasło nginx dla /keystatic i /api/keystatic · kopia: $KOPIA"
echo "Cofnięcie: bash $STRONA/scripts/wylacz-haslo-nginx.sh --przywroc"
dziennik "KON-07: hasło nginx wyłączone (auth_basic zakomentowane w $PLIK); kopia $KOPIA; cofnięcie: scripts/wylacz-haslo-nginx.sh --przywroc"

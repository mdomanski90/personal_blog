#!/usr/bin/env bash
# Etap 0A (audyt nr 2): test po wdrożeniu – strony publiczne działają, panel bez hasła / bez zalogowania jest zamknięty.
# Użycie: bash scripts/sprawdz-wdrozenie.sh [adres]   (domyślnie https://odniepamieci.pl – przez nginx, bo tam jest hasło panelu)
set -u
BAZA="${1:-https://odniepamieci.pl}"
bledy=0
sprawdz() { # oczekiwany kod, ścieżka
    local kod
    kod=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$BAZA$2")
    if [ "$kod" = "$1" ]; then printf '  ok   %s %s\n' "$kod" "$2"; else printf '  BŁĄD %s (oczekiwano %s) %s\n' "$kod" "$1" "$2"; bledy=$((bledy + 1)); fi
}
echo "Strony publiczne ($BAZA):"
for s in / /miejsca /osoby /archiwum /biblioteka /biblioteka/ksiegi /obiekty /leksykon; do sprawdz 200 "$s"; done
# KON-07: panel chroni hasło nginx (401) albo – po jego wyłączeniu – konta (strony: 307 na /zaloguj, API: 401).
sprawdz_strone() { # ścieżka strony panelu: 401 (hasło nginx) albo 307 z przekierowaniem na /zaloguj (konta)
    local w kod cel
    w=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 20 "$BAZA$1"); kod=${w%% *}; cel=${w#* }
    if [ "$kod" = 401 ]; then printf '  ok   401 %s (hasło serwera)\n' "$1"
    elif [ "$kod" = 307 ] && [[ "$cel" == */zaloguj\?wroc=* ]]; then printf '  ok   307 %s → zaloguj (konta)\n' "$1"
    else printf '  BŁĄD %s (oczekiwano 401 albo 307 na /zaloguj) %s %s\n' "$kod" "$1" "$cel"; bledy=$((bledy + 1)); fi
}
echo "Panel bez zalogowania (oczekiwane 401 albo przekierowanie na „zaloguj”):"
for s in /keystatic /keystatic/panel /keystatic/teren; do sprawdz_strone "$s"; done
echo "API panelu bez zalogowania (oczekiwane 401):"
for s in '/api/keystatic/panel/kopia?tryb=stan' /api/keystatic/osoby /api/keystatic/tree /api/keystatic/teren; do sprawdz 401 "$s"; done
# zmyślone dane logowania w nagłówku nie mogą niczego otworzyć (z hasłem nginx: odrzuca nginx; bez niego: konta)
kod=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -H 'Authorization: Basic eDp4' "$BAZA/api/keystatic/osoby")
if [ "$kod" = 401 ]; then echo "  ok   401 /api/keystatic/osoby ze zmyślonym hasłem"; else echo "  BŁĄD $kod (oczekiwano 401) /api/keystatic/osoby ze zmyślonym hasłem"; bledy=$((bledy + 1)); fi
echo "Nieistniejący adres (oczekiwane 404):"
sprawdz 404 /miejsca/nie-ma-takiej-miejscowosci-test
if [ "$bledy" -gt 0 ]; then echo "WYNIK: $bledy błędów"; exit 1; fi
echo "WYNIK: wszystko w porządku"

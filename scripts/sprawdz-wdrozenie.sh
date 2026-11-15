#!/usr/bin/env bash
# Etap 0A (audyt nr 2): test po wdrożeniu – strony publiczne działają, panel bez hasła jest zamknięty.
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
for s in / /miejsca /osoby /archiwum /biblioteka /biblioteka/ksiegi /obiekty /tematy; do sprawdz 200 "$s"; done
echo "Panel i API panelu bez hasła (oczekiwane 401):"
for s in /keystatic /keystatic/panel /api/keystatic/panel/kopia?tryb=stan /api/keystatic/osoby; do sprawdz 401 "$s"; done
echo "Nieistniejący adres (oczekiwane 404):"
sprawdz 404 /miejsca/nie-ma-takiej-miejscowosci-test
if [ "$bledy" -gt 0 ]; then echo "WYNIK: $bledy błędów"; exit 1; fi
echo "WYNIK: wszystko w porządku"

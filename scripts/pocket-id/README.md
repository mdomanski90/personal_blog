# Pocket ID na serwerze – konto.odniepamieci.pl (P7a)

Pocket ID odpowiada tylko na pytanie „kim jesteś” (klucze dostępu – odcisk palca, twarz, PIN urządzenia). Role i uprawnienia
trzyma panel odniepamieci.pl (`content/_panel/konta.json`). Decyzje 19.11.2026: adres **konto.odniepamieci.pl**, usługa
**systemd** (bez Dockera), sesja 30 dni, zaproszenie 7 dni.

Sprawdzone 19.11.2026 na prawdziwym Pocket ID **2.19.2** uruchomionym lokalnie (plik z GitHub Releases, suma SHA-256 zgodna
z `checksums.txt`): start z poniższym plikiem ustawień, `/setup` bez e-maila z wirtualnym kluczem przeglądarki, konto przez API,
link jednorazowy na 7 dni (`/lc/<kod>`), dodanie klucza, polskie strony. **Nie sprawdzone tutaj:** piaskownica systemd na VPS
(tylko `systemd-analyze verify`), nginx i certbot – stąd kontrola po każdym kroku.

**Wykonane na VPS 19.11.2026 (kroki 0–5, odczyt właściciela 17:30–17:35):** plik `pocket-id_linux_amd64: OK`, `pocket-id 2.19.2`, 11 ustawień, usługa `active`,
`204` wprost i przez nginx. Lekcje: kontrola zaraz po `systemctl reload nginx` trafia jeszcze w starą konfigurację (stąd `sleep 2`); zsh przy
wklejaniu dopisuje `\` przed `;` po adresie – adresy w komendach są w cudzysłowach.

Uwaga do dokumentacji Pocket ID: plik wydania nazywa się `pocket-id_linux_amd64` (podkreślenia); nazwa z instrukcji
(`pocket-id-linux-amd64`) daje 404.

## Pliki
- `pocket-id.service` – usługa systemd z piaskownicą (własny użytkownik `pocketid`, zapis tylko w `/var/lib/pocket-id`).
- `pocket-id.env.wzor` – ustawienia bez sekretów. Na serwerze `/etc/pocket-id/pocket-id.env` (root:pocketid, 0640).
- `nginx-konto.conf` – strona nginx; certyfikat dopisuje certbot.

Ustawienia są w pliku, nie w bazie (`UI_CONFIG_DISABLED=true`): nazwa „odniepamieci.pl”, e-mail nieobowiązkowy,
samodzielna rejestracja wyłączona, bez statystyk (`ANALYTICS_DISABLED`), bez SMTP – Pocket ID niczego nie wysyła.
Sprawdzanie nowej wersji (zapytanie do GitHuba) zostaje włączone – to usługa logowania, aktualizacje są ważne.

## Komendy właściciela (każda to jedna linia)

**0. Odczyt (nic nie zmienia)** – architektura, DNS, wolny port, strony nginx, usługa `blog` (wzór piaskownicy):

    uname -m; dig +short odniepamieci.pl A; dig +short konto.odniepamieci.pl A; sudo ss -ltn | grep ':1411 ' || echo 'port 1411 wolny'; ls /etc/nginx/sites-enabled/; id pocketid 2>&1 | head -1; systemctl cat blog --no-pager | grep -vi 'secret\|haslo\|password\|token'

**1. DNS (panel domeny, zmienia stan)** – rekord `konto` typu **A** na ten sam adres co `odniepamieci.pl` (jeśli domena ma
rekord AAAA – także AAAA). Kontrola: krok 0 pokaże ten sam adres w drugiej i trzeciej linii.

**2. Plik Pocket ID 2.19.2 z sumą kontrolną (zmienia stan)** – użytkownik `pocketid`, `/opt/pocket-id/pocket-id`.
Oczekiwane: `pocket-id_linux_amd64: OK` i `pocket-id 2.19.2`.

    (id pocketid >/dev/null 2>&1 || sudo useradd --system --home-dir /var/lib/pocket-id --shell /usr/sbin/nologin pocketid) && sudo install -d -m 0755 /opt/pocket-id && cd /tmp && curl -fsSL -o pocket-id_linux_amd64 'https://github.com/pocket-id/pocket-id/releases/download/v2.19.2/pocket-id_linux_amd64' && echo '85881ea87d78710c34f127b2d849d27dd7e69963723d9e590f66de26e87fc4fb  pocket-id_linux_amd64' | sha256sum -c - && sudo install -m 0755 pocket-id_linux_amd64 /opt/pocket-id/pocket-id && rm pocket-id_linux_amd64 && /opt/pocket-id/pocket-id version

**3. Ustawienia i sekrety (zmienia stan)** – klucz szyfrowania i klucz API powstają na serwerze i nigdzie się nie wyświetlają.
Drugie uruchomienie niczego nie nadpisze (zmiana `ENCRYPTION_KEY` odcięłaby dane). Oczekiwane: `11`.

    sudo test ! -e /etc/pocket-id/pocket-id.env && sudo install -d -m 0750 -o root -g pocketid /etc/pocket-id && { printf '%s\n' 'APP_URL=https://konto.odniepamieci.pl' 'HOST=127.0.0.1' 'PORT=1411' 'TRUST_PROXY=true' 'ANALYTICS_DISABLED=true' 'UI_CONFIG_DISABLED=true' 'APP_NAME=odniepamieci.pl' 'REQUIRE_USER_EMAIL=false' 'ALLOW_USER_SIGNUPS=disabled'; echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"; echo "STATIC_API_KEY=$(openssl rand -hex 32)"; } | sudo install -m 0640 -o root -g pocketid /dev/stdin /etc/pocket-id/pocket-id.env && sudo grep -c = /etc/pocket-id/pocket-id.env || echo 'NIE ZAPISANO – plik już istnieje albo błąd wyżej'

**4. Usługa (zmienia stan)**. Oczekiwane: `active` i `204`.

    printf '%s\n' '# P7a: Pocket ID – usługa logowania kluczem dostępu dla odniepamieci.pl (konto.odniepamieci.pl)' '# Instalacja i komendy właściciela: scripts/pocket-id/README.md' '[Unit]' 'Description=Pocket ID – logowanie kluczem dostępu (konto.odniepamieci.pl)' 'After=network-online.target' 'Wants=network-online.target' '' '[Service]' 'Type=simple' 'User=pocketid' 'Group=pocketid' 'StateDirectory=pocket-id' 'StateDirectoryMode=0700' 'WorkingDirectory=/var/lib/pocket-id' 'EnvironmentFile=/etc/pocket-id/pocket-id.env' 'ExecStart=/opt/pocket-id/pocket-id' 'Restart=on-failure' 'RestartSec=5' 'UMask=0077' 'NoNewPrivileges=true' 'PrivateTmp=true' 'PrivateDevices=true' 'ProtectSystem=strict' 'ProtectHome=true' 'ProtectKernelTunables=true' 'ProtectKernelModules=true' 'ProtectKernelLogs=true' 'ProtectControlGroups=true' 'ProtectClock=true' 'ProtectHostname=true' 'RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX' 'RestrictNamespaces=true' 'RestrictRealtime=true' 'RestrictSUIDSGID=true' 'LockPersonality=true' 'MemoryDenyWriteExecute=true' 'SystemCallArchitectures=native' 'CapabilityBoundingSet=' 'AmbientCapabilities=' '' '[Install]' 'WantedBy=multi-user.target' | sudo tee /etc/systemd/system/pocket-id.service >/dev/null && sudo systemctl daemon-reload && sudo systemctl enable --now pocket-id && sleep 4 && systemctl is-active pocket-id && curl -s -o /dev/null -w '%{http_code}\n' 'http://127.0.0.1:1411/healthz'

**5. nginx (zmienia stan)**. Oczekiwane: `syntax is ok`, `test is successful`, `204`.

    printf '%s\n' '# P7a: konto.odniepamieci.pl → Pocket ID (127.0.0.1:1411). Certyfikat i przekierowanie na HTTPS dopisuje certbot (--nginx).' 'server {' '    listen 80;' '    listen [::]:80;' '    server_name konto.odniepamieci.pl;' '' '    # Pocket ID wysyła duże nagłówki (zalecenie z dokumentacji Pocket ID)' '    proxy_busy_buffers_size 512k;' '    proxy_buffers 4 512k;' '    proxy_buffer_size 256k;' '' '    location / {' '        proxy_pass http://127.0.0.1:1411;' '        proxy_http_version 1.1;' '        proxy_set_header Host $host;' '        proxy_set_header X-Real-IP $remote_addr;' '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' '        proxy_set_header X-Forwarded-Proto $scheme;' '    }' '}' | sudo tee /etc/nginx/sites-available/konto >/dev/null && sudo ln -sfn /etc/nginx/sites-available/konto /etc/nginx/sites-enabled/konto && sudo nginx -t && sudo systemctl reload nginx && sleep 2 && curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: konto.odniepamieci.pl' 'http://127.0.0.1/healthz'

**6. Certyfikat (zmienia stan)**. Oczekiwane: `204`.

    sudo certbot --nginx -d konto.odniepamieci.pl --redirect && curl -s -o /dev/null -w '%{http_code}\n' 'https://konto.odniepamieci.pl/healthz'

**7. Konto administratora Pocket ID – od razu po kroku 6.** W przeglądarce: `https://konto.odniepamieci.pl/setup` →
nazwa użytkownika i imię (e-mail można pominąć) → „Dodaj klucz” → odcisk palca / twarz / PIN (Firefox na Linuksie obsługuje tylko klucze USB – wtedy „Anuluj” i link jednorazowy
na telefon: komenda `konta.ts administrator <nazwa> --link` niżej albo zapytanie do API z tej instrukcji). Potem w „Moje konto” dodaj
**drugi klucz** na innym urządzeniu (zapas). Kontrola – po założeniu konta `404` (formularz zamknięty), przed – `204`:

    curl -s -o /dev/null -w '%{http_code}\n' 'https://konto.odniepamieci.pl/api/signup/setup'

Jeśli `/setup` nie pokazuje formularza, choć konta jeszcze nie zakładałeś – ktoś był szybszy (adres jest publiczny od
wydania certyfikatu): zatrzymaj usługę, usuń `/var/lib/pocket-id/data` i zacznij od kroku 4.

Diagnoza (odczyt): `systemctl status pocket-id --no-pager | head -12; journalctl -u pocket-id -n 30 --no-pager`

Wycofanie (zmienia stan; dane i ustawienia zostają na dysku): `sudo systemctl disable --now pocket-id; sudo rm -f /etc/nginx/sites-enabled/konto && sudo nginx -t && sudo systemctl reload nginx`

## Przy wdrożeniu P7a (po zgodzie na wdrożenie)

    cd /opt/personal_blog && sudo grep '^STATIC_API_KEY=' /etc/pocket-id/pocket-id.env | npm run --silent konta:przygotuj && sudo systemctl restart blog

Skrypt dostaje klucz API na wejściu (nie jest wyświetlany), zakłada w Pocket ID klienta OIDC „odniepamieci.pl” i dopisuje do
`.env.local` bloga: `KONTA_ADRES`, `KONTA_ADRES_WEWN`, `KONTA_KLIENT_ID`, `KONTA_KLIENT_SEKRET`, `KONTA_KLUCZ_API` (oraz `SEKRET_SESJI`,
jeśli go nie ma). Usługa `blog` ma `IPAddressAllow=localhost`, więc serwer bloga łączy się z Pocket ID pod `http://127.0.0.1:1411`
(`KONTA_ADRES_WEWN`); adres publiczny jest tylko dla przeglądarek. Ponowne uruchomienie niczego nie zmienia. Pierwszy administrator panelu i link awaryjny:

    cd /opt/personal_blog && sudo -u blog npx tsx scripts/konta.ts administrator <nazwa użytkownika z kroku 7>

Ta sama komenda z `--link` na końcu to **link awaryjny**: jednorazowy link (ważny godzinę) do połączenia nowego urządzenia, gdy
administrator stracił wszystkie klucze. Konto dostaje (albo odzyskuje) rolę administratora i stan „aktywne”.

Hasło nginx do `/keystatic` zostaje do odbioru kont; jego wyłączenie to osobna komenda po odbiorze.

## Kopie i aktualizacja
- Dane Pocket ID: `/var/lib/pocket-id/data` (baza SQLite, klucz podpisu) + `/etc/pocket-id/pocket-id.env`. Bez
  `ENCRYPTION_KEY` kopia bazy jest bezużyteczna – oba trzymać razem (poza repozytorium).
- Aktualizacja: krok 2 z nowym numerem wersji i sumą z `checksums.txt` wydania, potem `sudo systemctl restart pocket-id`.
- Klucze dostępu są przypisane do adresu `konto.odniepamieci.pl` – zmiana adresu = wszyscy łączą urządzenia od nowa.

# Kopie nocne i odtwarzanie (P5, decyzja właściciela 18.11.2026)

Kopia nocna = to samo archiwum co „pobierz kopię na komputer” w panelu: `content/`, `pliki-archiwum/`, `data/`
(bazy SQLite skopiowane spójnie), `kopia.json`. Katalog `/var/backups/odniepamieci/nocne`, 7 najnowszych
(`odniepamieci-nocna-RRRRMMDD-GGMMSS.tar.gz`). Panel („kopie, eksport, ustawienia”) pokazuje czas ostatniej.

## Włączenie na VPS (zmienia stan serwera – jedna linia)

    sudo install -d -o blog -g blog -m 0750 /var/backups/odniepamieci/nocne && sudo cp /opt/personal_blog/scripts/systemd/odniepamieci-kopia-nocna.service /opt/personal_blog/scripts/systemd/odniepamieci-kopia-nocna.timer /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now odniepamieci-kopia-nocna.timer && sudo systemctl start odniepamieci-kopia-nocna.service && journalctl -u odniepamieci-kopia-nocna -n 5 --no-pager

Sprawdzenie (tylko odczyt): `systemctl list-timers odniepamieci-kopia-nocna.timer --no-pager; ls -lh /var/backups/odniepamieci/nocne`

## Pobieranie przez węzeł domowy (decyzja 13.11: węzeł ciągnie, rrsync -ro, restic)

Na VPS osobny użytkownik tylko do odczytu kopii (w grupie `blog`, archiwa mają prawa 0640):

    sudo adduser --disabled-password --gecos '' kopie && sudo usermod -aG blog kopie

W `~kopie/.ssh/authorized_keys` jedna linia z kluczem węzła domowego:

    command="rrsync -ro /var/backups/odniepamieci/nocne/",restrict ssh-ed25519 AAAA… wezel-domowy

Na węźle domowym (cron/timer po 4:00): `rsync -a kopie@odniepamieci.pl: /srv/kopie/odniepamieci/` i `restic backup`
z retencją 7 dziennych / 4 tygodniowe / 12 miesięcznych (`restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune`).

## Sprawdzenie i odtworzenie kopii

    cd /opt/personal_blog && sudo -u blog npx tsx scripts/sprawdz-kopie.ts /var/backups/odniepamieci/nocne/odniepamieci-nocna-….tar.gz

Rozpakowuje do nowego katalogu w /tmp, sprawdza opis, czytelność treści, bazy SQLite i różnice z bieżącymi danymi –
niczego nie zmienia. Odtworzenie wybranych treści: `--przywroc miejsca/testowo.mdoc` (podgląd), potem to samo z `--tak`
– podmiana jako operacja, którą cofniesz w panelu (ostatnie operacje). `data/` i `pliki-archiwum/` – ręcznie z
rozpakowanej kopii (`--zostaw`), przy zatrzymanej stronie.

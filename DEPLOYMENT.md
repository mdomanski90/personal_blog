# Deployment Guide - Personal Blog

Kompletny przewodnik wdrożenia bloga na własny serwer VPS.

## Wymagania

### Serwer VPS
- Ubuntu 22.04 LTS lub nowszy
- Minimum 1GB RAM
- 10GB przestrzeni dyskowej
- Docker i Docker Compose zainstalowane

### Domena
- Skonfigurowana domena wskazująca na IP serwera
- DNS rekord A: `blog.twojadomena.pl` -> `IP_SERWERA`

## Instalacja Docker na Ubuntu

Jeśli nie masz jeszcze Docker:

```bash
# Update systemu
sudo apt update && sudo apt upgrade -y

# Instalacja Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Dodaj użytkownika do grupy docker
sudo usermod -aG docker $USER
newgrp docker

# Instalacja Docker Compose
sudo apt install docker-compose-plugin -y

# Weryfikacja
docker --version
docker compose version
```

## Deployment na VPS

### Metoda 1: Docker Compose (Rekomendowana)

#### 1. Sklonuj repozytorium

```bash
# Na serwerze VPS
cd /opt
sudo git clone https://github.com/mdomanski90/personal_blog.git
cd personal_blog

# Zmień gałąź na feature/complete-blog-system
git checkout feature/complete-blog-system
```

#### 2. Zainstaluj zależności i zbuduj

```bash
# Build Docker image
docker compose build

# Uruchom kontener
docker compose up -d

# Sprawdź status
docker compose ps
docker compose logs -f
```

#### 3. Sprawdź działanie

```bash
# Test lokalny
curl http://localhost:3000

# Jeśli działa, powinieneś zobaczyć HTML bloga
```

### Metoda 2: Budowa bez Docker

Jeśli wolisz uruchomić bezpośrednio:

```bash
# Zainstaluj Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Zainstaluj zależności
npm install

# Build produkcyjny
npm run build

# Uruchom
npm start
```

## Konfiguracja Nginx jako Reverse Proxy

### 1. Instalacja Nginx

```bash
sudo apt install nginx -y
```

### 2. Konfiguracja virtual host

```bash
sudo nano /etc/nginx/sites-available/blog
```

Wklej:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name blog.twojadomena.pl;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Aktywacja konfiguracji

```bash
# Symlink do sites-enabled
sudo ln -s /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/

# Test konfiguracji
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## SSL/TLS z Let's Encrypt

### Instalacja Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Uzyskanie certyfikatu

```bash
sudo certbot --nginx -d blog.twojadomena.pl

# Postepuj według instrukcji:
# - Podaj email
# - Zaakceptuj ToS
# - Wybierz opcję przekierowania HTTP -> HTTPS
```

### Auto-renewal

Certbot automatycznie konfiguruje odnowienie. Sprawdź:

```bash
# Test odnowienia
sudo certbot renew --dry-run

# Cron job (już skonfigurowany przez certbot)
sudo systemctl status certbot.timer
```

## Zarządzanie treścią

### Dodawanie nowych postów

```bash
# Na serwerze
cd /opt/personal_blog

# Stwórz nowy plik markdown
sudo nano content/posts/nowy-post.md
```

Przykładowa struktura:

```markdown
---
title: "Tytuł posta"
description: "Krótki opis"
date: "2026-02-07T10:00:00.000Z"
category: "Kategoria"
tags: ["tag1", "tag2"]
author: "Twój Nick"
published: true
---

## Nagłówek

Treść posta...
```

### Restart po zmianach

```bash
# Docker
docker compose restart

# Bez Docker (PM2)
pm2 restart blog
```

## Backup Strategy

### Skrypt backup

Utwórz `/opt/backup-blog.sh`:

```bash
#!/bin/bash

DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="/backup/blog"
SOURCE_DIR="/opt/personal_blog"

mkdir -p $BACKUP_DIR

# Backup content (posty)
tar -czf $BACKUP_DIR/content-$DATE.tar.gz $SOURCE_DIR/content

# Backup całego projektu
tar -czf $BACKUP_DIR/full-$DATE.tar.gz $SOURCE_DIR

# Usuń backupy starsze niż 30 dni
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

### Automatyzacja przez cron

```bash
sudo chmod +x /opt/backup-blog.sh

# Edytuj crontab
crontab -e

# Dodaj backup codziennie o 2:00
0 2 * * * /opt/backup-blog.sh >> /var/log/blog-backup.log 2>&1
```

## Monitoring

### Podstawowy healthcheck

```bash
# Status Docker
docker compose ps

# Logi
docker compose logs -f --tail=100

# Zużycie zasobów
docker stats personal_blog
```

### Uptime monitoring (opcjonalnie)

Zainstaluj Uptime Kuma:

```bash
docker run -d --restart=always \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  --name uptime-kuma \
  louislam/uptime-kuma:1
```

Następnie dodaj monitor dla `http://localhost:3000`.

## Aktualizacje

### Aktualizacja kodu

```bash
cd /opt/personal_blog

# Pull najnowszych zmian
git pull origin feature/complete-blog-system

# Rebuild i restart
docker compose down
docker compose build
docker compose up -d
```

### Aktualizacja zależności

```bash
# Sprawdź outdated packages
npm outdated

# Update
npm update

# Rebuild
docker compose build --no-cache
docker compose up -d
```

## Troubleshooting

### Blog nie startuje

```bash
# Sprawdź logi
docker compose logs

# Sprawdź czy port 3000 jest wolny
sudo netstat -tlnp | grep 3000

# Restart
docker compose restart
```

### Posty się nie wyświetlają

```bash
# Sprawdź strukturę plików
ls -la content/posts/

# Sprawdź permisje
sudo chmod -R 755 content/

# Sprawdź format frontmatter (YAML)
head -20 content/posts/problematyczny-post.md
```

### Błędy SSL

```bash
# Odnowienie certyfikatu
sudo certbot renew --force-renewal

# Restart Nginx
sudo systemctl restart nginx
```

### Problemy z pamięcią

```bash
# Sprawdź zużycie
free -h
docker stats

# Wyczyść Docker cache
docker system prune -a
```

## Optymalizacja wydajności

### 1. Nginx caching

Dodaj do `/etc/nginx/sites-available/blog`:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=blog_cache:10m max_size=1g inactive=60m;

location / {
    proxy_cache blog_cache;
    proxy_cache_valid 200 60m;
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
    # ... reszta proxy settings
}
```

### 2. Gzip compression

W `/etc/nginx/nginx.conf`:

```nginx
gzip on;
gzip_vary on;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript;
```

### 3. HTTP/2

Już włączone przez Certbot po konfiguracji SSL.

## Security Best Practices

### 1. Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Fail2ban dla SSH

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

### 3. Automatyczne update systemu

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Kontakt i Wsparcie

W razie problemów:
- Sprawdź logi: `docker compose logs`
- Issues na GitHub: https://github.com/mdomanski90/personal_blog/issues
- Dokumentacja Next.js: https://nextjs.org/docs

## Podsumowanie

Po wykonaniu wszystkich kroków twój blog powinien:
- ✅ Działać na `https://blog.twojadomena.pl`
- ✅ Automatycznie się restartować po restarcie serwera
- ✅ Mieć aktywny SSL/TLS
- ✅ Być backupowany codziennie
- ✅ Być gotowy do dodawania nowych postów

Gratulacje! Twój blog jest gotowy! 🎉

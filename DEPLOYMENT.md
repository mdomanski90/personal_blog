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

### 2. Konfiguracja virtual host z security hardening

```bash
sudo nano /etc/nginx/sites-available/blog
```

Wklej:

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=blog_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=blog_burst:10m rate=50r/s;
limit_conn_zone $binary_remote_addr zone=blog_conn:10m;

server {
    listen 80;
    listen [::]:80;
    server_name blog.twojadomena.pl;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting
    limit_req zone=blog_limit burst=20 nodelay;
    limit_conn blog_conn 10;

    # Client body size limit
    client_max_body_size 10M;
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;

    # Hide nginx version
    server_tokens off;

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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
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

# Postępuj według instrukcji:
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

## Security Hardening

### 1. Firewall (UFW)

```bash
# Reset UFW (opcjonalnie)
sudo ufw --force reset

# Domyślne polityki
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Zezwól na SSH (zmień port jeśli używasz niestandardowego)
sudo ufw allow 22/tcp

# Zezwól na HTTP i HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Włącz firewall
sudo ufw enable

# Sprawdź status
sudo ufw status verbose
```

### 2. Fail2ban dla SSH i Nginx

```bash
# Instalacja
sudo apt install fail2ban -y

# Konfiguracja SSH jail
sudo nano /etc/fail2ban/jail.local
```

Wklej:

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 7200
```

```bash
# Restart fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Sprawdź status
sudo fail2ban-client status
```

### 3. Automatyczne update systemu

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades

# Konfiguracja
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Upewnij się że są włączone security updates:

```
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
```

### 4. Hardening SSH

```bash
sudo nano /etc/ssh/sshd_config
```

Zalecane ustawienia:

```
# Disable root login
PermitRootLogin no

# Disable password authentication (tylko klucze)
PasswordAuthentication no
PubkeyAuthentication yes

# Limit users
AllowUsers twoj_user

# Timeouts
ClientAliveInterval 300
ClientAliveCountMax 2

# Disable empty passwords
PermitEmptyPasswords no

# Protocol
Protocol 2
```

```bash
# Restart SSH
sudo systemctl restart sshd
```

### 5. Docker security

```bash
# Enable Docker security features
sudo nano /etc/docker/daemon.json
```

Dodaj:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "userland-proxy": false,
  "no-new-privileges": true
}
```

```bash
sudo systemctl restart docker
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

### Monitoring script

Utwórz `/opt/monitor-blog.sh`:

```bash
#!/bin/bash

echo "=== Blog Health Check ==="
echo "Date: $(date)"
echo ""

# Check if container is running
if docker ps | grep -q personal_blog; then
    echo "✓ Container is running"
else
    echo "✗ Container is NOT running!"
    docker compose -f /opt/personal_blog/docker-compose.yml up -d
fi

# Check HTTP response
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ $HTTP_CODE -eq 200 ]; then
    echo "✓ HTTP response: $HTTP_CODE"
else
    echo "✗ HTTP response: $HTTP_CODE (expected 200)"
fi

# Check memory usage
MEM_USAGE=$(docker stats --no-stream --format "{{.MemPerc}}" personal_blog)
echo "Memory usage: $MEM_USAGE"

# Check disk space
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')
echo "Disk usage: $DISK_USAGE"

echo "========================"
```

```bash
chmod +x /opt/monitor-blog.sh

# Run every 5 minutes
crontab -e
# Add: */5 * * * * /opt/monitor-blog.sh >> /var/log/blog-monitor.log 2>&1
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
docker compose build --no-cache
docker compose up -d

# Sprawdź logi
docker compose logs -f
```

### Aktualizacja zależności

```bash
# Sprawdź outdated packages
npm outdated

# Update
npm update

# Security audit
npm audit
npm audit fix

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

# Rebuild (może być cached)
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Błędy SSL

```bash
# Odnowienie certyfikatu
sudo certbot renew --force-renewal

# Restart Nginx
sudo systemctl restart nginx

# Sprawdź certyfikat
sudo certbot certificates
```

### Problemy z pamięcią

```bash
# Sprawdź zużycie
free -h
docker stats

# Wyczyść Docker cache
docker system prune -a

# Restart kontenera z niższym limitem
# Edytuj docker-compose.yml:
# memory: 1G (zamiast 2G)
docker compose up -d
```

### Rate limiting - zbyt wiele requestów

```bash
# Sprawdź logi Nginx
sudo tail -f /var/log/nginx/error.log | grep limiting

# Zwiększ limity w /etc/nginx/sites-available/blog
# rate=10r/s -> rate=20r/s
# burst=20 -> burst=50

sudo nginx -t
sudo systemctl reload nginx
```

## Optymalizacja wydajności

### 1. Nginx caching

Dodaj do `/etc/nginx/sites-available/blog`:

```nginx
proxy_cache_path /var/cache/nginx/blog levels=1:2 keys_zone=blog_cache:10m max_size=1g inactive=60m use_temp_path=off;

server {
    # ... existing config
    
    location / {
        proxy_cache blog_cache;
        proxy_cache_valid 200 60m;
        proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
        proxy_cache_bypass $http_cache_control;
        add_header X-Cache-Status $upstream_cache_status;
        
        # ... existing proxy settings
    }
}
```

### 2. Gzip compression

W `/etc/nginx/nginx.conf`:

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
gzip_disable "msie6";
```

### 3. HTTP/2

Już włączone przez Certbot po konfiguracji SSL.

## Performance Monitoring

```bash
# CPU usage
top -bn1 | grep "Cpu(s)"

# Memory
free -h

# Disk I/O
iostat -x 1 5

# Network
iftop

# Docker stats
docker stats --no-stream
```

## Kontakt i Wsparcie

W razie problemów:
1. Sprawdź logi: `docker compose logs`
2. Issues na GitHub: https://github.com/mdomanski90/personal_blog/issues
3. Dokumentacja Next.js: https://nextjs.org/docs
4. SECURITY.md dla problemów z bezpieczeństwem

## Podsumowanie

Po wykonaniu wszystkich kroków twój blog powinien:
- ✅ Działać na `https://blog.twojadomena.pl`
- ✅ Automatycznie się restartować po restarcie serwera
- ✅ Mieć aktywny SSL/TLS
- ✅ Być backupowany codziennie
- ✅ Być zabezpieczony przed podstawowymi atakami
- ✅ Mieć rate limiting
- ✅ Być monitorowany
- ✅ Być gotowy do dodawania nowych postów

Gratulacje! Twój blog jest gotowy! 🎉

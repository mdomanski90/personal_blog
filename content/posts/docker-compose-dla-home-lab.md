---
title: "Docker Compose dla home lab - moja konfiguracja"
description: "Jak zarządzam wszystkimi usługami w moim domowym serwerze używając Docker Compose"
date: "2026-01-28T14:00:00.000Z"
category: "DevOps"
tags: ["docker", "homelab", "linux", "automatyzacja"]
author: "Mateusz Domański"
image: "/RS2.jpg"
published: true
---

## Dlaczego Docker?

Jeśli prowadzisz home lab, Docker to absolutna podstawa. Pozwala na:

- Izolację usług
- Łatwe backupy (volume mounts)
- Prostą migrację między serwerami
- Wersjonowanie konfiguracji w Git
- Szybkie rollbacki przy problemach

## Moja architektura

Wszystkie usługi zarządzam przez pojedynczy `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # Reverse proxy
  traefik:
    image: traefik:v2.10
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik:/etc/traefik
      - ./acme:/acme
    labels:
      - "traefik.enable=true"

  # Home Assistant
  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    container_name: homeassistant
    restart: unless-stopped
    privileged: true
    network_mode: host
    volumes:
      - ./homeassistant:/config
      - /etc/localtime:/etc/localtime:ro

  # Monitoring
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

  # Database
  postgres:
    image: postgres:15-alpine
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_USER: ${DB_USER}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # File browser
  filebrowser:
    image: filebrowser/filebrowser:latest
    container_name: filebrowser
    restart: unless-stopped
    volumes:
      - ./data:/srv
      - ./filebrowser/database.db:/database.db
    ports:
      - "8080:80"

volumes:
  portainer_data:
  postgres_data:
```

## Kluczowe zasady

### 1. Używaj .env dla sekretów

```bash
# .env
DB_PASSWORD=super_secure_password
DB_USER=admin
TZ=Europe/Warsaw
```

### 2. Montuj konfiguracje jako volumes

Zamast budować własne obrazy:

```yaml
volumes:
  - ./config:/app/config  # lokalna konfiguracja
  - data:/app/data        # volume dla danych
```

### 3. Używaj restart policies

```yaml
restart: unless-stopped  # restart po restarcie serwera
```

### 4. Zarządzaj siecią

Dla lepszej izolacji:

```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # brak dostępu do internetu
```

## Backup strategy

### Skrypt backup.sh

```bash
#!/bin/bash

DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/backup/$DATE"

mkdir -p $BACKUP_DIR

# Stop containers
docker-compose stop

# Backup volumes
tar -czf $BACKUP_DIR/volumes.tar.gz ./data ./config

# Backup postgres
docker exec postgres pg_dumpall -U admin > $BACKUP_DIR/postgres.sql

# Start containers
docker-compose start

echo "Backup completed: $BACKUP_DIR"
```

### Automatyzacja przez cron

```bash
# Backup codziennie o 3:00
0 3 * * * /home/user/homelab/backup.sh
```

## Monitoring

### Sprawdzanie statusu

```bash
# Status wszystkich kontenerów
docker-compose ps

# Logi konkretnego serwisu
docker-compose logs -f homeassistant

# Zużycie zasobów
docker stats
```

### Portainer dla GUI

Portainer daje wygodny interfejs webowy do:
- Zarządzania kontenerami
- Przeglądania logów
- Monitorowania zasobów
- Zarządzania volumami

## Update strategy

```bash
#!/bin/bash

# Pull newest images
docker-compose pull

# Recreate containers with new images
docker-compose up -d

# Remove old images
docker image prune -f
```

## Troubleshooting

### Kontenery nie startują?

```bash
# Sprawdź logi
docker-compose logs SERVICE_NAME

# Sprawdź permisje
ls -la ./config/

# Sprawdź zmienne środowiskowe
docker-compose config
```

### Problemy z siecią?

```bash
# Sprawdź sieci
docker network ls

# Usuń nieużywane sieci
docker network prune
```

## Podsumowanie

Docker Compose to fundament każdego home lab. Pozwala na:

- Infrastrukturę jako kod
- Łatwe odtwarzanie środowiska
- Szybkie testy nowych usług
- Proste backupy i migracje

W następnym wpisie pokażę, jak skonfigurować Traefik jako reverse proxy z automatycznymi certyfikatami SSL.

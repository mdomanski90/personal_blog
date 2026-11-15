# Security Policy

## Supported Versions

Aktualnie wspierane wersje bloga personal_blog:

| Wersja | Wsparcie           |
| ------ | ------------------ |
| 1.x    | :white_check_mark: |
| < 1.0  | :x:                |

## Zgłaszanie luk bezpieczeństwa

### Jak zgłosić lukę?

Jeśli znalazłeś lukę bezpieczeństwa w tym projekcie:

1. **NIE** twórz publicznego issue na GitHubie
2. Wyślij email na: **mateuszdomanski@hotmail.com**
3. Dołącz następujące informacje:
   - Opis luki
   - Kroki reprodukcji
   - Potencjalny wpływ
   - Sugerowane rozwiązanie (jeśli masz)

### Czego się spodziewać?

- **Potwierdzenie odbioru**: W ciągu 48 godzin
- **Wstępna ocena**: W ciągu 5 dni roboczych
- **Patch/fix**: W zależności od severity (1-14 dni)
- **Publiczne ujawnienie**: Po wydaniu patcha

### Severity Levels

- **KRYTYCZNY**: Patch w ciągu 24-48h
  - Remote Code Execution (RCE)
  - SQL Injection
  - Authentication bypass

- **WYSOKI**: Patch w ciągu 7 dni
  - XSS (Cross-Site Scripting)
  - Path traversal
  - Information disclosure

- **ŚREDNI**: Patch w ciągu 14 dni
  - CSRF
  - Rate limiting issues
  - Denial of Service

- **NISKI**: W następnym planned release
  - Security misconfiguration
  - Missing security headers

## Obecne zabezpieczenia

Projekt implementuje następujące zabezpieczenia:

### Application Level
- ✅ Input validation i sanitization
- ✅ Path traversal protection
- ✅ XSS prevention przez React i sanityzację markdown
- ✅ Security headers (CSP, HSTS, X-Frame-Options, etc.)
- ✅ Rate limiting (przez Nginx)
- ✅ No dangerous HTML elements w markdown

### Infrastructure Level
- ✅ Docker container isolation
- ✅ Non-root user w kontenerze
- ✅ Resource limits (CPU, Memory)
- ✅ Read-only volumes gdzie możliwe
- ✅ Network isolation
- ✅ Drop unnecessary capabilities

### Deployment Level
- ✅ HTTPS/TLS (Let's Encrypt)
- ✅ Firewall (UFW)
- ✅ Fail2ban dla SSH
- ✅ Automatyczne security updates

## Security Best Practices dla użytkowników

Jeśli wdrażasz ten blog:

1. **Zawsze używaj HTTPS** - skonfiguruj Let's Encrypt
2. **Regularnie aktualizuj** - `git pull && docker compose build`
3. **Monitoruj logi** - `docker compose logs -f`
4. **Backup** - codzienne backupy content/
5. **Firewall** - tylko porty 22, 80, 443
6. **SSH** - wyłącz password auth, tylko klucze
7. **Fail2ban** - ochrona przed brute-force

## Automatyczne skanowanie

Projekt wykorzystuje:
- **Dependabot** - automatyczne update zależności
- **GitHub Actions** - security scan przy każdym PR
- **npm audit** - sprawdzanie znanych CVE
- **Trivy** - skanowanie obrazów Docker

## Znane ograniczenia

- Blog jest statyczny (SSG) - brak uwierzytelniania użytkowników
- Nie ma rate limiting na poziomie aplikacji (tylko Nginx)
- Markdown renderowany po stronie serwera (bez sandbox)

## Hall of Fame

Podziękowania dla osób, które pomogły zabezpieczyć ten projekt:

- (Twoje imię może być tutaj!)

## Kontakt

W sprawach bezpieczeństwa:
- Email: mateuszdomanski@hotmail.com
- GitHub: [@mdomanski90](https://github.com/mdomanski90)

---

**Ostatnia aktualizacja**: 2026-02-06

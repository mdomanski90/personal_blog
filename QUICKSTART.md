# 🚀 Quickstart - Natychmiastowe Akcje

**Data aktualizacji:** 6 lutego 2026, 21:25 CET

---

## ✅ Co zostało zrobione?

### Zaktualizowane zależności:
- ✅ Next.js 14.2.5 → **16.1.6** (3 CVE załatane!)
- ✅ Tailwind CSS 3.4.1 → **4.1.18**
- ✅ ESLint 8 → **9.39.2**
- ✅ Wszystkie inne pakiety zaktualizowane

### Utworzone dokumenty:
- ✅ [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) - Raport bezpieczeństwa
- ✅ [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Instrukcja deployment
- ✅ [BRANCH_PROTECTION_SETUP.md](./BRANCH_PROTECTION_SETUP.md) - Zabezpieczenie brancha
- ✅ [README.md](./README.md) - Zaktualizowany opis
- ✅ `.github/workflows/ci.yml.example` - Przykładowe CI/CD

---

## 🔴 PRIORYTET 1: Zabezpiecz main branch (3 minuty)

**WAŻNE:** Twój main branch NIE jest zabezpieczony!

### Szybkie kroki:

1. **Otwórz ustawienia:**
   - Link: https://github.com/mdomanski90/personal_blog/settings/branches

2. **Kliknij "Add rule"**

3. **Wpisz:** `main` w "Branch name pattern"

4. **Zaznacz minimum:**
   - ☑️ Require a pull request before merging (approvals: 0)
   - ☑️ Require linear history
   - ❌ Allow force pushes (NIE zaznaczaj!)
   - ❌ Allow deletions (NIE zaznaczaj!)

5. **Kliknij "Create"**

**Szczegóły:** Zobacz [BRANCH_PROTECTION_SETUP.md](./BRANCH_PROTECTION_SETUP.md)

---

## 🟫 PRIORYTET 2: Deploy na VPS (15 minut)

### Quick Deploy Commands:

```bash
# 1. SSH do VPS
ssh user@your-vps-ip

# 2. Backup (na wszelki wypadek)
cd /path/to/personal_blog
sudo tar -czf ~/blog-backup-$(date +%Y%m%d).tar.gz .

# 3. Pull zm zmian
git pull origin main

# 4. Zainstaluj zależności
rm -rf node_modules package-lock.json
npm install

# 5. Build
npm run build

# 6. Restart (PM2)
pm2 restart blog

# 7. Sprawdź
curl -I http://localhost:3000
# Powinno zwrócić: HTTP/1.1 200 OK
```

**Pełne instrukcje:** Zobacz [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## 📝 PRIORYTET 3: Weryfikacja (5 minut)

### Po deployment sprawdź:

```bash
# 1. Wersje pakietów
npx next --version  # Powinno: 16.1.6
npm list tailwindcss  # Powinno: 4.1.18

# 2. Audyt bezpieczeństwa
npm audit  # Powinno: 0 vulnerabilities

# 3. Test w przeglądarce
# Otwórz: https://twoja-domena.com
# Sprawdź DevTools Console (F12) - brak błędów
```

---

## 📦 Następne kroki (opcjonalne)

### Za tydzień/miesiąc:

1. **Włącz CI/CD** (opcjonalne)
   - Zmień nazwę: `.github/workflows/ci.yml.example` → `ci.yml`
   - Dostosuj workflow do swoich potrzeb
   - Commity będą automatycznie testowane

2. **Skonfiguruj signed commits** (opcjonalne)
   - Instrukcje w [BRANCH_PROTECTION_SETUP.md](./BRANCH_PROTECTION_SETUP.md)
   - Większa weryfikacja autorów commitów

3. **Dodaj monitoring** (opcjonalne)
   ```bash
   # Na VPS:
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   ```

4. **Optymalizuj nginx** (jeśli używasz)
   - Cache headers dla `/_next/static`
   - Gzip compression
   - SSL/TLS optimization

---

## 🚨 Co zrobić gdy coś pójdzie nie tak?

### Rollback do poprzedniej wersji:

```bash
# Na VPS:
cd /path/to/personal_blog
pm2 stop blog

# Wróć do poprzedniego commitu
git reset --hard ae729c0  # Commit przed aktualizacjami

# Zainstaluj stare zależności
rm -rf node_modules package-lock.json
npm install
npm run build

# Restart
pm2 restart blog
```

**Pełna procedura:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - sekcja "Rollback"

---

## 📊 Status projektu

| Kategoria | Status | Notatki |
|-----------|--------|----------|
| **Zależności** | 🟢 Zaktualizowane | Wszystkie najnowsze wersje |
| **Bezpieczeństwo** | 🟢 Załatane | 3 CVE naprawione |
| **Branch Protection** | 🔴 Brak | **DO ZROBIENIA!** |
| **Deployment** | 🟡 Oczekuje | Gotowe do wdrożenia |
| **CI/CD** | 🟡 Opcjonalne | Przykład gotowy |

---

## ✅ Checklist

### Natychmiast (teraz):
- [ ] 🔴 Włącz branch protection dla `main`
- [ ] 🟫 Deploy na VPS
- [ ] ✅ Zweryfikuj deployment

### Opcjonalnie (później):
- [ ] Zamknij stare PR (#5, #6, #8, #9)
- [ ] Włącz GitHub Actions CI/CD
- [ ] Skonfiguruj signed commits
- [ ] Dodaj monitoring
- [ ] Optymalizuj nginx/caddy

---

## 📞 Pomoc

### Pytania?

- **Branch protection:** [BRANCH_PROTECTION_SETUP.md](./BRANCH_PROTECTION_SETUP.md)
- **Deployment:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Bezpieczeństwo:** [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)
- **Projekt:** [README.md](./README.md)

### Problemy?

1. Sprawdź logi: `pm2 logs blog`
2. Sprawdź status: `pm2 status blog`
3. Sprawdź build: `npm run build -- --debug`
4. Zobacz troubleshooting w [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## 🎯 TL;DR (za krótkie; nie przeczytałem)

```bash
# 1. Zabezpiecz branch (przez przeglądarkę):
https://github.com/mdomanski90/personal_blog/settings/branches
# → Add rule → Branch: "main" → Require PR → Disable force push

# 2. Deploy (przez SSH):
ssh user@vps
cd /path/to/blog && git pull && npm install && npm run build && pm2 restart blog

# 3. Sprawdź:
curl -I https://twoja-domena.com  # Powinno: 200 OK

# GOTOWE! 🎉
```

---

**Wszystko zaktualizowane i gotowe!** 🚀  
**Następny krok:** Włącz branch protection + Deploy na VPS

**Powodzenia!** 👍

# 🛡️ Branch Protection Setup Guide

**WAŻNE:** Twój main branch nie jest zabezpieczony! To zagrożenie bezpieczeństwa.

---

## ⚠️ Dlaczego to ważne?

Bez branch protection możesz przypadkowo:
- ❌ Force push i nadpisać historię commitów
- ❌ Usunąć cały branch `main`
- ❌ Zmergować buggy kod bez review
- ❌ Pushować bezpośrednio bez testów

**Po zabezpieczeniu:**
- ✅ Historia commitów jest bezpieczna
- ✅ Nie można usunąć brancha
- ✅ Opcjonalne: Wymagaj PR przed merge
- ✅ Opcjonalne: Wymagaj testów CI/CD

---

## 🔧 Krok po kroku - Zabezpieczenie main branch

### 1. Przejdź do Settings

1. Otwórz: https://github.com/mdomanski90/personal_blog
2. Kliknij zakładkę **"Settings"** (góra strony)
3. W lewym menu kliknij **"Branches"**

### 2. Dodaj regułę ochrony

1. Znajdź sekcję **"Branch protection rules"**
2. Kliknij przycisk **"Add rule"** lub **"Add branch protection rule"**

### 3. Skonfiguruj regułę

#### **Branch name pattern:**
```
main
```

#### **Zalecane ustawienia dla solo developera:**

##### ✅ **PODSTAWOWE (KONIECZNE):**

- ☑️ **Require a pull request before merging**
  - ☐ Require approvals: `0` (bo pracujesz sam)
  - ☑️ **Dismiss stale pull request approvals when new commits are pushed**
  - ☐ Require review from Code Owners (opcjonalne)

##### ✅ **OCHRONA PRZED PRZYPADKOWYMI AKCJAMI:**

- ☐ **Require status checks to pass before merging** (włącz gdy masz CI/CD)
  - Jeśli masz GitHub Actions, wybierz required checks

- ☐ **Require conversation resolution before merging** (opcjonalne)

- ☐ **Require signed commits** (opcjonalne - ale zalecane!)

- ☑️ **Require linear history** ✅ **ZALECANE**
  - Zapobiega mergom, wymusza rebase
  - Czysta historia commitów

- ☐ **Require merge queue** (zbyt advanced dla solo projektu)

- ☐ **Require deployments to succeed** (jeśli masz automated deployment)

- ☐ **Lock branch** ❌ NIE włączaj (zablokuje wszystkie zmiany)

##### ✅ **WAŻNE - OCHRONA PRZED FORCE PUSH:**

- ☐ **Do not allow bypassing the above settings** 
  - ⚠️ Jeśli zaznaczysz, nawet Ty jako owner nie będziesz mógł obejść reguł
  - **Zalecam:** NIE zaznaczaj (zachowasz kontrolę)

- ☐ **Restrict who can push to matching branches**
  - Zostaw puste (tylko Ty masz dostęp)

##### ❌ **BLOKADA FORCE PUSH I USUWANIA:**

- ☐ **Allow force pushes** ❌ **NIE ZAZNACZAJ**
  - To jest kluczowe zabezpieczenie!
  
- ☐ **Allow deletions** ❌ **NIE ZAZNACZAJ**
  - Zapobiega przypadkowemu usunięciu main

### 4. Zapisz regułę

1. Przewiń na dół strony
2. Kliknij **"Create"** lub **"Save changes"**

---

## ✅ Zalecana konfiguracja dla Twojego projektu

### **Minimalna (Solo Developer):**

```yaml
Branch name pattern: main

Zaznacz:
  ✅ Require a pull request before merging
     - Require approvals: 0
  ✅ Require linear history
  ❌ Allow force pushes (NIE zaznaczaj)
  ❌ Allow deletions (NIE zaznaczaj)
```

### **Zalecana (Solo Developer + CI/CD):**

```yaml
Branch name pattern: main

Zaznacz:
  ✅ Require a pull request before merging
     - Require approvals: 0
     - Dismiss stale pull request approvals: ✅
  ✅ Require status checks to pass before merging
     - Require branches to be up to date: ✅
     - Status checks: [wybierz swoje GitHub Actions]
  ✅ Require linear history
  ✅ Require signed commits (opcjonalne)
  ❌ Allow force pushes (NIE zaznaczaj)
  ❌ Allow deletions (NIE zaznaczaj)
```

### **Maximum Security (Produkcja + Zespół):**

```yaml
Branch name pattern: main

Zaznacz:
  ✅ Require a pull request before merging
     - Require approvals: 1 (lub więcej)
     - Dismiss stale reviews: ✅
     - Require review from Code Owners: ✅
  ✅ Require status checks to pass before merging
     - Require branches to be up to date: ✅
     - All CI/CD checks must pass
  ✅ Require conversation resolution
  ✅ Require signed commits
  ✅ Require linear history
  ✅ Do not allow bypassing settings
  ❌ Allow force pushes
  ❌ Allow deletions
```

---

## 🔄 Workflow po włączeniu branch protection

### Przed (bez ochrony):
```bash
# Mogłeś pushować bezpośrednio do main
git add .
git commit -m "changes"
git push origin main  # ✅ Działa

# Mogłeś force pushować
git push --force origin main  # ⚠️ NIEBEZPIECZNE!
```

### Po włączeniu ochrony:
```bash
# 1. Utwórz feature branch
git checkout -b feature/moja-zmiana

# 2. Dokonaj zmian
git add .
git commit -m "feat: dodaj nową funkcję"

# 3. Push feature brancha
git push origin feature/moja-zmiana

# 4. Utwórz Pull Request na GitHubie
# https://github.com/mdomanski90/personal_blog/compare

# 5. Zmerguj PR przez interface
# (możesz to zrobić od razu, bo nie wymagasz approvals)

# 6. Pull zmian lokalnie
git checkout main
git pull origin main

# 7. Usuń lokalny feature branch
git branch -d feature/moja-zmiana
```

---

## 🚀 Szybkie zmiany (hotfix)

Jeśli potrzebujesz szybkiej zmiany:

### Opcja 1: GitHub Web Editor
```
1. Otwórz plik na GitHubie
2. Kliknij ikonę ołówka (Edit)
3. Dokonaj zmian
4. Na dole wybierz "Create a new branch for this commit"
5. Utwórz PR
6. Zmerguj natychmiast (sam możesz to zrobić)
```

### Opcja 2: Lokalny PR workflow
```bash
# Szybki jednoliniowiec
git checkout -b hotfix/quick-fix && \
  git add . && \
  git commit -m "hotfix: quick fix" && \
  git push origin hotfix/quick-fix

# Potem zmerguj PR na GitHubie
```

### Opcja 3: GitHub CLI (gh)
```bash
# Jeśli masz zainstalowane gh CLI
gh pr create --fill
gh pr merge --merge
```

---

## ⚡ Konfiguracja Git dla signed commits (opcjonalne)

Jeśli włączysz "Require signed commits":

### 1. Wygeneruj GPG key
```bash
# Linux/Mac
gpg --full-generate-key

# Wybierz:
# - RSA and RSA
# - 4096 bits
# - Twój email z GitHuba
```

### 2. Dodaj GPG key do GitHuba
```bash
# Wyświetl klucz
gpg --list-secret-keys --keyid-format=long

# Eksportuj public key
gpg --armor --export YOUR_KEY_ID

# Skopiuj output i dodaj w:
# GitHub Settings → SSH and GPG keys → New GPG key
```

### 3. Skonfiguruj Git
```bash
# Ustaw signing key
git config --global user.signingkey YOUR_KEY_ID

# Automatyczne signowanie
git config --global commit.gpgsign true

# Teraz wszystkie commity będą signed
git commit -m "feat: signed commit" # Automatycznie signed
```

---

## 🧪 Test branch protection

Po włączeniu, przetestuj:

### Test 1: Force push (powinno być zablokowane)
```bash
git checkout main
echo "test" >> README.md
git add README.md
git commit --amend --no-edit
git push --force origin main

# Oczekiwany wynik:
# ! [remote rejected] main -> main (protected branch hook declined)
# ✅ DOBRZE - force push zablokowany!
```

### Test 2: Bezpośredni push (powinno być zablokowane)
```bash
git checkout main
echo "test" >> README.md
git add README.md
git commit -m "test"
git push origin main

# Oczekiwany wynik (jeśli wymagasz PR):
# ! [remote rejected] main -> main (protected branch hook declined)
# ✅ DOBRZE - wymagany PR!
```

### Test 3: Przez PR (powinno działać)
```bash
git checkout -b test/branch-protection
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "test: branch protection"
git push origin test/branch-protection

# Utwórz i zmerguj PR
# ✅ DZIAŁA - przez PR jest OK!
```

---

## 🔓 Awaryjne wyłączenie ochrony (tylko w nagłych przypadkach)

Jeśli coś pójdzie nie tak:

1. Settings → Branches
2. Znajdź regułę dla `main`
3. Kliknij "Delete" przy regule
4. Potwierdź usunięcie
5. **Teraz możesz pushować bezpośrednio**
6. **PAMIĘTAJ:** Włącz ochronę z powrotem!

---

## 📋 Checklist - Po włączeniu ochrony

- [ ] Branch protection włączone dla `main`
- [ ] Przetestowane: force push blokowany
- [ ] Przetestowane: bezpośredni push blokowany (jeśli wymagasz PR)
- [ ] Przetestowane: merge przez PR działa
- [ ] Zespół/collaborators poinformowani o zmianach
- [ ] Dokumentacja zaktualizowana
- [ ] CI/CD pipelines działają (jeśli masz)

---

## 🎯 FAQ

### Q: Czy mogę pushować do innych branchy?
A: **TAK!** Ochrona dotyczy tylko `main`. Feature branche działają normalnie.

### Q: Co jeśli pracuję sam?
A: Nadal zalecam włączyć ochronę. Chroni przed przypadkowymi błędami.

### Q: Czy mogę tymczasowo wyłączyć ochronę?
A: TAK, ale nie zalecam. Lepiej użyj PR workflow.

### Q: Co z hotfixami?
A: Użyj szybkiego PR workflow (patrz sekcja powyżej).

### Q: Czy to spowolni development?
A: Minimalnie. Z 0 approvals możesz mergować natychmiast.

### Q: Co jeśli zapomnę i spróbuję pushować do main?
A: Git wyrzuci błąd i przypomni, że musisz użyć PR.

---

## 🔗 Przydatne linki

- [GitHub Docs - Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub Docs - Signed Commits](https://docs.github.com/en/authentication/managing-commit-signature-verification)
- [GitHub CLI](https://cli.github.com/) - Szybkie PR z CLI

---

## ✅ Następne kroki

1. **Teraz:** Włącz branch protection (instrukcje powyżej)
2. **Za 5 min:** Przetestuj workflow
3. **Opcjonalnie:** Skonfiguruj signed commits
4. **Opcjonalnie:** Dodaj GitHub Actions CI/CD

---

**Status:** ⚠️ **Branch NIE jest zabezpieczony** → Włącz ochronę ASAP!  
**Priorytet:** 🔴 **WYSOKI**  
**Czas:** ~3 minuty

---

**Link do ustawień:**  
https://github.com/mdomanski90/personal_blog/settings/branches

**Kliknij tutaj, aby włączyć ochronę!** 👆

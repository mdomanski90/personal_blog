# Personal Blog - odniepamieci.pl

## ⚡ Quick Start

### Rozwój lokalny

```bash
# Instalacja zależności
npm install

# Uruchomienie dev server
npm run dev

# Otwórz http://localhost:3000
```

### Dodawanie postów

Utwórz nowy plik `.md` w `content/posts/`:

```markdown
---
title: "Tytuł posta"
description: "Krótki opis dla SEO"
date: "2026-02-07T10:00:00.000Z"
category: "Kategoria"
tags: ["tag1", "tag2"]
author: "Autor"
published: true
---

Treść w Markdown...
```

## 📚 Stack technologiczny

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + SASS
- **Content**: Markdown + gray-matter
- **Deployment**: Docker + Docker Compose

## 🚀 Deployment

Pełna dokumentacja deployment na VPS: [DEPLOYMENT.md](./DEPLOYMENT.md)

### Docker (produkcja)

```bash
# Build i uruchomienie
docker compose up -d

# Logi
docker compose logs -f

# Stop
docker compose down
```

## 📝 Struktura projekt

```
personal_blog/
├── content/
│   └── posts/              # Pliki markdown z postami
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── [slug]/         # Dynamiczne strony postów
│   │   ├── page.tsx        # Homepage
│   │   └── layout.tsx      # Root layout
│   ├── components/         # Komponenty React
│   ├── lib/                # Utility functions
│   │   └── posts.ts        # Posts management
│   ├── types/              # TypeScript types
│   └── styles/             # Global styles
├── public/                 # Static assets
├── Dockerfile
├── docker-compose.yml
└── DEPLOYMENT.md          # Deployment guide
```

## ✨ Features

- ✅ Static Site Generation (SSG)
- ✅ Markdown posts z frontmatter
- ✅ Syntax highlighting dla kodu
- ✅ GitHub Flavored Markdown (GFM)
- ✅ SEO friendly
- ✅ Responsive design
- ✅ Dark mode support
- ✅ Docker ready
- ✅ TypeScript

## 🛠️ Rozwój

### Dostępne komendy

```bash
npm run dev      # Development server
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint
```

### Testowanie build produkcyjnego

```bash
npm run build
npm start
```

## 📝 License

MIT License - wolne do użytku osobistego i komercyjnego.

## 👤 Autor

Mateusz Domański  
GitHub: [@mdomanski90](https://github.com/mdomanski90)

## 🤝 Contributing

Jest to projekt osobisty, ale sugestie i pull requesty są mile widziane!

## 📞 Support

W razie problemów:
1. Sprawdź [DEPLOYMENT.md](./DEPLOYMENT.md) - Troubleshooting
2. Załóż issue na GitHubie
3. Sprawdź logi: `docker compose logs`

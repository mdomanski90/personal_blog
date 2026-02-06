# 📝 Personal Blog - odniepamieci.pl

**Modern, Fast, Secure Blog Platform**

Built with the latest web technologies and best practices.

---

## 🚨 Quick Actions

🔴 **URGENT:** Your main branch is not protected! → [Fix it now](./BRANCH_PROTECTION_SETUP.md)  
🟫 **READY:** Deploy latest updates to VPS → [Deployment Guide](./DEPLOYMENT_GUIDE.md)  
🚀 **START HERE:** New to this repo? → [Quickstart Guide](./QUICKSTART.md)

---

## 🚀 Tech Stack

### Core Framework:
- **Next.js 16.1.6** - React framework with App Router
- **React 18** - Latest React with concurrent features
- **TypeScript 5** - Type-safe development

### Styling:
- **Tailwind CSS 4.1.18** - Utility-first CSS framework
- **SASS** - CSS preprocessor for custom styles
- **next-themes** - Dark/light theme support

### Content:
- **Markdown** - Blog posts written in Markdown
- **react-markdown** - Markdown rendering
- **gray-matter** - Front matter parsing
- **remark-gfm** - GitHub Flavored Markdown

### UI Components:
- **Radix UI** - Accessible component primitives
- **react-syntax-highlighter** - Code syntax highlighting
- **Next.js Font Optimization** - Google Fonts (Lato, Open Sans)

### Development:
- **ESLint 9** - Code linting
- **TypeScript** - Static type checking
- **ts-node** - TypeScript execution

---

## 📊 Project Status

| Category | Status | Action |
|----------|--------|--------|
| **Security** | 🟢 All CVEs patched | [View Report](./SECURITY_AUDIT.md) |
| **Dependencies** | 🟢 Up-to-date | Last: Feb 6, 2026 |
| **Branch Protection** | 🔴 Not enabled | [Enable Now](./BRANCH_PROTECTION_SETUP.md) |
| **Deployment** | 🟡 Ready | [Deploy Guide](./DEPLOYMENT_GUIDE.md) |
| **Build** | ✅ Passing | `npm run build` |
| **TypeScript** | ✅ No errors | `npx tsc --noEmit` |
| **Audit** | ✅ 0 vulnerabilities | `npm audit` |

**Last Updated:** February 6, 2026

---

## 🔥 Recent Updates (Feb 6, 2026)

### Major Version Updates:
- ✅ **Next.js** 14.2.5 → **16.1.6** (Security patches!)
- ✅ **Tailwind CSS** 3.4.1 → **4.1.18**
- ✅ **ESLint** 8 → **9.39.2**
- ✅ **All dependencies** updated

### Security Fixes:
- ✅ CVE-2025-59471 - Memory exhaustion protection
- ✅ CVE-2025-59472 - Image optimization security
- ✅ CVE-2026-23864 - Additional hardening

➡️ **See full details:** [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)

---

## 🛠️ Quick Start

### Prerequisites:
- Node.js 18.17+ or 20+
- npm or yarn

### Installation:

```bash
# Clone repository
git clone https://github.com/mdomanski90/personal_blog.git
cd personal_blog

# Install dependencies
npm install

# Run development server
npm run dev

# Open browser
open http://localhost:3000
```

### Available Scripts:

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## 📝 Project Structure

```
personal_blog/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── [slug]/       # Dynamic blog post pages
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Homepage
│   ├── components/       # React components
│   │   ├── header.tsx
│   │   └── footer.tsx
│   └── styles/           # Global styles
├── public/              # Static files
├── posts/               # Markdown blog posts
├── .github/workflows/   # CI/CD examples
├── tailwind.config.ts   # Tailwind configuration
├── tsconfig.json        # TypeScript config
└── package.json         # Dependencies
```

---

## 🔒 Security

### Recent Security Updates:

- ✅ **CVE-2025-59471** - Fixed (Next.js 16.1.5)
- ✅ **CVE-2025-59472** - Fixed (Next.js 16.1.5)
- ✅ **CVE-2026-23864** - Fixed (Next.js 16.1.5)

### Security Status:
- 🟢 **0 vulnerabilities** found
- 🟢 All dependencies up-to-date
- 🔴 Branch protection **not enabled** → [Fix now](./BRANCH_PROTECTION_SETUP.md)

**Full Security Report:** [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)

---

## 🚀 Deployment

This project is designed to be deployed on a VPS.

### Quick Deploy:

```bash
# On VPS:
git pull origin main
rm -rf node_modules package-lock.json
npm install
npm run build
pm2 restart blog
```

### Full Documentation:
- 📚 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Complete VPS deployment guide
- 🚀 [QUICKSTART.md](./QUICKSTART.md) - Quick reference for immediate actions
- 🛡️ [BRANCH_PROTECTION_SETUP.md](./BRANCH_PROTECTION_SETUP.md) - Secure your repository

---

## ✨ Features

- ✅ **Fast** - Built with Next.js 16 and optimized for performance
- ✅ **Secure** - All security patches applied, 0 vulnerabilities
- ✅ **Modern** - Latest React 18, TypeScript, Tailwind v4
- ✅ **Responsive** - Mobile-first design
- ✅ **Dark Mode** - Theme switching support
- ✅ **SEO Friendly** - Metadata API, semantic HTML
- ✅ **Type Safe** - Full TypeScript coverage
- ✅ **Markdown** - Write posts in Markdown
- ✅ **Syntax Highlighting** - Code blocks with syntax highlighting
- ✅ **Font Optimization** - Automatic font loading optimization

---

## 📚 Documentation

### Getting Started:
- 🚀 **[QUICKSTART.md](./QUICKSTART.md)** - Start here! Quick reference for all tasks
- 📝 **[README.md](./README.md)** - This file

### Security & Deployment:
- 🔒 **[SECURITY_AUDIT.md](./SECURITY_AUDIT.md)** - Security review & compatibility analysis
- 🟫 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - VPS deployment instructions
- 🛡️ **[BRANCH_PROTECTION_SETUP.md](./BRANCH_PROTECTION_SETUP.md)** - Protect your main branch

### Development:
- 🔧 **[.github/workflows/ci.yml.example](./.github/workflows/ci.yml.example)** - CI/CD example
- 💻 **[tailwind.config.ts](./tailwind.config.ts)** - Tailwind configuration
- 📦 **[package.json](./package.json)** - Dependencies & scripts

---

## 📝 Quick Links

### Repository:
- **Settings:** https://github.com/mdomanski90/personal_blog/settings
- **Branch Protection:** https://github.com/mdomanski90/personal_blog/settings/branches
- **Pull Requests:** https://github.com/mdomanski90/personal_blog/pulls
- **Issues:** https://github.com/mdomanski90/personal_blog/issues

### Helpful Commands:
```bash
# Check versions
npx next --version          # Next.js version
npm list tailwindcss        # Tailwind version
npm audit                   # Security audit

# Development
npm run dev                 # Start dev server
npm run build               # Build production
npm run lint                # Run linter

# Git workflow (with branch protection)
git checkout -b feature/my-feature
git add . && git commit -m "feat: my feature"
git push origin feature/my-feature
# Then create PR on GitHub
```

---

## 🛡️ Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## 👏 Contributing

This is a personal blog project, but feel free to fork and adapt for your own use.

### Workflow:
1. Create feature branch: `git checkout -b feature/name`
2. Make changes & commit: `git commit -m "feat: description"`
3. Push: `git push origin feature/name`
4. Create Pull Request on GitHub
5. Merge PR (auto-checks will run if CI/CD enabled)

---

## 📝 License

Private repository - All rights reserved.

---

## 📧 Contact

**Blog:** odniepamieci.pl  
**GitHub:** [@mdomanski90](https://github.com/mdomanski90)

---

## 📌 Next Steps

1. 🔴 **[Enable branch protection](./BRANCH_PROTECTION_SETUP.md)** (3 minutes)
2. 🟫 **[Deploy to VPS](./DEPLOYMENT_GUIDE.md)** (15 minutes)
3. ✅ **[Verify deployment](./QUICKSTART.md#verification)** (5 minutes)
4. 📦 **Optionally enable CI/CD** (rename `.github/workflows/ci.yml.example`)

---

**Built with ❤️ using Next.js 16 and Tailwind CSS 4**

**Status:** 🟢 Ready for deployment | 🔴 Branch protection needed

# 📝 Personal Blog - odniepamieci.pl

**Modern, Fast, Secure Blog Platform**

Built with the latest web technologies and best practices.

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

| Category | Status |
|----------|--------|
| **Security** | 🟢 All CVEs patched |
| **Dependencies** | 🟢 Up-to-date |
| **Build** | ✅ Passing |
| **TypeScript** | ✅ No errors |
| **Audit** | ✅ 0 vulnerabilities |

**Last Updated:** February 6, 2026

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

See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for detailed security information.

---

## 🚀 Deployment

This project is designed to be deployed on a VPS.

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

### Quick Deploy:

```bash
# On VPS:
git pull origin main
npm install
npm run build
pm2 restart blog
```

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

- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) - Security review and compatibility analysis
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - VPS deployment instructions

---

## 🛡️ Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## 👏 Contributing

This is a personal blog project, but feel free to fork and adapt for your own use.

---

## 📝 License

Private repository - All rights reserved.

---

## 📧 Contact

**Blog:** odniepamieci.pl  
**GitHub:** [@mdomanski90](https://github.com/mdomanski90)

---

**Built with ❤️ using Next.js 16 and Tailwind CSS 4**

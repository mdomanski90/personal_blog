# 🚀 Deployment Guide - VPS Setup

**Last Updated:** February 6, 2026  
**Next.js Version:** 16.1.6  
**Tailwind CSS:** 4.1.18

---

## 📊 What Changed?

This deployment includes major updates:

- ✅ **Next.js 14.2.5 → 16.1.6** (security patches)
- ✅ **Tailwind CSS 3.4.1 → 4.1.18**
- ✅ **ESLint 8 → 9**
- ✅ **Multiple dependency updates**

**Security:** 3 CVEs patched ✅  
**Breaking Changes:** None affecting your code ✅

---

## 🔧 Prerequisites

### On Your VPS:

```bash
# Verify Node.js version (needs v18.17+ or v20+)
node --version
# Should be >= 18.17.0

# If not, update Node.js:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify npm
npm --version
```

---

## 📦 Step 1: Backup Current Setup

**IMPORTANT:** Always backup before major updates!

```bash
# SSH into VPS
ssh your-user@your-vps-ip

# Navigate to project directory
cd /path/to/personal_blog

# Create backup
sudo tar -czf ~/blog-backup-$(date +%Y%m%d).tar.gz .

# Verify backup
ls -lh ~/blog-backup-*.tar.gz
```

---

## 🔄 Step 2: Pull Latest Changes

```bash
# Check current git status
git status

# Stash any local changes (if needed)
git stash

# Pull latest from GitHub
git pull origin main

# Verify you're on the latest commit
git log --oneline -3
# Should show:
# d3a2c6e docs: add security audit report
# d0353a7 feat: migrate to Tailwind CSS v4
# 0288cf6 chore: update all dependencies
```

---

## 📚 Step 3: Install Dependencies

```bash
# Remove old node_modules and lock file
rm -rf node_modules package-lock.json

# Install fresh dependencies
npm install

# This will install:
# - Next.js 16.1.6
# - Tailwind CSS 4.1.18
# - ESLint 9.39.2
# - All other updated packages

# Verify installation
npm list next tailwindcss eslint
```

**Expected output:**
```
├── next@16.1.6
├── tailwindcss@4.1.18
└── eslint@9.39.2
```

---

## 🔨 Step 4: Build Production Bundle

```bash
# Clean previous build
rm -rf .next

# Build for production
npm run build

# This should complete successfully with:
# - Compiled successfully
# - No errors
# - Route info displayed
```

**What to watch for:**
- ✅ No TypeScript errors
- ✅ No Tailwind CSS warnings
- ✅ All pages compile successfully
- ❌ If errors occur, see "Troubleshooting" section below

---

## 🔁 Step 5: Restart Application

### Option A: Using PM2 (Recommended)

```bash
# List running processes
pm2 list

# Restart your blog
pm2 restart blog

# Check logs
pm2 logs blog --lines 50

# Verify status
pm2 status blog
```

### Option B: Using systemd

```bash
# Restart service
sudo systemctl restart your-blog-service

# Check status
sudo systemctl status your-blog-service

# View logs
sudo journalctl -u your-blog-service -f
```

### Option C: Manual start

```bash
# Kill existing process
pkill -f "next start"

# Start in production mode
npm run start

# Or with nohup for background:
nohup npm run start > blog.log 2>&1 &
```

---

## ✔️ Step 6: Verify Deployment

### Test 1: Check Application Health

```bash
# Test local response
curl -I http://localhost:3000

# Should return:
# HTTP/1.1 200 OK
```

### Test 2: Check Public Access

```bash
# From your local machine:
curl -I https://your-domain.com

# Should return 200 OK
```

### Test 3: Browser Testing

Open in browser:
1. Visit: `https://your-domain.com`
2. Open DevTools (F12) → Console tab
3. Check for errors (should be none)
4. Verify styling loads correctly
5. Test navigation between pages

### Test 4: Performance Check

```bash
# Check response time
time curl -s https://your-domain.com > /dev/null

# Should be < 1 second
```

---

## 🐛 Troubleshooting

### Issue: Build fails with TypeScript errors

**Solution:**
```bash
# Check TypeScript version
npm list typescript

# Rebuild with verbose output
npm run build -- --debug
```

### Issue: Tailwind CSS classes not working

**Solution:**
```bash
# Verify Tailwind config
cat tailwind.config.ts

# Force rebuild CSS
rm -rf .next
npm run build
```

### Issue: Application won't start

**Solution:**
```bash
# Check port availability
sudo lsof -i :3000

# Kill blocking process
sudo kill -9 <PID>

# Try starting again
npm run start
```

### Issue: 500 errors on certain routes

**Solution:**
```bash
# Check logs for details
pm2 logs blog --lines 100

# Common causes:
# - Missing environment variables
# - File permissions issues
# - Database connection problems (if any)
```

---

## 🔙 Rollback Procedure

If something goes wrong:

### Quick Rollback:

```bash
# Stop application
pm2 stop blog

# Revert to previous version
git reset --hard ae729c0  # Commit before updates

# Restore old dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build

# Restart
pm2 restart blog
```

### Full Rollback from Backup:

```bash
# Stop application
pm2 stop blog

# Remove current directory
cd ..
sudo rm -rf personal_blog

# Restore from backup
sudo tar -xzf ~/blog-backup-20260206.tar.gz -C personal_blog
cd personal_blog

# Restart
pm2 restart blog
```

---

## 📊 Performance Optimizations

### After Deployment:

```bash
# 1. Clear CDN cache (if using Cloudflare, etc.)
# Do this through your CDN dashboard

# 2. Preload critical pages
curl https://your-domain.com > /dev/null
curl https://your-domain.com/about > /dev/null

# 3. Enable compression (if not already)
# In nginx config:
# gzip on;
# gzip_types text/css application/javascript;

# 4. Set up cache headers
# In nginx config:
# location /_next/static {
#     add_header Cache-Control "public, max-age=31536000, immutable";
# }
```

---

## 📝 Post-Deployment Checklist

- [ ] ✅ Application starts without errors
- [ ] ✅ Homepage loads correctly
- [ ] ✅ All routes accessible
- [ ] ✅ Styling works (Tailwind CSS)
- [ ] ✅ Fonts load correctly
- [ ] ✅ No console errors in browser
- [ ] ✅ Mobile responsive
- [ ] ✅ Performance acceptable (< 2s load)
- [ ] ✅ SSL certificate valid
- [ ] ✅ Backup created

---

## 🔐 Security Verification

After deployment, verify security patches:

```bash
# Check Next.js version
npx next --version
# Should output: 16.1.6

# Audit dependencies
npm audit
# Should show: found 0 vulnerabilities

# Check for outdated packages
npm outdated
# Should be minimal or none
```

---

## 📞 Support & Monitoring

### Set Up Monitoring:

```bash
# 1. Enable PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M

# 2. Monitor memory usage
pm2 monit

# 3. Set up alerts (optional)
pm2 install pm2-slack  # If you use Slack
```

### Regular Maintenance:

```bash
# Weekly: Check logs
pm2 logs blog --lines 100

# Weekly: Check disk space
df -h

# Monthly: Update dependencies
npm outdated
# Then update as needed
```

---

## 🎯 Quick Reference

### Useful Commands:

```bash
# View app logs
pm2 logs blog

# Restart app
pm2 restart blog

# Check app status
pm2 status blog

# View CPU/memory usage
pm2 monit

# Rebuild app
npm run build

# Start development mode
npm run dev

# Check Next.js version
npx next --version
```

---

## ✅ Success Indicators

Your deployment is successful when:

1. ✅ `git log` shows latest commits
2. ✅ `npm list next` shows `16.1.6`
3. ✅ `npm run build` completes without errors
4. ✅ Application accessible at your domain
5. ✅ No errors in browser console
6. ✅ Styling renders correctly
7. ✅ `npm audit` shows 0 vulnerabilities

---

**Need Help?**

Check:
1. [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) - Detailed security info
2. PM2 logs: `pm2 logs blog`
3. System logs: `sudo journalctl -xe`
4. Next.js docs: https://nextjs.org/docs

---

**Deployment Date:** _[Fill in after completion]_  
**Deployed By:** _[Your name]_  
**Status:** _[Success/Failed]_

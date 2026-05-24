# Deployment Checklist - Quick Reference

Follow these steps in order to deploy from local → GitHub → Supabase → Vercel

## ✅ Step 1: GitHub Repository Setup (5 minutes)

```bash
cd c:\Users\ASUS\allo-fast

# Initialize git
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"
git add .
git commit -m "Initial commit: Allo inventory system"
```

**On GitHub.com:**
1. Create new repo: `allo-fast`
2. Copy the commands GitHub shows
3. Run in terminal:
```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/allo-fast.git
git push -u origin main
```

**Result**: Code visible at `https://github.com/YOUR_USERNAME/allo-fast`

---

## ✅ Step 2: Supabase Setup (10 minutes)

**On Supabase.com:**
1. Sign up with GitHub (easiest)
2. Click **New Project**
3. Name: `allo-inventory`
4. Set database password (save it!)
5. Region: closest to you
6. Wait for setup (≈2 min)

**Get Connection String:**
1. Settings → Database
2. Connection string (Node.js tab)
3. Copy the string (looks like: `postgresql://postgres.xxxxx:PASSWORD@db.xxxxx.supabase.co:5432/postgres`)
4. **SAVE THIS - YOU'LL NEED IT FOR VERCEL**

**Test Locally (optional but recommended):**
```bash
# Update .env.local
# DATABASE_URL="postgresql://postgres.xxxxx:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"

npm run db:push
```

If successful, schema is now on Supabase! ✅

---

## ✅ Step 3: Vercel Deployment (10 minutes)

**On Vercel.com:**
1. Sign up with GitHub
2. Click **Add New** → **Project**
3. Paste your repo URL: `https://github.com/YOUR_USERNAME/allo-fast`
4. Click **Continue** → **Import**

**Add Environment Variables:**
1. Scroll to "Environment Variables"
2. Add 3 variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Supabase connection string from Step 2 |
| `CRON_SECRET` | Generate random: run `openssl rand -hex 32` in terminal |
| `NEXT_PUBLIC_API_URL` | `https://your-vercel-domain.vercel.app` (you'll know after deploy) |

3. Click **Deploy**
4. Wait for build to complete (≈3-5 min)

**Get Your Live URL:**
After successful deployment, Vercel shows you the URL (e.g., `https://allo-fast.vercel.app`)

---

## ✅ Step 4: Create Schema in Production (5 minutes)

Production database exists but has no tables yet.

**Using Vercel CLI:**
```bash
npm install -g vercel
vercel login
vercel env pull
npm run db:push
```

**Or: Via Supabase SQL Editor**
Just wait - will be created automatically when first API call hits production.

**Verify in Supabase:**
1. Go to Supabase dashboard
2. SQL Editor → Run:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

You should see: `product`, `warehouse`, `productwarehousestock`, `reservation`, `_prisma_migrations`

---

## ✅ Step 5: Seed Production Data (2 minutes)

Add test data (3 warehouses, 4 products, 12 stock records):

**PowerShell:**
```powershell
$env:DATABASE_URL = "postgresql://postgres.xxxxx:PASSWORD@db.xxxxx.supabase.co:5432/postgres"
npm run db:seed
$env:DATABASE_URL = ""
```

**Verify in Supabase:**
1. Supabase dashboard → Table Editor
2. Check each table:
   - **Product**: 4 rows ✓
   - **Warehouse**: 3 rows ✓
   - **ProductWarehouseStock**: 12 rows ✓

---

## ✅ Step 6: Test Production (5 minutes)

### Visit Your Live App
```
https://your-vercel-domain.vercel.app
```

Check:
- [ ] Landing page loads
- [ ] "Browse Products" button works
- [ ] Products list shows 4 items
- [ ] Stock levels visible per warehouse
- [ ] Can create reservation
- [ ] Checkout page has countdown timer
- [ ] Confirm/Release buttons work
- [ ] Order confirmation page appears

### Test API Endpoints
```bash
# Replace with your URL
BASE_URL="https://your-vercel-domain.vercel.app"

# Get products
curl $BASE_URL/api/products

# Get warehouses
curl $BASE_URL/api/warehouses
```

### Test Race Condition (Concurrency)
Open 2 PowerShell terminals and run simultaneously:

**Terminal 1 & 2:**
```bash
curl -X POST https://your-vercel-domain/api/reservations `
  -H "Content-Type: application/json" `
  -d '{"productId":"xxx","warehouseId":"yyy","quantity":1}'
```

**Expected**: One gets 201, one gets 409 ✓

---

## 🎯 Final Checklist Before Debrief

- [ ] GitHub repo has all code: `https://github.com/YOUR_USERNAME/allo-fast`
- [ ] Vercel deployment successful (no red errors)
- [ ] Landing page loads at live URL
- [ ] Products page shows real data from Supabase
- [ ] Can create reservation → goes to checkout
- [ ] Countdown timer works (10 minutes)
- [ ] Confirm button works → order confirmation
- [ ] Cancel button works → back to products
- [ ] Race condition test works (409 conflict)
- [ ] README.md explains system
- [ ] DEPLOYMENT.md has step-by-step guide

---

## 📊 What You Have for the Debrief

**Show the team:**
1. **GitHub repo** - Clean code with good commit history
2. **Live URL** - Fully functional demo
3. **README.md** - Architecture explanation
4. **Race condition demo** - Simultaneous requests showing 409
5. **Product flow** - Browse → Reserve → Checkout → Confirm

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "DATABASE_URL not set" | Add to Vercel env vars, redeploy |
| "Connection refused" | Check Supabase online, verify DB string |
| "Tables don't exist" | Run `npm run db:push` again |
| "No data showing" | Run `npm run db:seed` in production |
| "Deployment failed" | Check Vercel build log, fix errors, push to GitHub |
| "API 500 error" | Check Vercel logs, ensure DATABASE_URL is correct |

---

## ⏱️ Total Time Estimate

- GitHub setup: 5 min
- Supabase setup: 10 min
- Vercel deployment: 10 min
- Migrations & seeding: 5 min
- Testing: 5 min
- **Total: ≈35 minutes**

Then you're ready for the debrief call! 🚀

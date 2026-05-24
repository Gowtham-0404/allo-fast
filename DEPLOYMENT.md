# Deployment Guide: GitHub → Supabase → Vercel

Complete step-by-step instructions for taking the Allo inventory system to production.

## Step 1: Create GitHub Repository

### 1.1 Initialize Git in Your Project

```bash
cd c:\Users\ASUS\allo-fast
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"
git add .
git commit -m "Initial commit: Allo inventory system with race-condition-free reservations"
```

### 1.2 Create Repository on GitHub

1. Go to [github.com](https://github.com) and log in (create account if needed)
2. Click **New** button (top right corner)
3. Repository name: `allo-fast` (or your preferred name)
4. Description: "Inventory management with race-condition-free reservations"
5. Choose **Public** (recommended for sharing with Allo team)
6. **Do NOT** initialize with README (we already have one)
7. Click **Create repository**

### 1.3 Push Code to GitHub

GitHub will show you commands to push. Run these:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/allo-fast.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

**Verify**: Visit `https://github.com/YOUR_USERNAME/allo-fast` - you should see your code

---

## Step 2: Set Up Supabase (PostgreSQL Database)

Supabase provides free PostgreSQL hosting with 2GB storage and unlimited queries.

### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **Sign Up** → Create account with GitHub (easiest)
3. Click **New Project** button
4. Fill in:
   - **Project name**: `allo-inventory` (or your choice)
   - **Database password**: Generate strong password (save it!)
   - **Region**: Choose closest to you (e.g., `us-east-1` for US, `eu-west-1` for Europe)
   - **Pricing**: Free tier
5. Click **Create new project** and wait ~2 minutes for setup

### 2.2 Get Connection String

After project is created:

1. Click **Settings** (left sidebar) → **Database**
2. Under "Connection Info", find the **Connection string**
3. Choose **Nodejs** tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres.xxxxx:password@db.xxxxx.supabase.co:5432/postgres
   ```
5. **Save this** - you'll need it for Vercel

### 2.3 Test Local Connection (Optional)

Update `.env.local` with your Supabase connection string:

```env
DATABASE_URL="postgresql://postgres.xxxxx:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
CRON_SECRET="change-me-in-production"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

Test locally:
```bash
npm run db:push
```

If successful, your Supabase database now has the schema!

---

## Step 3: Deploy to Vercel

### 3.1 Connect GitHub to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up** → Choose **Continue with GitHub**
3. Authorize Vercel to access your GitHub account
4. You'll be taken to Vercel dashboard

### 3.2 Import Your Repository

1. Click **Add New...** (top right) → **Project**
2. Under "Import Git Repository", paste:
   ```
   https://github.com/YOUR_USERNAME/allo-fast
   ```
3. Click **Continue**
4. Click **Import** (Vercel will detect it's Next.js)

### 3.3 Configure Environment Variables

**Important**: Add your production database connection string here.

1. Scroll to **Environment Variables** section
2. Add these variables:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Your Supabase connection string (from Step 2.2) |
   | `CRON_SECRET` | Generate a random string (use: `openssl rand -hex 32`) |
   | `NEXT_PUBLIC_API_URL` | `https://your-vercel-domain.vercel.app` |

3. Click **Deploy**

Vercel will now build and deploy your app. This takes ~3-5 minutes.

**Note**: After deployment, Vercel will show you the live URL:
```
https://allo-fast.vercel.app  (example)
```

### 3.4 Monitor Deployment

1. You'll see a deployment log showing build progress
2. If all is green ✅, deployment succeeded
3. If red ❌, check the error log and fix issues

Common issues:
- **DATABASE_URL not set**: Re-add environment variables
- **Build error**: Check for TypeScript errors with `npm run build` locally
- **Schema missing**: See Step 4 below

---

## Step 4: Run Migrations on Production Database

After deployment, your production database doesn't have the schema yet.

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Run migration on production
vercel env pull  # Gets production env vars
npm run db:push  # Creates schema in production
```

### Option B: Direct SSH to Production (Advanced)

If Option A doesn't work, add this to `package.json` to auto-run migrations on deploy:

```json
"scripts": {
  "build": "prisma generate && prisma db push --skip-generate && next build",
  ...
}
```

Then re-deploy on Vercel.

### Verify Schema Creation

After running migrations:
```bash
# Check in Supabase dashboard:
# - Go to your Supabase project
# - Click "SQL Editor"
# - Run: SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

You should see tables: `Product`, `Warehouse`, `ProductWarehouseStock`, `Reservation`

---

## Step 5: Seed Production Data

Now add sample data to your production database.

### 5.1 Seed via CLI

```bash
# Set production DATABASE_URL temporarily
$env:DATABASE_URL = "YOUR_SUPABASE_CONNECTION_STRING"

# Run seed script
npm run db:seed

# Clear the env var after
$env:DATABASE_URL = ""
```

### 5.2 Verify Data in Supabase

1. Go to Supabase dashboard → your project
2. Click **Table Editor** (left sidebar)
3. You should see:
   - **Product** table: 4 rows (Laptop, Mouse, Keyboard, Monitor)
   - **Warehouse** table: 3 rows (NYC, LAX, Chicago)
   - **ProductWarehouseStock** table: 12 rows (4 products × 3 warehouses)

---

## Step 6: Test Production Deployment

### 6.1 Visit Your Live URL

Visit `https://your-vercel-domain.vercel.app` in browser

You should see:
- ✅ Landing page with product features
- ✅ "Browse Products" button works
- ✅ Products listed with real warehouse stock
- ✅ Can create reservations
- ✅ Checkout page with countdown timer

### 6.2 Test API Endpoints

```bash
# Replace with your Vercel domain
BASE_URL="https://allo-fast.vercel.app"

# List products
curl $BASE_URL/api/products

# List warehouses
curl $BASE_URL/api/warehouses

# Create reservation
curl -X POST $BASE_URL/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId":"PRODUCT_ID","warehouseId":"WAREHOUSE_ID","quantity":1}'
```

### 6.3 Test Concurrency (Race Condition)

Use two terminals to send simultaneous requests:

```bash
# Terminal 1
curl -X POST https://your-vercel-domain/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId":"xxx","warehouseId":"yyy","quantity":1}'

# Terminal 2 (run at same time)
curl -X POST https://your-vercel-domain/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId":"xxx","warehouseId":"yyy","quantity":1}'
```

Expected: One returns 201 (created), other returns 409 (conflict)

---

## Step 7: Configure Cron Job

The `vercel.json` file already has cron configuration, but it only works on paid Vercel plans with automatic cron support.

### For Free Tier Alternative:

If you want cleanup to work on free tier, add to `package.json`:

```json
"scripts": {
  "cron:cleanup": "node -e \"require('./prisma/cleanup.js')\""
}
```

Or use a free external cron service like [cron-job.org](https://cron-job.org):

1. Visit cron-job.org
2. Create new cron job
3. URL: `https://your-vercel-domain/api/cron/cleanup`
4. Schedule: Every minute
5. Add header: `x-cron-secret: YOUR_CRON_SECRET`

---

## Step 8: Share for Debrief

Once everything is working, you have:

✅ **GitHub repo**: https://github.com/YOUR_USERNAME/allo-fast
✅ **Live URL**: https://your-vercel-domain.vercel.app
✅ **Production database**: Connected Supabase
✅ **Working features**: All CRUD operations, race-condition safety, expiry cleanup

Share these links with the Allo team for the debrief call.

---

## Troubleshooting

### "DATABASE_URL not found"
```bash
# Check Vercel env vars
vercel env list

# Re-add if missing
vercel env add DATABASE_URL
```

### "Prisma migration failed"
```bash
# Reset and retry (CAUTION: deletes data)
DATABASE_URL=your_string npx prisma db push --force-reset
DATABASE_URL=your_string npm run db:seed
```

### "Vercel deployment failed"
1. Check build log in Vercel dashboard
2. Look for TypeScript errors
3. Run locally: `npm run build`
4. Fix errors and push to GitHub
5. Vercel redeploys automatically

### "Cron job not running"
- Upgrade to Vercel Pro, or
- Use external cron service (cron-job.org)
- Or add manual trigger button in UI

### "Connection refused" on API calls
- Verify DATABASE_URL is set in Vercel
- Check Supabase is online (check status page)
- Ensure IP whitelist is disabled in Supabase

---

## Deployment Checklist

Before debrief call, verify:

- [ ] GitHub repo created and code pushed
- [ ] Supabase project created and database schema applied
- [ ] Vercel deployment successful (green checkmark)
- [ ] Environment variables set: DATABASE_URL, CRON_SECRET
- [ ] Production database seeded with test data
- [ ] Landing page loads at live URL
- [ ] Products list shows warehouse stock
- [ ] Can create reservation and see checkout page
- [ ] Countdown timer works
- [ ] Confirm/release buttons functional
- [ ] API endpoints respond correctly
- [ ] Concurrent requests tested (409 conflict works)

---

## Next Steps After Debrief

1. **Add authentication**: JWT or OAuth for users
2. **Connect real payment gateway**: Stripe/PayPal integration
3. **Add Redis**: Distributed locking for multi-region
4. **Setup monitoring**: Sentry or DataDog for error tracking
5. **Add analytics**: Track reservation success rates
6. **Optimize**: Load testing and performance tuning

---

## Support

If you encounter issues:
1. Check Vercel logs: Dashboard → Deployments → View logs
2. Check Supabase logs: Dashboard → Logs
3. Check browser console for frontend errors
4. Run locally to isolate issues: `npm run dev`
5. Review this guide's Troubleshooting section

Good luck with your debrief! 🚀

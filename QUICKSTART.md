# Quick Start Guide

## Local Development (5 minutes)

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database (or use Supabase/Neon)

### 2. Setup

```bash
# Install dependencies
npm install

# Create .env.local with your database URL
# Example for local PostgreSQL:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/allo_inventory"

# Create database schema
npm run db:push

# Seed test data
npm run db:seed

# Run dev server
npm run dev
```

Open http://localhost:3000

### 3. Test the System

1. Click "Browse Products"
2. Select a warehouse
3. Choose a product and click "Reserve"
4. Enter quantity and create reservation
5. You'll be redirected to checkout with a countdown timer
6. Click "Confirm Purchase" to simulate payment success
7. See the order confirmation

### 4. Test Concurrency (Race Condition Safety)

Open two terminals and send requests simultaneously:

```bash
# Terminal 1
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "warehouseId": "WAREHOUSE_ID_HERE",
    "quantity": 1
  }'

# Terminal 2 (run at the same time)
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "warehouseId": "WAREHOUSE_ID_HERE",
    "quantity": 1
  }'
```

Result: One gets 201 (created), one gets 409 (conflict)

## Production Deployment

### 1. Database Setup (Supabase)

```bash
# Sign up at supabase.com
# Create new project
# Copy connection string
# Set DATABASE_URL in Vercel environment
```

### 2. Deploy to Vercel

```bash
# Push to GitHub
git push origin main

# In Vercel Dashboard:
# - Import repo
# - Add DATABASE_URL environment variable
# - Add CRON_SECRET environment variable
# - Deploy
```

### 3. Run Migrations

After deployment:
```bash
# Manually run on Vercel Terminal or add to build script
npm run db:push
npm run db:seed
```

### 4. Enable Cron Jobs

Cron job is pre-configured in `vercel.json` to run cleanup every minute.
The endpoint `/api/cron/cleanup` will automatically:
- Find expired reservations
- Mark them as EXPIRED
- Release the stock back

## Key Features to Test

✅ **Race conditions**: Two simultaneous reservations for last unit  
✅ **Expiry**: Reservation countdown and auto-release  
✅ **Error handling**: See 409 when stock is gone, 410 when expired  
✅ **Multi-warehouse**: Select different warehouses, see different stock  
✅ **Idempotency**: Send same request twice, get same result  

## API Quick Reference

```bash
# List products
curl http://localhost:3000/api/products

# List warehouses
curl http://localhost:3000/api/warehouses

# Create reservation
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId":"x","warehouseId":"y","quantity":1}'

# Confirm reservation
curl -X POST http://localhost:3000/api/reservations/{id}/confirm

# Release reservation
curl -X POST http://localhost:3000/api/reservations/{id}/release

# Get reservation
curl http://localhost:3000/api/reservations/{id}
```

## Troubleshooting

**"Database connection error"**
- Check DATABASE_URL in .env.local
- Ensure PostgreSQL is running or Supabase is accessible

**"Port 3000 already in use"**
```bash
npm run dev -- -p 3001  # Run on different port
```

**"Prisma migration errors"**
```bash
# Reset database (warning: deletes data)
npx prisma db push --force-reset

# Re-seed
npm run db:seed
```

**"CRON not running"**
- Check Vercel Crons logs in dashboard
- Verify vercel.json is in root directory
- Ensure CRON_SECRET is set in environment

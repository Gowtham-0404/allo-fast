# Allo Inventory & Reservations System

A full-stack Next.js application for managing inventory with race-condition-free reservations. Built with TypeScript, PostgreSQL, and React.

## Overview

This system solves the classic e-commerce inventory race condition: two customers can't reserve/purchase the same physical unit of stock. It implements a temporary reservation mechanism where customers can hold inventory for 10 minutes during checkout, with automatic stock release if the payment fails or times out.

### Key Features

- **Race-Condition-Free Reservations**: Uses PostgreSQL serializable transactions with pessimistic locking (`SELECT FOR UPDATE`) to guarantee that only one customer can successfully reserve the last units of a SKU
- **Multi-Warehouse Support**: Track inventory across multiple warehouse locations with warehouse-specific reservations
- **Automatic Expiry**: Reserved inventory is automatically returned to available stock after 10 minutes if not confirmed
- **Real-Time UI**: Live countdown timers, instant error feedback, and stock level updates
- **Idempotency**: Supports idempotency keys for safe retries (reserve and confirm endpoints)
- **REST API**: Comprehensive endpoints for all operations

## Architecture

### Data Model

```
Product
├── sku (unique)
├── name
├── price
└── reservations & warehouseStocks

Warehouse
├── code (unique)
├── name
└── location

ProductWarehouseStock (composite key: productId + warehouseId)
├── totalUnits (total physical inventory)
├── reservedUnits (currently held in pending reservations)

Reservation
├── productId, warehouseId, quantity
├── status: PENDING | CONFIRMED | RELEASED | EXPIRED
├── expiresAt (10 minutes from creation)
├── idempotencyKey (optional, for deduplication)
```

### Concurrency Handling

The core challenge is ensuring that when two customers try to reserve the last unit simultaneously, exactly one succeeds and the other gets a 409 Conflict error.

**Solution: Serializable Transactions with Pessimistic Locking**

When creating a reservation:

1. **Begin serializable transaction**: Highest isolation level - no dirty reads, non-repeatable reads, or phantom reads
2. **Lock the stock row**: `SELECT ... FROM ProductWarehouseStock WHERE ... FOR UPDATE` acquires an exclusive lock
3. **Check availability**: `available = totalUnits - reservedUnits` vs. `requested_quantity`
4. **Update atomically**: If sufficient stock, create reservation and increment `reservedUnits` in one atomic operation
5. **Return result**: Success (201) or conflict (409)

Because only one transaction can hold the lock at a time, and the entire reservation operation happens within the transaction, there's no window for a race condition.

**Trade-offs**:
- **Pessimistic vs. Optimistic**: Pessimistic locking blocks competing requests; optimistic locking uses versioning to detect conflicts. For high-contention inventory (last items), pessimistic is clearer and more predictable
- **Serializable transactions**: Slightly slower than lower isolation levels but guarantees correctness
- **Redis alternatives**: Could use Redis distributed locks for additional layer of defense across multiple database replicas

### API Endpoints

```
GET /api/products
  Response: Product[] with warehouseStocks array
  Returns all products with stock levels per warehouse

GET /api/warehouses
  Response: Warehouse[]
  Returns all warehouse locations

POST /api/reservations
  Body: { productId, warehouseId, quantity, idempotencyKey? }
  Response: Reservation (201) or { error } (409/404/500)
  Returns 409 if insufficient stock
  Uses idempotencyKey to prevent duplicate reservations

GET /api/reservations/:id
  Response: Reservation (200) or { error } (404/500)
  Fetch details of a specific reservation

POST /api/reservations/:id/confirm
  Response: Reservation (200) or { error } (410/409/404/500)
  Confirms the reservation (payment succeeded)
  Returns 410 if reservation has expired

POST /api/reservations/:id/release
  Response: Reservation (200) or { error } (409/404/500)
  Releases the reservation early (payment cancelled)
  Returns reserved units to available stock

POST /api/cron/cleanup (internal)
  Cleans up expired PENDING reservations
  Call periodically (e.g., every minute) to release expired inventory
  Requires X-Cron-Secret header in production
```

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted)

### Setup Steps

1. **Clone and install**:
   ```bash
   git clone <repo>
   cd allo-fast
   npm install
   ```

2. **Configure database**:
   Create a `.env.local` file:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/allo_inventory"
   REDIS_URL="redis://localhost:6379"  # Optional for distributed locking
   NEXT_PUBLIC_API_URL="http://localhost:3000"
   ```

3. **Setup database schema**:
   ```bash
   # Push schema to database (creates tables)
   npm run db:push

   # Or run migrations (if you used `prisma migrate dev` to create migrations)
   npm run db:migrate
   ```

4. **Seed sample data**:
   ```bash
   npm run db:seed
   ```
   This creates:
   - 3 warehouses (NYC, LAX, Chicago)
   - 4 sample products (Laptop, Mouse, Keyboard, Monitor)
   - Stock for each product in each warehouse

5. **Run development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Production Deployment

### Database Setup

We recommend **Supabase** or **Neon** for free PostgreSQL hosting:

1. **Supabase**:
   - Sign up at [supabase.com](https://supabase.com)
   - Create new project
   - Copy connection string from project settings
   - Update `DATABASE_URL` in environment variables

2. **Neon**:
   - Sign up at [neon.tech](https://neon.tech)
   - Create new project
   - Copy PostgreSQL connection string
   - Update `DATABASE_URL` in environment variables

### Vercel Deployment

1. **Push code to GitHub**

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repo
   - Add environment variables:
     ```
     DATABASE_URL: <your-postgres-connection-string>
     CRON_SECRET: <generate-a-random-string>
     ```

3. **Run migrations**:
   - Add build script to automate migrations (optional):
     ```json
     "postinstall": "prisma generate && prisma db push"
     ```
   - Or manually run `npm run db:push` after deployment

4. **Seed database** (one-time):
   ```bash
   npm run db:seed
   ```

### Reservation Expiry in Production

**Problem**: Reservations that expire need to be automatically released so stock becomes available again. But if you only check expiry on read, a reservation could hold inventory indefinitely.

**Solution: Vercel Cron Jobs**

Add `vercel.json` to schedule periodic cleanup:

```json
{
  "crons": [{
    "path": "/api/cron/cleanup",
    "schedule": "* * * * *"
  }]
}
```

This calls the cleanup endpoint **every minute**. The endpoint:
1. Finds all PENDING reservations with `expiresAt < now`
2. Marks them as EXPIRED
3. Decrements their `reservedUnits` from stock
4. Returns the inventory to available

**Alternative Approaches**:

- **Background worker** (e.g., Bull, Bullmq, Temporal):
  - Deploy a separate worker process
  - Process expiry queue independently
  - More scalable for high volume

- **Lazy cleanup**:
  - Check expiry when fetching products: `reservedUnits -= expired_quantity`
  - Simple but inventory appears inflated until accessed
  - Good for low-traffic sites

- **Application-level timers**:
  - Use Node.js `setTimeout` in a background task
  - Risk of losing timers on redeploy
  - Not recommended for production

**Recommended**: Start with **Vercel Cron** (simplest, free), scale to **background worker** if needed.

## Implementation Details & Design Decisions

### Idempotency

Both `POST /api/reservations` and `POST /api/reservations/:id/confirm` support idempotency keys:

- Client sends `Idempotency-Key` header or body parameter
- Server stores the key with the reservation
- On retry with same key, returns cached response instead of re-executing

**Why**: Payment gateways often retry requests. Without idempotency, a customer could end up with multiple reservations or multiple confirmations.

**Implementation**:
- Unique constraint on `(idempotencyKey, status)` for pending reservations
- Check before creating to short-circuit repeated requests

### Stock Model

We track two fields:
- `totalUnits`: Total inventory
- `reservedUnits`: Currently reserved in pending transactions

**Available stock** = `totalUnits - reservedUnits`

When a reservation is **confirmed**, `reservedUnits` stays the same (conceptually those units are now sold). When released, `reservedUnits` decreases.

Alternative: Could add `soldUnits` for clearer accounting:
- `available = totalUnits - reservedUnits - soldUnits`
- Not implemented here to keep it simple

### Error Handling

- **409 Conflict**: Insufficient stock or reservation already processed
- **410 Gone**: Reservation expired
- **404 Not Found**: Product/warehouse/reservation not found
- **500 Server Error**: Database error or unexpected failure

Clients should handle these specifically (show user-friendly messages).

### Security Considerations

- **Cron secret**: The cleanup endpoint should verify `X-Cron-Secret` header to prevent unauthorized cleanups
- **Rate limiting**: Not implemented here; add in production (e.g., with Vercel Edge Middleware)
- **Authentication**: Not implemented; assumes internal API. Add in production if exposing publicly.
- **Input validation**: All requests validated with Zod schemas

## Testing the System

### Manual Testing

1. **Visit homepage**: [http://localhost:3000](http://localhost:3000)
2. **Browse products**: All products show available stock per warehouse
3. **Create reservation**:
   - Select product and warehouse
   - Choose quantity
   - Click "Reserve"
4. **Checkout page**:
   - See countdown timer (10 minutes)
   - Confirm or cancel
5. **Test race condition** (concurrent reservations):
   - Open product page in two browser tabs
   - Rapidly reserve last unit in both
   - Only one should succeed (409 error in the other)

### Simulating Concurrency

Use `curl` or Postman to send simultaneous requests:

```bash
# Terminal 1
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId":"xxx","warehouseId":"yyy","quantity":1}'

# Terminal 2 (send at same time)
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId":"xxx","warehouseId":"yyy","quantity":1}'
```

If stock is 1 unit, one gets 201 (success) and the other gets 409 (conflict).

## Trade-offs & Future Improvements

### What's Included

✅ Core reservation system with race-condition safety  
✅ Multi-warehouse inventory tracking  
✅ Automatic expiry cleanup  
✅ Idempotency support  
✅ Real-time UI with countdown timers  
✅ Comprehensive error handling  
✅ TypeScript throughout  
✅ Production-ready (Vercel + PostgreSQL)  

### What's Not Included (Intentionally)

- **User authentication**: Would add JWT or OAuth; left out for scope
- **Payment gateway integration**: Would call Stripe/PayPal; here we simulate with confirm/release
- **Distributed locking with Redis**: Works fine with single DB; would add Redis for multi-region setups
- **Advanced monitoring**: Would add DataDog or Sentry; basic logging only
- **Database replication/failover**: Supabase handles this
- **Queue system**: Simple polling with cron jobs; could use Bull/Bullmq for scale
- **Analytics dashboard**: Could add charts for reservation success rates, etc.

### Potential Improvements with More Time

1. **Webhook notifications**: Notify customers when payment is processed
2. **Partial reservations**: Allow booking different warehouses if first choice unavailable
3. **Reservation priority queue**: VIP customers get priority access
4. **Inventory forecasting**: Predict future stock based on historical data
5. **Multi-currency support**: Handle different currencies per warehouse
6. **Audit logging**: Track all inventory changes for compliance
7. **Mobile app**: Native iOS/Android apps using same API
8. **GraphQL**: In addition to REST for complex queries
9. **Database connection pooling**: Use PgBouncer or Prisma connection pool for scale
10. **Load testing**: Verify performance under high concurrent load

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **UI**: React 19, Tailwind CSS, custom components
- **Validation**: Zod for schema validation
- **Deployment**: Vercel (app) + Supabase/Neon (database)

## Codebase Structure

```
app/
  ├── page.tsx                    # Landing page
  ├── products/page.tsx           # Product listing
  ├── checkout/[id]/page.tsx      # Checkout/reservation page
  ├── order-confirmation/page.tsx # Confirmation page
  └── api/
      ├── products/route.ts       # GET all products
      ├── warehouses/route.ts     # GET all warehouses
      ├── reservations/
      │   ├── route.ts            # POST (create) / GET list
      │   ├── [id]/route.ts       # GET specific reservation
      │   ├── [id]/confirm/route.ts   # POST confirm
      │   └── [id]/release/route.ts   # POST release
      └── cron/cleanup/route.ts   # POST cleanup (periodic)

lib/
  ├── prisma.ts                   # Prisma client singleton
  ├── schemas.ts                  # Zod validation schemas
  ├── utils.ts                    # Utility functions
  └── hooks/
      └── useApi.ts               # React hooks for API calls

components/ui/
  ├── button.tsx
  ├── card.tsx
  ├── alert.tsx

prisma/
  ├── schema.prisma               # Data model
  └── seed.ts                     # Database seeding script
```

## Lessons Learned

1. **Pessimistic locking is underrated**: For inventory scenarios, blocking competing requests at DB level is clearer than optimistic concurrency control
2. **Serializable transactions carry perf cost**: Worth it for correctness, but monitor in production
3. **Session storage for transient data**: Using browser sessionStorage to pass reservation between pages avoids extra API calls
4. **Cron jobs are simple**: Vercel Cron is perfect for cleanup tasks; no need to over-engineer
5. **User feedback on errors**: Users get frustrated without clear error messages (stock sold out, reservation expired, etc.)

## License

MIT

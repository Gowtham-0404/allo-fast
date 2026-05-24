import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateReservationSchema } from '@/lib/schemas';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateReservationSchema.parse(body);

    const { productId, warehouseId, quantity, idempotencyKey } = parsed;
    const finalIdempotencyKey = idempotencyKey || uuidv4();

    // Check if this is a retry of an already processed request (idempotency)
    if (idempotencyKey) {
      const existingReservation = await prisma.reservation.findUnique({
        where: { idempotencyKey },
      });

      if (existingReservation) {
        // Already processed - return the cached response
        return NextResponse.json(existingReservation, { status: 200 });
      }
    }

    // Use a transaction with the serializable isolation level for strong consistency
    const reservation = await prisma.$transaction(
      async (tx) => {
        // Get the stock record with a write lock (FOR UPDATE)
        // This ensures only one transaction can hold the lock at a time
        const stock = await tx.$queryRaw`
          SELECT * FROM "ProductWarehouseStock"
          WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
          FOR UPDATE
        `;

        if (!Array.isArray(stock) || stock.length === 0) {
          throw new Error('STOCK_NOT_FOUND');
        }

        const stockRecord = stock[0] as {
          id: string;
          totalUnits: number;
          reservedUnits: number;
        };

        // Calculate available stock
        const availableStock = stockRecord.totalUnits - stockRecord.reservedUnits;

        // Check if there's enough stock
        if (availableStock < quantity) {
          throw new Error('INSUFFICIENT_STOCK');
        }

        // Create the reservation
        const reservation = await tx.reservation.create({
          data: {
            productId,
            warehouseId,
            quantity,
            idempotencyKey: finalIdempotencyKey,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
            status: 'PENDING',
          },
        });

        // Update the reserved units (increment by reserved amount)
        await tx.productWarehouseStock.update({
          where: {
            id: stockRecord.id,
          },
          data: {
            reservedUnits: stockRecord.reservedUnits + quantity,
          },
        });

        return reservation;
      },
      {
        isolationLevel: 'Serializable',
        timeout: 5000,
      }
    );

    return NextResponse.json(reservation, { status: 201 });
  } catch (error: any) {
    console.error('Reservation error:', error);

    if (error.message === 'INSUFFICIENT_STOCK') {
      return NextResponse.json(
        { error: 'Insufficient stock available' },
        { status: 409 }
      );
    }

    if (error.message === 'STOCK_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Product or warehouse not found' },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      // Unique constraint violation - duplicate idempotency key
      return NextResponse.json(
        { error: 'Reservation already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    );
  }
}

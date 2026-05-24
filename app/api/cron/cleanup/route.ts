import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Cleanup endpoint for expired reservations
 * This should be called periodically (e.g., every minute via Vercel Cron)
 * 
 * Authorization: Verify X-Cron-Secret header in production
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the cron secret in production
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find all PENDING reservations that have expired
    const now = new Date();
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: now,
        },
      },
    });

    // Release each expired reservation
    let releasedCount = 0;

    for (const reservation of expiredReservations) {
      try {
        await prisma.$transaction(async (tx) => {
          // Update reservation status to EXPIRED
          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status: 'EXPIRED',
              releasedAt: now,
            },
          });

          // Release the reserved units back to available stock
          await tx.productWarehouseStock.updateMany({
            where: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
            data: {
              reservedUnits: {
                decrement: reservation.quantity,
              },
            },
          });
        });

        releasedCount++;
      } catch (error) {
        console.error(`Error releasing reservation ${reservation.id}:`, error);
      }
    }

    return NextResponse.json(
      {
        message: 'Cleanup completed',
        expiredReservationsFound: expiredReservations.length,
        successfullyReleased: releasedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  id: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id } = params;

    // Check if the reservation exists
    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Check if reservation is already confirmed or released
    if (reservation.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Reservation is ${reservation.status}` },
        { status: 409 }
      );
    }

    // Check if reservation has expired
    if (reservation.expiresAt < new Date()) {
      // Mark as expired and release the stock
      const confirmed = await prisma.$transaction(async (tx) => {
        // Update reservation status to EXPIRED
        const updated = await tx.reservation.update({
          where: { id },
          data: {
            status: 'EXPIRED',
            releasedAt: new Date(),
          },
        });

        // Release the reserved units
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

        return updated;
      });

      return NextResponse.json(
        { error: 'Reservation has expired' },
        { status: 410 }
      );
    }

    // Confirm the reservation
    const confirmed = await prisma.$transaction(async (tx) => {
      // Update reservation status to CONFIRMED
      const updated = await tx.reservation.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });

      // Decrement reserved units (they're now permanent deductions)
      // Actually, we keep them in reservedUnits to show they're sold
      // For a true committed stock model, you might have a separate 'soldUnits' column
      
      return updated;
    });

    return NextResponse.json(confirmed, { status: 200 });
  } catch (error) {
    console.error('Error confirming reservation:', error);
    return NextResponse.json(
      { error: 'Failed to confirm reservation' },
      { status: 500 }
    );
  }
}

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

    // Check if reservation is already released or confirmed
    if (reservation.status === 'RELEASED') {
      return NextResponse.json(
        { error: 'Reservation is already released' },
        { status: 409 }
      );
    }

    if (reservation.status === 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Reservation is already confirmed' },
        { status: 409 }
      );
    }

    // Release the reservation and return stock
    const released = await prisma.$transaction(async (tx) => {
      // Update reservation status to RELEASED
      const updated = await tx.reservation.update({
        where: { id },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
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

      return updated;
    });

    return NextResponse.json(released, { status: 200 });
  } catch (error) {
    console.error('Error releasing reservation:', error);
    return NextResponse.json(
      { error: 'Failed to release reservation' },
      { status: 500 }
    );
  }
}

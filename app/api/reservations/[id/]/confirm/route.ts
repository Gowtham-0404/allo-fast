import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  context: any
) {
  try {
    const id = context.params.id;

    // Find reservation
    const reservation =
      await prisma.reservation.findUnique({
        where: { id },
      });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Already processed
    if (reservation.status !== "PENDING") {
      return NextResponse.json(
        {
          error: `Reservation is ${reservation.status}`,
        },
        { status: 409 }
      );
    }

    // Expired
    if (
      reservation.expiresAt < new Date()
    ) {
      await prisma.$transaction(
        async (tx :any) => {
          // Mark expired
          await tx.reservation.update({
            where: { id },
            data: {
              status: "EXPIRED",
              releasedAt: new Date(),
            },
          });

          // Release stock
          await tx.productWarehouseStock.updateMany(
            {
              where: {
                productId:
                  reservation.productId,
                warehouseId:
                  reservation.warehouseId,
              },
              data: {
                reservedUnits: {
                  decrement:
                    reservation.quantity,
                },
              },
            }
          );
        }
      );

      return NextResponse.json(
        { error: "Reservation expired" },
        { status: 410 }
      );
    }

    // Confirm reservation
    const confirmed =
      await prisma.reservation.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });

    return NextResponse.json(
      confirmed,
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Error confirming reservation:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to confirm reservation",
      },
      { status: 500 }
    );
  }
}
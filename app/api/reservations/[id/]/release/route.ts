import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  context: any
) {
  try {
    const id = context.params.id;

    // Check reservation
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

    // Already released
    if (reservation.status === "RELEASED") {
      return NextResponse.json(
        {
          error:
            "Reservation already released",
        },
        { status: 409 }
      );
    }

    // Already confirmed
    if (reservation.status === "CONFIRMED") {
      return NextResponse.json(
        {
          error:
            "Reservation already confirmed",
        },
        { status: 409 }
      );
    }

    // Release reservation
    const released =
      await prisma.$transaction(
        async (tx: any) => {
          // Return stock
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

          // Update reservation
          return await tx.reservation.update(
            {
              where: { id },
              data: {
                status: "RELEASED",
                releasedAt: new Date(),
              },
            }
          );
        }
      );

    return NextResponse.json(
      released,
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Error releasing reservation:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to release reservation",
      },
      { status: 500 }
    );
  }
}
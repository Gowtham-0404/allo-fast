import { z } from 'zod';

export const CreateReservationSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  warehouseId: z.string().cuid('Invalid warehouse ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  idempotencyKey: z.string().uuid().optional(),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;

export const ReservationResponseSchema = z.object({
  id: z.string(),
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number(),
  status: z.enum(['PENDING', 'CONFIRMED', 'RELEASED', 'EXPIRED']),
  expiresAt: z.string().datetime(),
  confirmedAt: z.string().datetime().nullable(),
  releasedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type ReservationResponse = z.infer<typeof ReservationResponseSchema>;

export const ProductResponseSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  warehouseStocks: z.array(
    z.object({
      warehouseId: z.string(),
      totalUnits: z.number(),
      reservedUnits: z.number(),
    })
  ),
});

export type ProductResponse = z.infer<typeof ProductResponseSchema>;

export const WarehouseResponseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  location: z.string().nullable(),
});

export type WarehouseResponse = z.infer<typeof WarehouseResponseSchema>;

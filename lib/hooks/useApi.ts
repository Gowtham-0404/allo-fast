'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  warehouseStocks: Array<{
    warehouseId: string;
    totalUnits: number;
    reservedUnits: number;
  }>;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string | null;
}

export interface Reservation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED';
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  return { products, loading, error, fetchProducts };
}

export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/warehouses');
      if (!response.ok) throw new Error('Failed to fetch warehouses');
      const data = await response.json();
      setWarehouses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  return { warehouses, loading, error, fetchWarehouses };
}

export function useReservation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReservation = useCallback(
    async (
      productId: string,
      warehouseId: string,
      quantity: number
    ): Promise<Reservation | null> => {
      setLoading(true);
      setError(null);
      try {
        const idempotencyKey = uuidv4();
        const response = await fetch('/api/reservations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId,
            warehouseId,
            quantity,
            idempotencyKey,
          }),
        });

        if (response.status === 409) {
          setError('Not enough stock available');
          return null;
        }

        if (!response.ok) {
          throw new Error('Failed to create reservation');
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const confirmReservation = useCallback(
    async (reservationId: string): Promise<Reservation | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/reservations/${reservationId}/confirm`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.status === 410) {
          setError('Reservation has expired');
          return null;
        }

        if (!response.ok) {
          throw new Error('Failed to confirm reservation');
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const releaseReservation = useCallback(
    async (reservationId: string): Promise<Reservation | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/reservations/${reservationId}/release`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to release reservation');
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    createReservation,
    confirmReservation,
    releaseReservation,
  };
}

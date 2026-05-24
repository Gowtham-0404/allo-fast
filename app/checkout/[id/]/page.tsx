'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReservation, useProducts, useWarehouses } from '@/lib/hooks/useApi';
import { Reservation, Product, Warehouse } from '@/lib/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Clock } from 'lucide-react';

export default function CheckoutPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { confirmReservation, releaseReservation, loading, error } = useReservation();
  const { products } = useProducts();
  const { warehouses } = useWarehouses();
  
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [loading_page, setLoadingPage] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [actionTaken, setActionTaken] = useState(false);

  // Fetch reservation details
  useEffect(() => {
    const fetchReservation = async () => {
      try {
        // First try sessionStorage
        const stored = sessionStorage.getItem(`reservation-${params.id}`);
        if (stored) {
          const res = JSON.parse(stored);
          setReservation(res);
          setLoadingPage(false);
          return;
        }

        // Fall back to API if not in sessionStorage
        const response = await fetch(`/api/reservations/${params.id}`);
        if (response.ok) {
          const res = await response.json();
          setReservation(res);
        } else {
          console.error('Reservation not found');
        }
        setLoadingPage(false);
      } catch (err) {
        console.error('Error fetching reservation:', err);
        setLoadingPage(false);
      }
    };

    fetchReservation();
  }, [params.id]);

  // Fetch product and warehouse details
  useEffect(() => {
    if (!reservation) return;

    const p = products.find(prod => prod.id === reservation.productId);
    const w = warehouses.find(wh => wh.id === reservation.warehouseId);
    
    setProduct(p || null);
    setWarehouse(w || null);
  }, [reservation, products, warehouses]);

  // Timer for countdown
  useEffect(() => {
    if (!reservation) return;

    const updateTimer = () => {
      const expiryTime = new Date(reservation.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, expiryTime - now);
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setIsExpired(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [reservation]);

  const formatTimeLeft = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleConfirm = async () => {
    if (!reservation) return;
    
    const confirmed = await confirmReservation(reservation.id);
    if (confirmed) {
      setReservation(confirmed);
      setActionTaken(true);
      setTimeout(() => {
        router.push('/order-confirmation?status=success');
      }, 2000);
    }
  };

  const handleRelease = async () => {
    if (!reservation) return;
    
    const released = await releaseReservation(reservation.id);
    if (released) {
      setReservation(released);
      setActionTaken(true);
      setTimeout(() => {
        router.push('/order-confirmation?status=cancelled');
      }, 2000);
    }
  };

  if (loading_page) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">Loading reservation details...</p>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reservation Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              The reservation could not be found. It may have expired or been cancelled.
            </p>
            <Button onClick={() => router.push('/products')} className="w-full">
              Back to Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isConfirmed = reservation.status === 'CONFIRMED';
  const isReleased = reservation.status === 'RELEASED' || reservation.status === 'EXPIRED';
  const canAct = !isConfirmed && !isReleased && !isExpired;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Checkout</h1>
          <p className="text-slate-600">Complete your reservation before it expires</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isExpired && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Reservation Expired</AlertTitle>
            <AlertDescription>
              This reservation has expired and has been automatically released. The units are now available for other customers.
            </AlertDescription>
          </Alert>
        )}

        {actionTaken && (
          <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
            <AlertTitle>
              {isConfirmed ? 'Order Confirmed!' : 'Reservation Cancelled'}
            </AlertTitle>
            <AlertDescription>
              {isConfirmed 
                ? 'Your payment was successful and your reservation has been confirmed.' 
                : 'Your reservation has been released and the units are available again.'}
            </AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Reservation Details</CardTitle>
                <CardDescription>ID: {reservation.id}</CardDescription>
              </div>
              {canAct && timeLeft !== null && (
                <div className={`text-right p-3 rounded-lg ${
                  timeLeft < 60000 ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                    <Clock className="h-4 w-4" />
                    Time Left
                  </div>
                  <div className={timeLeft < 60000 ? 'text-red-700 text-lg' : 'text-blue-700 text-lg'}>
                    {formatTimeLeft(timeLeft)}
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {product && (
              <div>
                <p className="text-sm text-slate-500 mb-1">Product</p>
                <p className="font-semibold text-slate-900">{product.name}</p>
                <p className="text-sm text-slate-600">SKU: {product.sku}</p>
              </div>
            )}

            {warehouse && (
              <div>
                <p className="text-sm text-slate-500 mb-1">Warehouse</p>
                <p className="font-semibold text-slate-900">{warehouse.name}</p>
                <p className="text-sm text-slate-600">{warehouse.location}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-slate-500 mb-1">Quantity</p>
              <p className="font-semibold text-slate-900">{reservation.quantity} units</p>
            </div>

            {product && (
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Price</p>
                <p className="font-bold text-lg text-slate-900">
                  ${(product.price * reservation.quantity).toFixed(2)}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-slate-500 mb-1">Status</p>
              <p className={`font-semibold ${
                isConfirmed ? 'text-green-600' : 
                isReleased ? 'text-red-600' : 
                isExpired ? 'text-red-600' :
                'text-blue-600'
              }`}>
                {reservation.status}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-1">Expires At</p>
              <p className="font-semibold text-slate-900">
                {new Date(reservation.expiresAt).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {canAct && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Complete Your Purchase</CardTitle>
              <CardDescription>
                Click "Confirm Purchase" to complete the payment and finalize your order.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button
                onClick={handleRelease}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                {loading ? 'Processing...' : 'Cancel Reservation'}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Processing...' : 'Confirm Purchase'}
              </Button>
            </CardContent>
          </Card>
        )}

        {(isConfirmed || isReleased) && (
          <div className="mt-6 text-center">
            <Button
              onClick={() => router.push('/products')}
              variant="outline"
              className="w-full"
            >
              Back to Products
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

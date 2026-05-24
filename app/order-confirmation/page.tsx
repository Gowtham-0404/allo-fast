'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';

export default function OrderConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  const isSuccess = status === 'success';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isSuccess ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle className="text-2xl">Order Confirmed!</CardTitle>
              <CardDescription>
                Your payment was successful and your order has been confirmed.
              </CardDescription>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <CardTitle className="text-2xl">Reservation Cancelled</CardTitle>
              <CardDescription>
                Your reservation has been released and the units are available again.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`p-4 rounded-lg ${
            isSuccess ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            <p className="text-sm">
              {isSuccess 
                ? 'Thank you for your purchase! Your order is being processed.' 
                : 'No worries! You can browse our products again.'}
            </p>
          </div>
          <Button
            onClick={() => router.push('/products')}
            className="w-full"
            variant={isSuccess ? 'default' : 'outline'}
          >
            Back to Products
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

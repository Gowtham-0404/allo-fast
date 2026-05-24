'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProducts, useWarehouses, useReservation } from '@/lib/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function ProductsPage() {
  const { products, loading, error: productsError, fetchProducts } = useProducts();
  const { warehouses, fetchWarehouses } = useWarehouses();
  const { createReservation, loading: reserving, error: reserveError } = useReservation();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
  }, [fetchProducts, fetchWarehouses]);

  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouse) {
      setSelectedWarehouse(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouse]);

  const handleReserve = async (productId: string) => {
    if (!selectedWarehouse) {
      alert('Please select a warehouse');
      return;
    }

    setSelectedProduct(productId);
    setShowForm(true);
  };

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const reservation = await createReservation(
      selectedProduct,
      selectedWarehouse,
      quantity
    );

    if (reservation) {
      // Store reservation in sessionStorage for checkout page
      sessionStorage.setItem(`reservation-${reservation.id}`, JSON.stringify(reservation));
      
      setSuccessMessage(`Reservation created! ID: ${reservation.id}`);
      setShowForm(false);
      setSelectedProduct(null);
      setQuantity(1);
      setSelectedWarehouse(warehouses[0]?.id || '');
      
      // Redirect to checkout after a short delay
      setTimeout(() => {
        window.location.href = `/checkout/${reservation.id}`;
      }, 1000);
    }
  };

  const getAvailableStock = (productId: string): Record<string, number> => {
    const product = products.find(p => p.id === productId);
    if (!product) return {};

    const available: Record<string, number> = {};
    product.warehouseStocks.forEach(stock => {
      available[stock.warehouseId] = stock.totalUnits - stock.reservedUnits;
    });
    return available;
  };

  const currentAvailable = selectedProduct ? getAvailableStock(selectedProduct)[selectedWarehouse] ?? 0 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Inventory Store</h1>
          <p className="text-slate-600">Browse products and make reservations</p>
        </div>

        {(productsError || reserveError) && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{productsError || reserveError}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <div className="mb-6 flex gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Warehouse
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-2 text-slate-900 bg-white"
            >
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => {
            const available = getAvailableStock(product.id)[selectedWarehouse] ?? 0;
            return (
              <Card key={product.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription className="text-sm">{product.sku}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="mb-4">
                    <p className="text-slate-600 text-sm mb-3">{product.description}</p>
                    <div className="space-y-2">
                      <p className="font-bold text-slate-900">Price: ${product.price.toFixed(2)}</p>
                      <p className={`font-semibold ${available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Available: {available} units
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleReserve(product.id)}
                    disabled={available <= 0 || reserving}
                    className="w-full"
                  >
                    {available > 0 ? 'Reserve' : 'Out of Stock'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Reservation Form Modal */}
        {showForm && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Create Reservation</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitReservation} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={currentAvailable}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Available: {currentAvailable} units
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setSelectedProduct(null);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={reserving || quantity > currentAvailable}
                      className="flex-1"
                    >
                      {reserving ? 'Creating...' : 'Create Reservation'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

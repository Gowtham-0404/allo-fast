import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Allo Inventory & Reservations
          </h1>
          <p className="text-xl text-slate-300 mb-8">
            A real-time inventory management system with race-condition-free reservations
          </p>
          <Link
            href="/products"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition"
          >
            Browse Products
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-white font-semibold text-xl mb-2">Smart Reservations</h2>
            <p className="text-slate-300 text-sm mb-4">
              Reserve inventory before payment with automatic expiry
            </p>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>• 10-minute reservation windows</li>
              <li>• Automatic stock release on expiry</li>
              <li>• Race-condition-free with database locking</li>
              <li>• Real-time availability updates</li>
            </ul>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-white font-semibold text-xl mb-2">Multi-Warehouse Support</h2>
            <p className="text-slate-300 text-sm mb-4">
              Manage inventory across multiple warehouse locations
            </p>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>• Track stock per warehouse</li>
              <li>• Reserved vs available units</li>
              <li>• Live inventory sync</li>
              <li>• Warehouse-specific reservations</li>
            </ul>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-white font-semibold text-xl mb-2">Reliable API</h2>
            <p className="text-slate-300 text-sm mb-4">
              RESTful endpoints with transactional safety
            </p>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>• PostgreSQL for strong consistency</li>
              <li>• Serializable transactions</li>
              <li>• Optimistic idempotency keys</li>
              <li>• Comprehensive error handling</li>
            </ul>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-white font-semibold text-xl mb-2">Responsive UI</h2>
            <p className="text-slate-300 text-sm mb-4">
              Modern React interface with real-time updates
            </p>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>• Live countdown timers</li>
              <li>• Error notifications</li>
              <li>• Stock level indicators</li>
              <li>• Instant state updates</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 text-center text-slate-400">
          <p className="mb-4">Ready to test the system?</p>
          <Link
            href="/products"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

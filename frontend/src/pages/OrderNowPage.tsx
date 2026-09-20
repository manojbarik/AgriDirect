import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { MobileNav } from '../components/layout/MobileNav';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/useAuth';
import { getListing } from '../api/marketplace';
import type { MarketplaceListing } from '../api/marketplace';
import { createOrder } from '../api/orders';

export const OrderNowPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();

  const listingId = params.get('listing') ?? '';
  const initialQty = params.get('qty');

  const [listing, setListing] = React.useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [quantity, setQuantity] = React.useState(initialQty ?? '1');
  const [deliveryDate, setDeliveryDate] = React.useState('');
  const [note, setNote] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    getListing(listingId)
      .then((res) => {
        if (cancelled) return;
        setListing(res.data);
        setQuantity(initialQty ?? '1');
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Listing not found.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingId, initialQty]);

  const maxQty = Number(listing?.available_quantity ?? 0);
  const price = Number(listing?.unit_price ?? 0);
  const qty = Number(quantity) || 0;
  const total = qty * price;

  const submit = async () => {
    if (!user) {
      navigate(`/login?redirect=/orders/new?listing=${listingId}&qty=${quantity}`);
      return;
    }
    if (!listing) return;
    if (!quantity || qty <= 0) {
      setError('Enter a quantity greater than 0.');
      return;
    }
    if (user?.role === 'CONSUMER' && qty > 25) {
      setError('Consumers can order up to 25 units per purchase. For bulk orders, use a buyer account.');
      return;
    }
    if (qty > maxQty) {
      setError(`Only ${maxQty} ${listing.unit} available.`);
      return;
    }
    if (!deliveryDate) {
      setError('Pick a delivery date.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const order = await createOrder({
        listing_id: listing.id,
        quantity,
        unit: listing.unit,
        price: listing.unit_price,
        currency: 'INR',
        delivery_date: deliveryDate,
        note: note.trim() || undefined,
        delivery_address_summary: address.trim() || undefined,
      });
      toast({ type: 'success', title: 'Order placed', message: 'The farmer has been notified to confirm your request.' });
      navigate(user?.role === 'CONSUMER' ? `/consumer/orders/${order.data?.id ?? ''}` : `/orders?order=${order.data?.id ?? ''}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="container pb-16 pt-8 max-w-3xl">
        <PageHeader title="Place order" description="Review the listing and confirm your purchase request." />
        <div className="space-y-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-56 rounded-2xl" />
            </div>
          ) : error && !listing ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
              <p className="text-neutral-600">{error}</p>
              <Link to="/marketplace" className="mt-4 inline-block">
                <Button variant="outline">Back to marketplace</Button>
              </Link>
            </div>
          ) : listing ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{listing.title}</CardTitle>
                  <CardDescription>
                    {listing.crop_name ?? listing.category ?? 'Crop'} · Farmer: {listing.farmer_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-neutral-500">Availability</div>
                    <div className="text-lg font-bold text-neutral-900">
                      {Number(listing.available_quantity).toLocaleString('en-IN')} {listing.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-neutral-500">Price</div>
                    <div className="text-lg font-bold text-primary-700">
                      ₹{price.toLocaleString('en-IN')}/{listing.unit}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order details</CardTitle>
                  <CardDescription>Confirm quantity and delivery preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {!user && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 p-3">
                      You are not signed in. Your order will be placed after you sign in.
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Input
                        label={`Quantity (in ${listing.unit}) *`}
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={quantity}
                        error={qty > maxQty ? `Only ${maxQty} ${listing.unit} available` : undefined}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        label="Delivery date *"
                        type="date"
                        min={today}
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Input
                      label="Delivery address (optional)"
                      placeholder="City, locality or delivery notes"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Note to farmer (optional)</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm sm:text-base"
                      placeholder="Quality expectations, packaging…"
                    />
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 p-3" role="alert">
                      {error}
                    </div>
                  )}

                  <div className="rounded-2xl bg-neutral-50 p-4 flex items-center justify-between">
                    <div className="text-sm text-neutral-500">
                      {qty || '—'} {listing.unit} × ₹{price.toLocaleString('en-IN')}
                    </div>
                    <div className="text-lg font-bold text-neutral-900">
                      ₹{total.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => void submit()} isLoading={submitting}>
                      Place order request
                    </Button>
                    <Button variant="outline" onClick={() => navigate(`/marketplace/listings/${listing.id}`)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </main>
      <MobileNav />
    </div>
  );
};
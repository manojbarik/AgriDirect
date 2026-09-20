import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../layouts/Footer';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { searchListings } from '../api/marketplace';
import type { MarketplaceListing } from '../api/marketplace';

interface FarmerRow {
  id: string;
  name: string;
  farmName: string | null;
  state: string | null | undefined;
  district: string | null | undefined;
  listingCount: number;
  totalQuantity: number;
  minPrice: number;
  cropList: string[];
  trustScore: string | null | undefined;
  trustBand: string | null | undefined;
  verified: boolean;
}

export const FarmersDirectoryPage: React.FC = () => {
  const [farmers, setFarmers] = React.useState<FarmerRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
const all: MarketplaceListing[] = [];
      let page = 1;
      let pages: number;
      try {
          do {
            const res = await searchListings({ page, page_size: 100 });
          if (cancelled) return;
          all.push(...res.data.items);
          pages = res.data.pages;
          page += 1;
        } while (page <= Math.min(pages, 3) && all.length < 300);
      } catch {
        if (cancelled) return;
      }
      if (cancelled) return;

      const map = new Map<string, FarmerRow>();
      for (const l of all) {
        if (!l.farmer_id) continue;
        const existing = map.get(l.farmer_id);
        const crop = l.crop_name ?? l.category ?? l.title;
        const price = Number(l.unit_price) || 0;
        if (existing) {
          existing.listingCount += 1;
          existing.totalQuantity += Number(l.available_quantity) || 0;
          existing.minPrice = Math.min(existing.minPrice, price);
          if (crop && !existing.cropList.includes(crop)) existing.cropList.push(crop);
        } else {
          map.set(l.farmer_id, {
            id: l.farmer_id,
            name: l.farmer_name ?? 'Unknown farmer',
            farmName: l.farm_name,
            state: l.state,
            district: l.district,
            listingCount: 1,
            totalQuantity: Number(l.available_quantity) || 0,
            minPrice: price,
            cropList: crop ? [crop] : [],
            trustScore: l.farmer_trust_score,
            trustBand: l.farmer_trust_band,
            verified: l.farmer_verification_status === 'VERIFIED',
          });
        }
      }
      const list = Array.from(map.values()).sort((a, b) => b.listingCount - a.listingCount);
      setFarmers(list);
      setLoading(false);
    };
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8 w-full flex-1">
        <PageHeader
          title="Our farmers"
          description="Meet the farmers supplying AgriDirect, sourced directly from live marketplace listings."
        />
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
          </div>
        ) : farmers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
            <p className="text-neutral-500">No farmers with active listings yet.</p>
            <Link to="/marketplace" className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline">
              Browse the marketplace
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {farmers.map((f) => (
              <Link key={f.id} to={`/marketplace/farmers/${f.id}`}>
                <Card className="h-full hover:shadow-lg hover:border-primary-200 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-neutral-900 truncate">{f.name}</h3>
                        <p className="text-sm text-neutral-500 truncate">{f.farmName ?? 'Farmer'}</p>
                      </div>
                      <Badge variant={f.verified ? 'success' : 'warning'}>{f.verified ? 'Verified' : 'Pending'}</Badge>
                    </div>

                    {f.trustBand && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                        <span className="text-primary-500">★</span>
                        {f.trustBand} trust · {f.trustScore !== null ? `${Math.round(Number(f.trustScore))}/100` : 'n/a'}
                      </div>
                    )}

                    <div className="mt-3 space-y-1">
                      {f.cropList.slice(0, 3).map((crop) => (
                        <div key={crop} className="flex items-center gap-2 text-sm text-neutral-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                          <span className="truncate">{crop}</span>
                        </div>
                      ))}
                      {f.cropList.length > 3 && (
                        <p className="text-xs text-neutral-400">+ {f.cropList.length - 3} more crops</p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-sm">
                      <span className="text-neutral-500">{f.listingCount} listing{f.listingCount !== 1 ? 's' : ''} · {f.state ?? 'India'}</span>
                      <span className="font-semibold text-primary-700">
                        from ₹{f.minPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};
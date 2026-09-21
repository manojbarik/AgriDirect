import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageHeader } from '../layouts';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Dropdown';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { listFarms, listCropCatalog, createListing, publishListing } from '../api/farmer';
import type { Farm, CropCatalogItem } from '../api/farmer';

const GRADES = [
  { value: 'A1', label: 'A1 (Premium)' },
  { value: 'A', label: 'A (Standard)' },
  { value: 'B', label: 'B (Process grade)' },
  { value: 'C', label: 'C (Utility)' },
  { value: 'UNGRADED', label: 'Not graded' },
];

export const AddHarvestPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [farms, setFarms] = React.useState<Farm[]>([]);
  const [crops, setCrops] = React.useState<CropCatalogItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const [farmId, setFarmId] = React.useState('');
  const [cropId, setCropId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [unit, setUnit] = React.useState('kg');
  const [quantity, setQuantity] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [grade, setGrade] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [availableFrom, setAvailableFrom] = React.useState('');
  const [availableUntil, setAvailableUntil] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    Promise.allSettled([listFarms(), listCropCatalog()])
      .then(([f, c]) => {
        if (cancelled) return;
        if (f.status === 'fulfilled') setFarms(f.value.data);
        if (c.status === 'fulfilled') setCrops(c.value.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCrop = crops.find((c) => c.id === cropId);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!farmId) next.farmId = 'Select a farm';
    if (!cropId) next.cropId = 'Select a crop';
    if (!title.trim()) next.title = 'Title is required';
    if (!quantity) next.quantity = 'Quantity is required';
    else if (Number(quantity) <= 0) next.quantity = 'Must be greater than 0';
    if (!price) next.price = 'Price is required';
    else if (Number(price) <= 0) next.price = 'Must be greater than 0';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      let fromDate = availableFrom || undefined;
      let untilDate = availableUntil || undefined;
      if (fromDate && untilDate && fromDate > untilDate) {
        const temp = fromDate;
        fromDate = untilDate;
        untilDate = temp;
      }

      const { data: listing } = await createListing({
        farm_id: farmId,
        crop_id: cropId,
        title: title.trim(),
        unit,
        available_quantity: quantity,
        unit_price: price,
        grade: grade || undefined,
        description: description.trim() || undefined,
        available_from: fromDate,
        available_until: untilDate,
      });

      let isPublished = false;
      try {
        await publishListing(listing.id);
        isPublished = true;
      } catch {
        // If farmer is unverified or publish fails, listing stays as DRAFT
      }

      if (isPublished) {
        toast({ type: 'success', title: 'Harvest published', message: `${title.trim()} is now live on the marketplace.` });
      } else {
        toast({
          type: 'warning',
          title: 'Saved as draft',
          message: `${title.trim()} saved as draft. Verified farmer profile is required before publishing live.`,
        });
      }
      navigate('/farmer/dashboard');
    } catch (err) {
      toast({
        type: 'error',
        title: 'Failed to create listing',
        message: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Add harvest"
        description="List your crop and expected quantity on the marketplace."
      />
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-14 w-2/3 rounded-2xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
              {farms.length === 0 && (
                <Card>
                  <CardContent>
                    <div className="text-center py-6">
                      <p className="font-medium text-neutral-900">No farm registered yet</p>
                      <p className="text-sm text-neutral-500 mt-1">
                        Add a farm before listing a harvest.
                      </p>
                      <Button
                        className="mt-4"
                        variant="outline"
                        onClick={() => navigate('/farmer/farm')}
                      >
                        Register farm
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Listing details</CardTitle>
                  <CardDescription>Fields marked * are required.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Select
                        label="Farm *"
                        placeholder="Select farm"
                        value={farmId}
                        options={farms.map((f) => ({ value: f.id, label: f.name }))}
                        error={errors.farmId}
                        onChange={(e) => { setFarmId(e.target.value); setErrors((p) => ({ ...p, farmId: '' })); }}
                      />
                    </div>
                    <div>
                      <Select
                        label="Crop *"
                        placeholder="Select crop"
                        value={cropId}
                        options={crops.map((c) => ({ value: c.id, label: c.variety ? `${c.name} (${c.variety})` : c.name }))}
                        error={errors.cropId}
                        onChange={(e) => {
                          setCropId(e.target.value);
                          setErrors((p) => ({ ...p, cropId: '' }));
                          const crop = crops.find((c) => c.id === e.target.value);
                          if (crop) {
                            setUnit(crop.default_unit || 'kg');
                            if (!title.trim()) setTitle(crop.name);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <Input
                      label="Title *"
                      placeholder="e.g. Fresh Nagpur oranges"
                      value={title}
                      error={errors.title}
                      onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: '' })); }}
                    />
                  </div>

                  {selectedCrop?.category && (
                    <p className="text-sm text-neutral-500">
                      Category: <span className="font-medium text-neutral-700">{selectedCrop.category}</span>
                    </p>
                  )}

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <Input
                        label="Available quantity *"
                        placeholder={selectedCrop?.default_unit ?? 'kg'}
                        value={quantity}
                        error={errors.quantity}
                        onChange={(e) => { setQuantity(e.target.value); setErrors((p) => ({ ...p, quantity: '' })); }}
                        rightIcon={<span className="text-sm text-neutral-400">{unit}</span>}
                      />
                    </div>
                    <div>
                      <Input
                        label="Price per unit (₹) *"
                        placeholder="e.g. 25"
                        type="number"
                        min="0"
                        step="0.5"
                        value={price}
                        error={errors.price}
                        onChange={(e) => { setPrice(e.target.value); setErrors((p) => ({ ...p, price: '' })); }}
                      />
                    </div>
                    <div>
                      <Select
                        label="Grade"
                        placeholder="Select grade"
                        value={grade}
                        options={GRADES}
                        onChange={(e) => setGrade(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm sm:text-base"
                      placeholder="Notes about quality, harvest method, certification…"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Available from"
                        type="date"
                        value={availableFrom}
                        max={availableUntil || undefined}
                        onChange={(e) => setAvailableFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        label="Available until"
                        type="date"
                        value={availableUntil}
                        min={availableFrom || undefined}
                        onChange={(e) => setAvailableUntil(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button onClick={void submit} isLoading={submitting}>
                      Publish listing
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/farmer/dashboard')}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
    </PageContainer>
  );
};
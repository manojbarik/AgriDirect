import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../layouts/Footer';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { predictPrice, predictDemand, wastageRisk } from '../api/ai';
import type { PricePredictionResult, DemandPredictionResult, WastageRiskResult } from '../api/ai';

type ToolKey = 'price' | 'demand' | 'wastage';

const TOOLS: Array<{ key: ToolKey; title: string; description: string; icon: React.ReactNode }> = [
  {
    key: 'price',
    title: 'Price forecast',
    description: 'Predict market price for a crop near you',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    key: 'demand',
    title: 'Demand forecast',
    description: 'Estimate consumer demand for the coming month',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    key: 'wastage',
    title: 'Wastage risk',
    description: 'Assess post-harvest spoilage risk for a crop',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
];

const SUGGESTED_CROPS = ['Tomato', 'Rice', 'Wheat', 'Onion', 'Potato', 'Soybean', 'Maize', 'Groundnut'];

export const AIAssistantPage: React.FC = () => {
  const [tool, setTool] = React.useState<ToolKey>('price');
  const [crop, setCrop] = React.useState('');
  const [harvestDate, setHarvestDate] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [priceResult, setPriceResult] = React.useState<PricePredictionResult | null>(null);
  const [demandResult, setDemandResult] = React.useState<DemandPredictionResult | null>(null);
  const [wastageResult, setWastageResult] = React.useState<WastageRiskResult | null>(null);

  const resetResults = () => {
    setPriceResult(null);
    setDemandResult(null);
    setWastageResult(null);
    setError(null);
  };

  const run = async () => {
    const cropName = crop.trim();
    if (!cropName) {
      setError('Enter a crop name, e.g. Tomato');
      return;
    }
    resetResults();
    setLoading(true);
    setError(null);
    try {
      if (tool === 'price') {
        const { data } = await predictPrice({ crop_name: cropName });
        setPriceResult(data);
      } else if (tool === 'demand') {
        const { data } = await predictDemand({ crop_name: cropName, month: new Date().getMonth() + 1 });
        setDemandResult(data);
      } else {
        const { data } = await wastageRisk({
          crop: cropName,
          harvest_date: harvestDate || new Date().toISOString().slice(0, 10),
          transport_duration_hours: 6,
        });
        setWastageResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar />

      <section className="bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <Badge variant="outline" className="mb-3 text-primary-100 border-primary-400/30">AI-powered insights</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold">AgriDirect AI Assistant</h1>
          <p className="mt-2 text-primary-100 max-w-xl">
            Get market prices, demand forecasts and wastage-risk insights powered by machine learning models.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-8 w-full flex-1">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tool sidebar */}
          <div className="space-y-3">
            {TOOLS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTool(t.key);
                  resetResults();
                }}
                className={
                  tool === t.key
                    ? 'w-full flex items-center gap-3 p-4 rounded-2xl bg-primary-600 text-white text-left shadow-lg shadow-primary-100'
                    : 'w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-neutral-200 text-left hover:border-primary-300'
                }
              >
                <div className={tool === t.key ? 'h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0' : 'h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0'}>
                  {t.icon}
                </div>
                <div className="min-w-0">
                  <div className="font-medium">{t.title}</div>
                  <div className={tool === t.key ? 'text-primary-100 text-sm' : 'text-neutral-500 text-sm'}>{t.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Main panel */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{TOOLS.find((t) => t.key === tool)?.title}</CardTitle>
                <CardDescription>{TOOLS.find((t) => t.key === tool)?.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Crop name</label>
                    <Input
                      placeholder="e.g. Tomato"
                      value={crop}
                      onChange={(e) => { setCrop(e.target.value); setError(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') void run(); }}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {SUGGESTED_CROPS.map((c) => (
                        <button
                          key={c}
                          onClick={() => { setCrop(c); setError(null); }}
                          className="rounded-full bg-neutral-100 text-neutral-600 text-sm px-3 py-1 font-medium hover:bg-primary-100 hover:text-primary-700"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tool === 'wastage' && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">Harvest date</label>
                      <Input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
                    </div>
                  )}

                  <Button onClick={void run} isLoading={loading} leftIcon={
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                    </svg>
                  }>
                    Run prediction
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {loading && (
              <div className="space-y-3">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
            )}

            {!loading && priceResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Price forecast for {priceResult.crop_name}</CardTitle>
                  <CardDescription>{priceResult.model_version} · model: {priceResult.best_model_name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-primary-50 p-4 text-center">
                      <div className="text-xs text-neutral-500">Predicted price</div>
                      <div className="text-2xl font-bold text-primary-700">
                        {priceResult.currency} {Number(priceResult.predicted_price).toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-neutral-500">per {priceResult.unit}</div>
                    </div>
                    <div className="rounded-2xl bg-neutral-50 p-4 text-center">
                      <div className="text-xs text-neutral-500">Expected range</div>
                      <div className="text-lg font-semibold text-neutral-900">
                        {priceResult.currency} {Number(priceResult.price_range_min).toLocaleString('en-IN')} – {Number(priceResult.price_range_max).toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-neutral-500">per {priceResult.unit}</div>
                    </div>
                    <div className="rounded-2xl bg-neutral-50 p-4 text-center">
                      <div className="text-xs text-neutral-500">Confidence</div>
                      <div className="text-2xl font-bold text-neutral-900">
                        {Math.round(priceResult.confidence_score * 100)}%
                      </div>
                      {priceResult.is_synthetic && <div className="text-xs text-amber-600 mt-1">Synthetic estimate</div>}
                    </div>
                  </div>
                </CardContent>
                {priceResult.disclaimer && (
                  <CardFooter className="text-xs text-neutral-500">{priceResult.disclaimer}</CardFooter>
                )}
              </Card>
            )}

            {!loading && demandResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Demand forecast · {demandResult.crop_name}</CardTitle>
                  <CardDescription>{demandResult.forecast_period}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="rounded-2xl bg-primary-50 p-4">
                        <div className="text-xs text-neutral-500">Predicted demand (month {demandResult.month})</div>
                        <div className="text-2xl font-bold text-primary-700">
                          {Number(demandResult.predicted_demand).toLocaleString('en-IN')} {demandResult.unit}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-neutral-50 p-4">
                        <div className="text-xs text-neutral-500">Recommended supply</div>
                        <div className="text-lg font-semibold text-neutral-900">
                          {Number(demandResult.recommended_quantity).toLocaleString('en-IN')} {demandResult.unit}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-2xl bg-neutral-50 p-4">
                        <div className="text-xs text-neutral-500">Lower estimate</div>
                        <div className="text-lg font-semibold text-neutral-900">
                          {Number(demandResult.predicted_demand_lower).toLocaleString('en-IN')} {demandResult.unit}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-neutral-50 p-4">
                        <div className="text-xs text-neutral-500">Upper estimate</div>
                        <div className="text-lg font-semibold text-neutral-900">
                          {Number(demandResult.predicted_demand_upper).toLocaleString('en-IN')} {demandResult.unit}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-neutral-500">
                    Confidence: {Math.round(demandResult.confidence_score * 100)}% · model: {demandResult.best_model_name}
                  </div>
                </CardContent>
                {demandResult.disclaimer && (
                  <CardFooter className="text-xs text-neutral-500">{demandResult.disclaimer}</CardFooter>
                )}
              </Card>
            )}

            {!loading && wastageResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Wastage risk for {crop}</CardTitle>
                  <CardDescription>Post-harvest spoilage assessment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-2xl bg-neutral-50 p-4 flex-1">
                      <div className="text-xs text-neutral-500">Risk level</div>
                      <Badge variant={wastageResult.risk === 'LOW' ? 'success' : wastageResult.risk === 'MEDIUM' ? 'warning' : 'error'} className="mt-1">
                        {wastageResult.risk}
                      </Badge>
                    </div>
                    <div className="rounded-2xl bg-neutral-50 p-4 flex-1">
                      <div className="text-xs text-neutral-500">Perishability score</div>
                      <div className="text-2xl font-bold text-neutral-900">{wastageResult.perishability_score}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-700 mb-1.5">Suggested actions</div>
                    <ul className="space-y-1.5">
                      {wastageResult.reasons.map((r, i) => (
                        <li key={i} className="text-sm text-neutral-600 flex items-start gap-2">
                          <span className="text-primary-600 mt-0.5">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-sm text-neutral-500 rounded-xl bg-amber-50 border border-amber-100 p-3">
                    {wastageResult.recommendation}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
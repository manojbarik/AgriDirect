import React, { useState } from 'react'
import { 
  Bot, 
  X, 
  Sparkles, 
  TrendingUp, 
  Compass, 
  Loader2, 
  AlertCircle 
} from 'lucide-react'
import { predictPrice, predictDemand, PricePredictionResult, DemandPredictionResult } from '../../api/ai'
import { apiErrorMessage } from '../../api/auth'

interface AgriDirectAssistantProps {
  isOpen: boolean
  onClose: () => void
}

export const AgriDirectAssistant: React.FC<AgriDirectAssistantProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'price' | 'demand' | 'advisor'>('price')
  const [cropName, setCropName] = useState('Wheat')
  const [stateName, setStateName] = useState('Punjab')
  const [variety, setVariety] = useState('Sharbati')
  const [quantity, setQuantity] = useState('1000')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [priceResult, setPriceResult] = useState<PricePredictionResult | null>(null)
  const [demandResult, setDemandResult] = useState<DemandPredictionResult | null>(null)

  if (!isOpen) return null

  const handlePredictPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setPriceResult(null)

    try {
      const res = await predictPrice({
        crop_name: cropName,
        variety: variety || undefined,
        state: stateName || undefined,
        quantity_kg: quantity || undefined,
        month: new Date().getMonth() + 1,
      })
      setPriceResult(res.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handlePredictDemand = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setDemandResult(null)

    try {
      const res = await predictDemand({
        crop_name: cropName,
        variety: variety || undefined,
        state: stateName || undefined,
        month: new Date().getMonth() + 1,
      })
      setDemandResult(res.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-[#0a1811]/95 border-l border-emerald-500/25 h-full flex flex-col shadow-2xl relative z-50 text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-500/20 flex items-center justify-between bg-[#07120c]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/60 border border-emerald-300/30">
              <Bot className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-display">AgriDirect AI Intelligence</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Live Engine
                </span>
              </div>
              <p className="text-xs text-emerald-200/60">Real-time agricultural pricing & market forecasting</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-2 border-b border-white/5 bg-[#050e09]">
          <button
            onClick={() => setActiveTab('price')}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'price'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>AI Price Engine</span>
          </button>
          <button
            onClick={() => setActiveTab('demand')}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'demand'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Demand Forecast</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'price' && (
            <form onSubmit={handlePredictPrice} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/15 text-xs text-emerald-200/80 leading-relaxed">
                Estimate market clearing price for crops based on state, mandi trends, and seasonality.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Crop Name
                </label>
                <input
                  type="text"
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm glass-input"
                  placeholder="e.g. Wheat, Basmati Rice, Mustard"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    State / Region
                  </label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm glass-input"
                    placeholder="e.g. Punjab, Maharashtra"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Variety
                  </label>
                  <input
                    type="text"
                    value={variety}
                    onChange={(e) => setVariety(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm glass-input"
                    placeholder="e.g. Sharbati, Organic"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Quantity (Kg)
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm glass-input"
                  placeholder="e.g. 1000"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Mandi Data…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Calculate Price Forecast</span>
                  </>
                )}
              </button>

              {priceResult && (
                <div className="mt-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-400/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-emerald-300">Predicted Market Rate</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                      Model: {priceResult.best_model_name}
                    </span>
                  </div>

                  <div className="text-3xl font-black text-amber-300 font-display">
                    ₹{priceResult.predicted_price} <span className="text-sm font-normal text-slate-300">/ {priceResult.unit}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-white/10">
                    <span>Expected Range:</span>
                    <span className="font-semibold text-emerald-300">
                      ₹{priceResult.price_range_min} – ₹{priceResult.price_range_max}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Confidence Score:</span>
                    <span className="font-semibold text-amber-300">
                      {Math.round(priceResult.confidence_score * 100)}%
                    </span>
                  </div>

                  {priceResult.disclaimer && (
                    <p className="text-[10px] text-slate-400 italic pt-1">
                      {priceResult.disclaimer}
                    </p>
                  )}
                </div>
              )}
            </form>
          )}

          {activeTab === 'demand' && (
            <form onSubmit={handlePredictDemand} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/15 text-xs text-emerald-200/80 leading-relaxed">
                Forecast commercial buyer procurement demand across upcoming harvest cycles.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Crop Name
                </label>
                <input
                  type="text"
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm glass-input"
                  placeholder="e.g. Tomato, Potato, Onion"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  State / Market
                </label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm glass-input"
                  placeholder="e.g. Karnataka, Gujarat"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 px-4 bg-gradient-to-r from-amber-500 to-emerald-600 hover:brightness-110 text-stone-950 font-bold text-sm shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                    <span>Predicting Demand Cycle…</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-4 h-4 text-stone-950" />
                    <span>Run Demand Forecast</span>
                  </>
                )}
              </button>

              {demandResult && (
                <div className="mt-6 p-4 rounded-2xl bg-amber-950/30 border border-amber-400/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-amber-300">Projected Buyer Demand</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
                      {demandResult.forecast_period}
                    </span>
                  </div>

                  <div className="text-3xl font-black text-emerald-300 font-display">
                    {demandResult.predicted_demand} <span className="text-sm font-normal text-slate-300">{demandResult.unit}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-white/10">
                    <span>Demand Range:</span>
                    <span className="font-semibold text-amber-200">
                      {demandResult.predicted_demand_lower} – {demandResult.predicted_demand_upper} {demandResult.unit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Recommended Harvest Target:</span>
                    <span className="font-semibold text-emerald-400">
                      {demandResult.recommended_quantity} {demandResult.unit}
                    </span>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

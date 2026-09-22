import React, { useState } from 'react'
import {
  Sprout,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Store,
  DollarSign,
  Scale,
  MapPin,
} from 'lucide-react'
import { useAssistant } from '../../contexts/useAssistant'

const COMMON_CROPS = ['Wheat', 'Rice (Paddy)', 'Tomato', 'Potato', 'Onion', 'Maize', 'Soybean']
const GRADES = ['Grade A (Export / Premium)', 'Grade B (Standard Market)', 'Industrial / Processing']

export const ListingAssistantWorkflow: React.FC = () => {
  const { popNav, resetNav, confirmAction, sendMessage, setActiveTab } = useAssistant()

  const [step, setStep] = useState(1)
  const [crop, setCrop] = useState('Wheat')
  const [customCrop, setCustomCrop] = useState('')
  const [quantity, setQuantity] = useState('1000')
  const [grade, setGrade] = useState('Grade A (Export / Premium)')
  const [price, setPrice] = useState('2250')
  const [location, setLocation] = useState('Bhubaneswar Mandi, Odisha')

  const selectedCrop = customCrop.trim() || crop

  const handleNext = () => setStep((s) => Math.min(s + 1, 4))
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1))

  const handleSuggestPrice = () => {
    // Quick AI benchmark suggestion
    setPrice('2280')
  }

  const handleConfirmListing = () => {
    // Prepares the listing confirmation in chat
    sendMessage(
      `Help me publish listing for ${quantity} kg of ${selectedCrop} at ₹${price}/quintal in ${location}. Grade is ${grade}.`
    )
    setActiveTab('chat')
  }

  return (
    <div className="p-4 text-slate-100 flex flex-col h-full justify-between">
      <div>
        {/* Wizard Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
              <Store className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Produce Listing Wizard</h3>
              <p className="text-[11px] text-emerald-300/70">Step {step} of 4</p>
            </div>
          </div>
          <button
            type="button"
            onClick={popNav}
            className="text-xs text-slate-400 hover:text-white underline underline-offset-2"
          >
            ← Back
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 mb-5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Step 1: Crop Selection */}
        {step === 1 && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
              <Sprout className="h-3.5 w-3.5" />
              <span>Select or enter your crop:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_CROPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCrop(c)
                    setCustomCrop('')
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    crop === c && !customCrop
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Or type other crop (e.g. Mustard, Cotton)..."
              value={customCrop}
              onChange={(e) => setCustomCrop(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
        )}

        {/* Step 2: Quantity & Grade */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5 mb-1.5">
                <Scale className="h-3.5 w-3.5" />
                <span>Available Quantity (kg):</span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                ≈ {(Number(quantity) / 100).toFixed(1)} Quintals (or{' '}
                {(Number(quantity) / 1000).toFixed(2)} Tonnes)
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5 mb-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Quality Grade:</span>
              </label>
              <div className="space-y-1.5">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                      grade === g
                        ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Price & Location */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Target Price (₹ per Quintal):</span>
                </label>
                <button
                  type="button"
                  onClick={handleSuggestPrice}
                  className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 font-semibold"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>AI Price Benchmark</span>
                </button>
              </div>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Total expected gross value: ₹
                {((Number(quantity) / 100) * Number(price)).toLocaleString('en-IN')}
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5 mb-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>Farm / Mandi Location:</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>
        )}

        {/* Step 4: Preview & Confirm */}
        {step === 4 && (
          <div className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-4 space-y-2 text-xs">
            <h4 className="font-bold text-sm text-emerald-300 border-b border-emerald-500/20 pb-2">
              Listing Summary Preview
            </h4>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Crop:</span>
              <span className="font-semibold text-white">{selectedCrop}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Quantity:</span>
              <span className="font-semibold text-white">{quantity} kg</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Quality:</span>
              <span className="font-semibold text-amber-300">{grade}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Price / Quintal:</span>
              <span className="font-semibold text-emerald-300">₹{price}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Location:</span>
              <span className="font-semibold text-slate-200">{location}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-300/80">
              ✓ Ready for instant buyer matching and verified digital escrow contracts.
            </div>
          </div>
        )}
      </div>

      {/* Wizard Footer Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-2">
        {step > 1 ? (
          <button
            type="button"
            onClick={handlePrev}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={popNav}
            className="text-xs text-slate-500 hover:text-slate-400"
          >
            Cancel
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60"
          >
            <span>Next</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirmListing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/80"
          >
            <CheckCircle2 className="h-4 w-4 text-amber-300" />
            <span>Confirm & Publish</span>
          </button>
        )}
      </div>
    </div>
  )
}

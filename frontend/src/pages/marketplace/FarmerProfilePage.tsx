import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import { getFarmerProfile, type MarketplaceFarmerProfile } from '../../api/marketplace'
import { getPublicFarmerTrust, type PublicFarmerTrustSnapshot } from '../../api/public'
import { getUserRatingSummary, type UserRatingSummary } from '../../api/ratings'
import { Stars } from '../../components/ratings/RatingSection'
import { TrustBadge } from '../../components/TrustBadge'
import { AgricultureEnvironment } from '../../components/scene/AgricultureEnvironment'
import { Navbar } from '../../layouts/Navbar'
import { Footer } from '../../layouts/Footer'
import { Star, ArrowLeft, Sparkles } from 'lucide-react'

export default function FarmerProfilePage() {
  const { farmerId } = useParams<{ farmerId: string }>()
  const [farmer, setFarmer] = useState<MarketplaceFarmerProfile | null>(null)
  const [trustSnapshot, setTrustSnapshot] = useState<PublicFarmerTrustSnapshot | null>(null)
  const [ratings, setRatings] = useState<UserRatingSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!farmerId) return
    getFarmerProfile(farmerId)
      .then(({ data }) => {
        if (!cancelled) {
          setFarmer(data)
          setError(null)
          void getPublicFarmerTrust(data.id)
            .then(({ data: snapshot }) => {
              if (!cancelled) setTrustSnapshot(snapshot)
            })
            .catch(() => undefined)
          return getUserRatingSummary(data.user_id)
        }
        return undefined
      })
      .then((summary) => {
        if (!cancelled && summary) setRatings(summary.data)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [farmerId])

  if (!farmerId) return null
  if (error) {
    return (
      <AgricultureEnvironment variant="profile" showFarmer={false}>
        <Navbar />
        <main className="page-shell">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-6 text-sm font-semibold text-rose-300">
            {error}
          </div>
          <Link className="inline-flex items-center gap-2 mt-4 text-xs font-bold text-emerald-400" to="/marketplace">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to marketplace</span>
          </Link>
        </main>
        <Footer />
      </AgricultureEnvironment>
    )
  }
  if (!farmer) return null

  return (
    <AgricultureEnvironment variant="profile" showFarmer={true}>
      <Navbar />

      <main className="page-shell">
        <div className="mb-6">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Marketplace</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="eyebrow">Grower Profile</span>
            <span className="status-badge status-badge-success text-[10px]">
              {farmer.verification_status}
            </span>
          </div>

          <h1 className="page-title">{farmer.full_name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <TrustBadge score={farmer.trust_score} band={farmer.trust_band} size="md" />

            {trustSnapshot && (
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>{trustSnapshot.completed_orders} completed orders</span>
              </span>
            )}

            {farmer.rating_avg && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-300" />
                <span>Rated {farmer.rating_avg} / 5.0</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Active Listings Stat */}
          <div className="glass-card rounded-2xl p-6 border border-emerald-500/20">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Active Produce</span>
            <div className="text-4xl font-black text-white font-display mt-1">
              {farmer.active_listings_count}
            </div>
            <p className="text-xs text-emerald-300 mt-1">Published Crop Listings Available</p>
          </div>

          {/* Farm Plots and Lands */}
          <div className="glass-card rounded-2xl p-6 border border-emerald-500/20">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Verified Farms & Landholdings</span>
            <ul className="mt-3 space-y-2.5">
              {farmer.farms.map((farm) => (
                <li key={farm.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{farm.name}</span>
                    {farm.acreage && (
                      <span className="text-emerald-300 font-semibold">{farm.acreage} Acres</span>
                    )}
                  </div>
                  <p className="text-slate-400 mt-0.5">
                    {farm.state}{farm.district ? `, ${farm.district}` : ''}{farm.locality ? `, ${farm.locality}` : ''}
                  </p>
                </li>
              ))}
              {farmer.farms.length === 0 && (
                <li className="text-xs text-slate-400">No public farms on record.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Ratings and Buyer Reviews */}
        <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-emerald-500/20 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-lg font-bold text-white font-display">Buyer Feedback & Reviews</h3>
              <p className="text-xs text-slate-400">Verified transaction reviews from commercial buyers</p>
            </div>
            {ratings && ratings.rating_count > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-amber-300 font-display">{ratings.average_rating}</span>
                <Stars value={Number(ratings.average_rating)} size="lg" />
              </div>
            )}
          </div>

          {ratings && ratings.rating_count > 0 ? (
            <ul className="space-y-3">
              {ratings.history.map((rating) => (
                <li key={rating.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{rating.reviewer_name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                        {rating.reviewer_role}
                      </span>
                    </div>
                    <Stars value={rating.rating} />
                  </div>
                  {rating.comment && (
                    <p className="text-xs text-slate-300 leading-relaxed">{rating.comment}</p>
                  )}
                  <span className="text-[10px] text-slate-500 block">
                    {new Date(rating.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">No buyer reviews recorded yet.</p>
          )}
        </div>
      </main>

      <Footer />
    </AgricultureEnvironment>
  )
}
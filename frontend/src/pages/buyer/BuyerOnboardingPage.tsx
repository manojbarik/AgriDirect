import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import {
  BUYER_TYPE_LABELS,
  BUYER_TYPES,
  createBuyerProfile,
  getBuyerDashboard,
  getBuyerProfile,
  getBuyerStatus,
  requiresBusinessName,
  submitIdentityVerification,
  submitPaymentVerification,
  updateBuyerLocation,
  updateBuyerProfile,
  type BuyerDashboard,
  type BuyerProfile,
  type BuyerStatus,
  type VerificationSubmit,
} from '../../api/buyer'
import { PageContainer, PageHeader } from '../../layouts'
import { useI18n } from '../../i18n/I18nProvider'

async function maybe<T>(promise: Promise<{ data: T }>): Promise<T | null> {
  try {
    const { data } = await promise
    return data
  } catch {
    return null
  }
}

const STEP_KEYS = [
  'buyerType',
  'basic',
  'identity',
  'location',
  'payment',
  'trust',
] as const

function initialStep(profile: BuyerProfile | null, status: BuyerStatus | null): number {
  if (!profile || !status) return 0
  const doneKeys = new Set(status.steps.filter((step) => step.done).map((step) => step.key))
  if (!doneKeys.has('buyer_type')) return 0
  if (!doneKeys.has('basic')) return 1
  if (!doneKeys.has('identity')) return 2
  if (!doneKeys.has('location')) return 3
  if (!doneKeys.has('payment')) return 4
  return 5
}

export default function BuyerOnboardingPage() {
  const { t } = useI18n()
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<BuyerProfile | null>(null)
  const [status, setStatus] = useState<BuyerStatus | null>(null)
  const [dashboard, setDashboard] = useState<BuyerDashboard | null>(null)
  const [identityResult, setIdentityResult] = useState<VerificationSubmit | null>(null)
  const [paymentResult, setPaymentResult] = useState<VerificationSubmit | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    buyer_type: '' as '' | BuyerOnboardingType,
    full_name: '',
    business_name: '',
    address_summary: '',
    state: '',
    district: '',
    locality: '',
    postal_code: '',
    latitude: '',
    longitude: '',
  })

  type BuyerOnboardingType = (typeof BUYER_TYPES)[number]

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      maybe(getBuyerStatus()),
      maybe(getBuyerProfile()),
      maybe(getBuyerDashboard()),
    ]).then(([currentStatus, currentProfile, currentDashboard]) => {
      if (cancelled) return
      setStatus(currentStatus)
      setProfile(currentProfile)
      setDashboard(currentDashboard)
      if (currentProfile) {
        setForm((current) => ({
          ...current,
          buyer_type: currentProfile.buyer_type,
          full_name: currentProfile.full_name,
          business_name: currentProfile.business_name ?? '',
          address_summary: currentProfile.address_summary ?? '',
          state: currentProfile.state ?? '',
          district: currentProfile.district ?? '',
          locality: currentProfile.locality ?? '',
          postal_code: currentProfile.postal_code ?? '',
          latitude: currentProfile.latitude ?? '',
          longitude: currentProfile.longitude ?? '',
        }))
      }
      setStep(initialStep(currentProfile, currentStatus))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const run = async (action: () => Promise<unknown>): Promise<boolean> => {
    setError(null)
    setSubmitting(true)
    try {
      await action()
      setSubmitting(false)
      return true
    } catch (err) {
      setError(apiErrorMessage(err))
      setSubmitting(false)
      return false
    }
  }

  const saveBasics = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.buyer_type) {
      setError(t('onboard.chooseBuyerType'))
      return
    }
    const buyerType = form.buyer_type
    const ok = await run(async () => {
      if (profile) {
        const { data } = await updateBuyerProfile({
          buyer_type: buyerType,
          full_name: form.full_name,
          business_name: form.business_name || undefined,
        })
        setProfile(data)
      } else {
        const { data } = await createBuyerProfile({
          buyer_type: buyerType,
          full_name: form.full_name,
          business_name: form.business_name || undefined,
        })
        setProfile(data)
      }
    })
    if (ok) setStep(2)
  }

  const submitIdentity = async () => {
    const ok = await run(async () => {
      const { data } = await submitIdentityVerification()
      setIdentityResult(data)
      setStatus((current) =>
        current
          ? {
              ...current,
              verification_status: data.verification_status,
              identity_can_submit: true,
            }
          : current,
      )
      if (profile) setProfile({ ...profile, verification_status: data.verification_status })
    })
    if (ok && identityResult?.verification_status === 'VERIFIED') setStep(3)
  }

  const saveLocation = async (event: FormEvent) => {
    event.preventDefault()
    const ok = await run(async () => {
      const { data } = await updateBuyerLocation({
        address_summary: form.address_summary || undefined,
        state: form.state,
        district: form.district,
        locality: form.locality,
        postal_code: form.postal_code,
        latitude: form.latitude || undefined,
        longitude: form.longitude || undefined,
      })
      setProfile(data)
    })
    if (ok) setStep(4)
  }

  const submitPayment = async () => {
    const ok = await run(async () => {
      const { data } = await submitPaymentVerification()
      setPaymentResult(data)
      if (profile)
        setProfile({ ...profile, payment_verification_status: data.verification_status })
    })
    if (ok && paymentResult?.verification_status === 'VERIFIED') setStep(5)
  }

  const needBusinessName = requiresBusinessName(form.buyer_type)
  const identityVerified = profile?.verification_status === 'VERIFIED'
  const paymentVerified = profile?.payment_verification_status === 'VERIFIED'

  return (
    <PageContainer narrow>
      <PageHeader title={t('onboard.title')} description={t('onboard.desc')} />

      <ol className="mb-8 flex flex-wrap gap-2">
        {STEP_KEYS.map((key, index) => (
          <li
            key={key}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              index < step
                ? 'bg-emerald-100 text-[#1B5E3C]'
                : index === step
                  ? 'bg-[var(--primary-emerald)] text-white'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
            }`}
          >
            {index + 1}. {t(`onboard.step.${key}`)}
          </li>
        ))}
      </ol>

      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">{t('onboard.chooseDesc')}</p>
          <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            {BUYER_TYPES.map((buyerType) => (
              <button
                key={buyerType}
                type="button"
                onClick={() => set('buyer_type')(buyerType)}
                className={`rounded-xl border px-4 py-3 text-left font-semibold ${
                  form.buyer_type === buyerType
                    ? 'border-[var(--primary-emerald)] bg-emerald-100 text-[var(--text-bright)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-bright)]'
                }`}
              >
                {BUYER_TYPE_LABELS[buyerType]}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!form.buyer_type}
            onClick={() => setStep(1)}
            className="rounded-full bg-[var(--primary-emerald)] px-6 py-2 font-semibold text-white disabled:opacity-60 hover:brightness-110"
          >
            {t('onboard.continue')}
          </button>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={saveBasics} className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-bright)]">{t('onboard.buyerType')}</span>
            <select
              value={form.buyer_type}
              onChange={(event) => set('buyer_type')(event.target.value)}
              className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none"
            >
              <option value="">{t('onboard.choose')}</option>
              {BUYER_TYPES.map((buyerType) => (
                <option key={buyerType} value={buyerType}>
                  {BUYER_TYPE_LABELS[buyerType]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-bright)]">{t('onboard.fullName')}</span>
            <input
              type="text"
              value={form.full_name}
              onChange={(event) => set('full_name')(event.target.value)}
              required
              minLength={2}
              className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none"
            />
          </label>
          {needBusinessName && (
            <label className="block">
              <span className="text-sm font-semibold text-[var(--text-bright)]">{t('onboard.businessName')}</span>
              <input
                type="text"
                value={form.business_name}
                onChange={(event) => set('business_name')(event.target.value)}
                required
                minLength={2}
                className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none"
              />
            </label>
          )}
          <button type="submit" disabled={submitting} className="rounded-full bg-[var(--primary-emerald)] px-6 py-2 font-semibold text-white disabled:opacity-60 hover:brightness-110">
            {submitting ? t('onboard.saving') : t('onboard.saveContinue')}
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="max-w-2xl space-y-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {t('onboard.identityVerify')}
            </span>
            <p className="mt-1 font-semibold text-[var(--text-bright)]">
              {identityVerified ? 'VERIFIED' : profile?.verification_status ?? 'PENDING'}
            </p>
            {identityResult?.reason && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{identityResult.reason}</p>
            )}
          </div>
          {!identityVerified && (
            <button
              type="button"
              onClick={submitIdentity}
              disabled={submitting || (status ? !status.identity_can_submit : false)}
              className="rounded-full bg-[var(--primary-emerald)] px-6 py-2 font-semibold text-white disabled:opacity-60 hover:brightness-110"
            >
              {submitting ? t('onboard.checking') : t('onboard.submitIdentity')}
            </button>
          )}
          {identityVerified && (
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-full bg-[var(--primary-emerald)] px-6 py-2 font-semibold text-white hover:brightness-110"
            >
              {t('onboard.continueLocation')}
            </button>
          )}
        </div>
      )}

      {step === 3 && (
        <form onSubmit={saveLocation} className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">{t('onboard.deliverWhere')}</p>
          {(['state', 'district', 'locality', 'postal_code', 'address_summary'] as const).map(
            (field) => (
              <label key={field} className="block">
                <span className="text-sm font-semibold text-[var(--text-bright)]">
                  {field
                    .split('_')
                    .map((word) => word[0].toUpperCase() + word.slice(1))
                    .join(' ')}
                </span>
                <input
                  type="text"
                  value={form[field]}
                  onChange={(event) => set(field)(event.target.value)}
                  className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none"
                />
              </label>
            ),
          )}
          <div className="flex gap-3">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--text-bright)]">{t('onboard.latitude')}</span>
              <input
                type="number"
                step="0.000001"
                value={form.latitude}
                onChange={(event) => set('latitude')(event.target.value)}
                className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--text-bright)]">{t('onboard.longitude')}</span>
              <input
                type="number"
                step="0.000001"
                value={form.longitude}
                onChange={(event) => set('longitude')(event.target.value)}
                className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none"
              />
            </label>
          </div>
          <button type="submit" disabled={submitting} className="rounded-full bg-[var(--primary-emerald)] px-6 py-2 font-semibold text-white disabled:opacity-60 hover:brightness-110">
            {submitting ? t('onboard.saving') : t('onboard.saveContinue')}
          </button>
        </form>
      )}

      {step === 4 && (
        <div className="max-w-2xl space-y-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {t('onboard.paymentVerify')}
            </span>
            <p className="mt-1 font-semibold text-[var(--text-bright)]">
              {paymentVerified ? 'VERIFIED' : profile?.payment_verification_status ?? 'PENDING'}
            </p>
            {paymentResult?.reason && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{paymentResult.reason}</p>
            )}
            {profile?.payment_profile_reference && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {t('onboard.reference').replace('{ref}', profile.payment_profile_reference)}
              </p>
            )}
          </div>
          {!paymentVerified && (
            <button
              type="button"
              onClick={submitPayment}
              disabled={submitting || (status ? !status.payment_can_submit : false)}
              className="rounded-full bg-[var(--primary-emerald)] px-6 py-2 font-semibold text-white disabled:opacity-60 hover:brightness-110"
            >
              {submitting ? t('onboard.checking') : t('onboard.submitPayment')}
            </button>
          )}
          {paymentVerified && (
            <button
              type="button"
              onClick={() => setStep(5)}
              className="rounded-full bg-[var(--primary-emerald)] px-6 py-2 font-semibold text-white hover:brightness-110"
            >
              {t('onboard.continueTrust')}
            </button>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="max-w-2xl space-y-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {t('onboard.trustStatus')}
            </span>
            <p className="mt-1 text-3xl font-extrabold text-[var(--text-bright)]">
              {dashboard?.trust_score ?? '0'}
              <span className="ml-1 text-base font-semibold text-[var(--text-muted)]">
                / 100 · {dashboard?.trust_band ?? 'NEW'}
              </span>
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {t('onboard.trustGrows')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`status-badge status-badge-${profile?.verification_status === 'VERIFIED' ? 'success' : profile?.verification_status === 'REJECTED' ? 'warning' : 'neutral'}`}>
              {t('onboard.identity').replace('{status}', profile?.verification_status ?? 'PENDING')}
            </span>
            <span className={`status-badge status-badge-${profile?.payment_verification_status === 'VERIFIED' ? 'success' : profile?.payment_verification_status === 'REJECTED' ? 'warning' : 'neutral'}`}>
              {t('onboard.payment').replace('{status}', profile?.payment_verification_status ?? 'PENDING')}
            </span>
          </div>
          <div className="flex gap-3">
            <Link to="/buyer/dashboard" className="rounded-full bg-[var(--primary-emerald)] px-6 py-2 font-semibold text-white hover:brightness-110">
              {t('onboard.goDashboard')}
            </Link>
            <Link to="/buyer/demands" className="rounded-full border border-[var(--primary-emerald)] px-6 py-2 font-semibold text-[var(--primary-emerald)]">
              {t('onboard.createDemand')}
            </Link>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

/**
 * PremiumUpgradeFlow
 *
 * Premium upgrade landing page and modal flow.
 * Phase-aware adaptive pulse theming, pricing matrix, social proof.
 * Design: /home/team/shared/premium-upgrade-flow-design.md
 */

import { useState } from 'react'
import { mockCycleData, PHASE_STYLES } from '../utils/mockData'

// Real Stripe Payment Link for EndoBuddy Premium. NOTE: a single Payment
// Link checks out one fixed Price — it can't switch between monthly/annual
// on its own. This link currently corresponds to ONE of the two prices
// below. The Annual/Monthly toggle in the UI is still just a cosmetic
// preview until a second Payment Link is created for the other price;
// both buttons currently lead to the same checkout.
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/9B65kF4YiarC9UwgcQbMQ02'
// Reference only — not used directly since Payment Links don't accept a
// price override via URL. Useful once you wire up a second Payment Link
// or move to server-created Checkout Sessions.
// Annual:  price_1Twua0RkxErY3Eu59wtcgiKl
// Monthly: price_1Twua0RkxErY3Eu5otstZgNX

const FEATURES = [
  { name: 'Daily Symptom Tracking', free: true, premium: true },
  { name: 'Basic Cycle Insights', free: true, premium: true },
  { name: 'Advanced AI Correlations', free: false, premium: true },
  { name: 'Surgical-Grade Doctor Reports', free: false, premium: true },
  { name: 'Personalized Phase Meals', free: false, premium: true },
  { name: '7-Day Pain Forecasts', free: false, premium: true },
  { name: 'Treatment Response Dashboard', free: false, premium: true },
  { name: 'Surgical Planning Summary', free: false, premium: true },
]

export default function PremiumUpgradeFlow({ onClose, onUpgrade, userId }) {
  const [billingCycle, setBillingCycle] = useState('yearly')

  const phase = mockCycleData?.currentPhase || 'luteal'
  const phaseStyle = PHASE_STYLES[phase] || PHASE_STYLES.luteal

  const monthlyPrice = billingCycle === 'yearly' ? 5.99 : 8.99
  const yearlyTotal = 5.99 * 12

  // Sends the shopper to Stripe's own hosted checkout page instead of
  // collecting card details ourselves. client_reference_id lets you match
  // the Stripe payment back to this app's user record later (e.g. from a
  // webhook or the Stripe Dashboard).
  const handleCheckout = () => {
    const url = new URL(STRIPE_PAYMENT_LINK)
    if (userId) url.searchParams.set('client_reference_id', userId)
    window.location.href = url.toString()
  }

  // ===== LANDING PAGE =====
  return (
    <div className={`${phaseStyle.bg} min-h-screen`}>
      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* Close */}
        <div className="flex justify-end mb-4">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">✕ Close</button>
        </div>

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/80 rounded-full px-4 py-1.5 mb-4 shadow-sm border border-gray-100">
            <span className={`w-2 h-2 rounded-full ${phaseStyle.dot}`} />
            <span className={`text-xs font-semibold ${phaseStyle.text}`}>{phaseStyle.label} Phase</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 font-display leading-tight">
            Turn your daily pain<br />into <span style={{ color: phaseStyle.color }}>clinical evidence</span>.
          </h1>
          <p className="text-sm text-gray-600 mt-3 max-w-md mx-auto leading-relaxed">
            EndoBuddy Premium gives you the AI patterns, specialist reports, and personalized
            wellness plans you need to get believed, answered, and better — faster.
          </p>
        </div>

        {/* Feature Showcase */}
        <div className="space-y-3 mb-8">
          <div className="bg-white/90 rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg">🔍</div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Advanced AI Pattern Analysis</h3>
                <p className="text-xs text-gray-500">See the invisible — AI maps stress, diet, and symptom correlations</p>
              </div>
            </div>
          </div>
          <div className="bg-white/90 rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-endo-purple/10 flex items-center justify-center text-lg">📋</div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Surgical-Grade Doctor Reports</h3>
                <p className="text-xs text-gray-500">Lesion-mapped reports that streamline surgical consults</p>
              </div>
            </div>
          </div>
          <div className="bg-white/90 rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-lg">🌿</div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Personalized Phase-Specific Wellness</h3>
                <p className="text-xs text-gray-500">Meals and movement that meet you where your body is</p>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="bg-white/80 rounded-2xl p-4 mb-8 border border-gray-100 text-center">
          <p className="text-xs text-gray-500 italic leading-relaxed">
            "The EndoBuddy Doctor Report provides the longitudinal evidence we often miss in a 15-minute appointment."
          </p>
          <p className="text-xs font-semibold text-gray-700 mt-2">— Dr. Sarah Chen, Endometriosis Specialist</p>
        </div>

        {/* Pricing */}
        <div className="bg-white/90 rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-center gap-3 mb-5">
            <button onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${billingCycle === 'yearly' ? 'bg-endo-purple text-white' : 'bg-gray-100 text-gray-600'}`}>
              Annual ★ Save 30%
            </button>
            <button onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${billingCycle === 'monthly' ? 'bg-endo-purple text-white' : 'bg-gray-100 text-gray-600'}`}>
              Monthly
            </button>
          </div>

          <div className="text-center mb-5">
            <span className="text-4xl font-bold text-gray-900">${monthlyPrice}</span>
            <span className="text-sm text-gray-500">/mo</span>
            {billingCycle === 'yearly' && (
              <p className="text-xs text-green-600 mt-1">Billed annually at ${yearlyTotal.toFixed(2)} — cancel anytime</p>
            )}
          </div>

          {/* Feature comparison */}
          <div className="space-y-2 mb-5">
            {FEATURES.map(f => (
              <div key={f.name} className="flex items-center justify-between text-xs py-1">
                <span className="text-gray-700">{f.name}</span>
                <div className="flex items-center gap-4">
                  <span className={f.free ? 'text-green-500' : 'text-gray-300'}>{f.free ? '✅' : '—'}</span>
                  <span className={f.premium ? 'text-green-500' : 'text-gray-300'}>{f.premium ? '✅' : '—'}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-[10px] font-medium pt-1 border-t border-gray-100">
              <span className="text-gray-400" />
              <span className="text-gray-500 w-8 text-center">Free</span>
              <span className="text-endo-purple w-8 text-center">Premium</span>
            </div>
          </div>

          <button onClick={handleCheckout}
            className="w-full py-3.5 text-base font-bold text-white rounded-xl transition-all hover:opacity-90 shadow-lg"
            style={{ backgroundColor: phaseStyle.color || '#7C3AED' }}>
            Unlock My Insights
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-3">You'll complete secure payment on Stripe. Cancel anytime. 🔒 HIPAA-aligned</p>
        </div>

        {/* Trust */}
        <div className="text-center text-[10px] text-gray-400 space-y-1 pb-8">
          <p>Join 50,000+ warriors finding their patterns.</p>
          <p>Your health data is yours. Always encrypted, never shared.</p>
        </div>
      </div>
    </div>
  )
}

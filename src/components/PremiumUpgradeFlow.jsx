/**
 * PremiumUpgradeFlow
 *
 * Premium upgrade landing page and modal flow.
 * Phase-aware adaptive pulse theming, pricing matrix, social proof.
 * Design: /home/team/shared/premium-upgrade-flow-design.md
 */

import { useState } from 'react'
import { mockCycleData, PHASE_STYLES } from '../utils/mockData'

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

export default function PremiumUpgradeFlow({ onClose, onUpgrade }) {
  const [billingCycle, setBillingCycle] = useState('yearly')
  const [checkoutStep, setCheckoutStep] = useState('landing')
  const [email, setEmail] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [processing, setProcessing] = useState(false)

  const phase = mockCycleData?.currentPhase || 'luteal'
  const phaseStyle = PHASE_STYLES[phase] || PHASE_STYLES.luteal

  const monthlyPrice = billingCycle === 'yearly' ? 5.99 : 8.99
  const yearlyTotal = 5.99 * 12

  const handleCheckout = () => {
    setProcessing(true)
    setTimeout(() => {
      setProcessing(false)
      setCheckoutStep('success')
      if (onUpgrade) onUpgrade()
    }, 1500)
  }

  // ===== SUCCESS VIEW =====
  if (checkoutStep === 'success') {
    return (
      <div className={`min-h-screen ${phaseStyle.bg} flex items-center justify-center p-6`}>
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="text-7xl animate-bounce">🌟</div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome to Premium!</h2>
          <p className="text-gray-600">Your insights, reports, and personalized plans are now unlocked.</p>
          <button onClick={onClose} className="btn-primary text-lg px-10 py-3">
            Start Exploring
          </button>
        </div>
      </div>
    )
  }

  // ===== CHECKOUT VIEW =====
  if (checkoutStep === 'checkout') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Complete Payment</h2>
            <button onClick={() => setCheckoutStep('landing')} className="text-sm text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <div className="bg-endo-purple/5 rounded-xl p-4 border border-endo-purple/10">
            <p className="text-sm font-semibold text-gray-800">EndoBuddy Premium</p>
            <p className="text-2xl font-bold text-endo-purple">${monthlyPrice}<span className="text-sm font-normal text-gray-500">/mo</span></p>
            {billingCycle === 'yearly' && <p className="text-xs text-green-600">You save 30% (${yearlyTotal.toFixed(2)}/year)</p>}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-endo-purple outline-none"
                placeholder="you@email.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Card Number</label>
              <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-endo-purple outline-none"
                placeholder="4242 4242 4242 4242" maxLength={19} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Expiry</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-endo-purple outline-none" placeholder="MM/YY" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">CVC</label>
                <input type="text" className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-endo-purple outline-none" placeholder="123" maxLength={4} />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 text-center">🔒 Secured with bank-grade encryption. Your health data stays private.</p>

          <button onClick={handleCheckout} disabled={processing || !email || !cardNumber}
            className="w-full py-3.5 text-base font-bold text-white rounded-xl transition-all disabled:opacity-50"
            style={{ backgroundColor: phaseStyle.color || '#7C3AED' }}>
            {processing ? 'Processing...' : `Pay $${monthlyPrice}/mo`}
          </button>
          <button onClick={() => setCheckoutStep('landing')} className="w-full text-xs text-gray-500 hover:text-gray-700">Cancel</button>
        </div>
      </div>
    )
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

          <button onClick={() => setCheckoutStep('checkout')}
            className="w-full py-3.5 text-base font-bold text-white rounded-xl transition-all hover:opacity-90 shadow-lg"
            style={{ backgroundColor: phaseStyle.color || '#7C3AED' }}>
            Unlock My Insights
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-3">Cancel anytime. No questions asked. 🔒 HIPAA-aligned</p>
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

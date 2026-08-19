/**
 * Shared display helpers for cycle/pain visualizations.
 * NOTE: This file must never export fabricated user data (fake logs,
 * fake insights, etc). It's for styling/labeling constants only —
 * actual cycle days and insights always come from the API.
 */

// Pain scale color reference
export const PAIN_COLORS = {
  0: { bg: 'bg-gray-100', text: 'text-gray-300', hex: '#F3F4F6' },
  1: { bg: 'bg-green-200', text: 'text-green-700', hex: '#BBF7D0' },
  2: { bg: 'bg-green-300', text: 'text-green-800', hex: '#86EFAC' },
  3: { bg: 'bg-lime-300', text: 'text-lime-800', hex: '#BEF264' },
  4: { bg: 'bg-yellow-300', text: 'text-yellow-800', hex: '#FDE047' },
  5: { bg: 'bg-orange-300', text: 'text-orange-800', hex: '#FDBA74' },
  6: { bg: 'bg-orange-400', text: 'text-orange-900', hex: '#FB923C' },
  7: { bg: 'bg-red-400', text: 'text-red-900', hex: '#F87171' },
  8: { bg: 'bg-red-500', text: 'text-white', hex: '#EF4444' },
  9: { bg: 'bg-red-600', text: 'text-white', hex: '#DC2626' },
  10: { bg: 'bg-purple-700', text: 'text-white', hex: '#6D28D9' },
}

export function getPainColor(painLevel) {
  return PAIN_COLORS[painLevel] || PAIN_COLORS[0]
}

// Phase styling
export const PHASE_STYLES = {
  menstrual: {
    label: 'Menstrual',
    color: '#EF4444',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-400',
    description: 'Period bleeding — low estrogen and progesterone. Focus on rest and hydration.',
  },
  follicular: {
    label: 'Follicular',
    color: '#22C55E',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-400',
    description: 'Follicles develop — estrogen rises. Energy is building.',
  },
  ovulatory: {
    label: 'Ovulatory',
    color: '#EAB308',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    dot: 'bg-yellow-400',
    description: 'Egg released — estrogen peaks. You might feel more social or energetic.',
  },
  luteal: {
    label: 'Luteal',
    color: '#A855F7',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-400',
    description: 'Progesterone rises — PMS symptoms common. Focus on gentle movement.',
  },
  // Neutral day-counter for acyclic users who opted to track a cyclical
  // hormone therapy pattern (e.g. cyclic HRT). Deliberately avoids
  // menstrual/follicular/ovulatory/luteal language, since those describe
  // ovarian biology this pattern doesn't necessarily reflect.
  hormoneCycle: {
    label: 'Hormone therapy',
    color: '#6366F1',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-400',
    description: "Tracking your hormone therapy pattern — not a menstrual phase.",
  },
  // Shown for acyclic users not tracking any cycle at all (e.g. post-
  // hysterectomy, no hormone therapy pattern to track). No phase implied.
  off: {
    label: 'Cycle tracking off',
    color: '#6B7280',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
    description: "You're logging symptoms day-to-day, with no cycle phase applied.",
  },
}

// Phase order for the cycle map
export const PHASE_ORDER = ['menstrual', 'follicular', 'ovulatory', 'luteal']
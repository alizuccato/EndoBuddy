/**
 * Mock data for Insights Dashboard development
 * Provides realistic sample data for cycle tracking, symptoms, and AI insights
 */

import { getLocalDateString } from './dateHelpers'

const DAY_MS = 86400000
const today = new Date()
const todayStr = getLocalDateString(today)

// Generate a realistic 30-day cycle starting 15 days ago
function generateCycleDays() {
  const days = []
  const cycleStart = new Date(today.getTime() - 15 * DAY_MS)
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(cycleStart.getTime() + i * DAY_MS)
    const dateStr = getLocalDateString(date)
    const dayNum = i + 1
    
    // Determine cycle phase
    let phase
    if (dayNum <= 5) phase = 'menstrual'
    else if (dayNum <= 14) phase = 'follicular'
    else if (dayNum === 15) phase = 'ovulatory'
    else phase = 'luteal'
    
    // Generate realistic pain patterns
    let painLevel = 0
    let symptoms = []
    let flowLevel = null
    
    if (phase === 'menstrual') {
      painLevel = Math.floor(Math.random() * 3) + 6 // 6-8
      flowLevel = ['heavy', 'medium', 'medium', 'light', 'spotting'][i]
      symptoms = [
        { id: 2, name: 'Cramping', icon: '⚡', category: 'pain' },
        { id: 1, name: 'Bloating', icon: '🫃', category: 'digestive' },
        { id: 3, name: 'Fatigue', icon: '😴', category: 'general' },
      ]
    } else if (phase === 'follicular') {
      painLevel = Math.max(0, Math.floor(Math.random() * 4) - 1) // 0-2
      if (Math.random() > 0.6) {
        symptoms = [
          { id: 3, name: 'Fatigue', icon: '😴', category: 'general' },
        ]
      }
    } else if (phase === 'ovulatory') {
      painLevel = Math.floor(Math.random() * 3) + 3 // 3-5
      symptoms = [
        { id: 1, name: 'Bloating', icon: '🫃', category: 'digestive' },
        { id: 5, name: 'Headache', icon: '🤕', category: 'pain' },
      ]
    } else { // luteal
      painLevel = Math.floor(Math.random() * 4) + 3 // 3-6
      symptoms = [
        { id: 1, name: 'Bloating', icon: '🫃', category: 'digestive' },
        { id: 8, name: 'Mood swings', icon: '🎢', category: 'emotional' },
        { id: 9, name: 'Anxiety', icon: '😰', category: 'emotional' },
      ]
    }
    
    days.push({
      date: dateStr,
      dayNum,
      phase,
      painLevel,
      symptoms: dateStr <= todayStr ? symptoms : [],
      flowLevel,
      isFuture: dateStr > todayStr,
      isToday: dateStr === todayStr,
      stressLevel: Math.floor(Math.random() * 8) + 2,
      sleepHours: (Math.random() * 3 + 5).toFixed(1),
      mood: phase === 'menstrual' || phase === 'luteal' 
        ? ['irritable', 'anxious', 'neutral'][Math.floor(Math.random() * 3)]
        : ['happy', 'calm', 'energetic'][Math.floor(Math.random() * 3)],
    })
  }
  
  return days
}

const cycleDays = generateCycleDays()

// Current phase context
const currentDay = cycleDays.find(d => d.isToday) || cycleDays[cycleDays.length - 1]

export const mockCycleData = {
  days: cycleDays,
  currentPhase: currentDay.phase,
  currentDayNum: currentDay.dayNum,
  cycleStartDate: cycleDays[0].date,
  cycleLength: 30,
  periodLength: 5,
}

// AI Insights
export const mockInsights = [
  {
    id: 1,
    type: 'pattern_alert',
    title: 'Pattern: Back Pain & Your Cycle',
    description: 'Your back pain consistently starts 2 days before your period and peaks on Day 2. This pattern has been observed across your last 3 cycles.',
    confidence: 0.92,
    icon: '🔍',
    actionLabel: 'View Detailed Pattern',
    severity: 'info',
  },
  {
    id: 2,
    type: 'comparison',
    title: 'Fatigue Levels Improving',
    description: 'Your fatigue is 15% lower this cycle compared to last month. Your sleep quality has also improved by 1.2 hours on average.',
    confidence: 0.85,
    icon: '📈',
    actionLabel: 'See Sleep Trends',
    severity: 'positive',
  },
  {
    id: 3,
    type: 'flare_warning',
    title: '3 Days of Severe Pain Noted',
    description: 'You\'ve logged "Severe" pain for 3 days. Your next phase (Follicular) starts tomorrow, which often brings relief.',
    confidence: 0.78,
    icon: '⚠️',
    actionLabel: 'Flare-Up Guide',
    severity: 'warning',
  },
  {
    id: 4,
    type: 'wellness_prompt',
    title: 'Nutrition Tip for Luteal Phase',
    description: 'Based on your current phase, magnesium-rich foods like dark chocolate, leafy greens, and pumpkin seeds may help with the cramping you\'re experiencing.',
    confidence: 0.88,
    icon: '🌿',
    actionLabel: 'See Meal Suggestions',
    severity: 'info',
  },
  {
    id: 5,
    type: 'wellness_prompt',
    title: 'Gentle Movement Recommended',
    description: 'Your energy levels are lower this week. Gentle stretching or a short walk may help with the lower back pain you\'ve been logging.',
    confidence: 0.75,
    icon: '🧘',
    actionLabel: 'See Exercise Tips',
    severity: 'info',
  },
]

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
}

// Phase order for the cycle map
export const PHASE_ORDER = ['menstrual', 'follicular', 'ovulatory', 'luteal']
/**
 * PremiumMealPlans
 * 
 * Phase-specific dynamic meal planning with dietary filters and Flare-Up Mode.
 * Uses domain-validated content from meal-suggestions.md.
 * Features: Phase context bar, dietary filters, menu cards, flare-up toggle, shopping list.
 */

import { useState, useCallback, useMemo } from 'react'
import { PHASE_STYLES } from '../utils/mockData'

const PHASE_MEALS = {
  menstrual: {
    focus: 'Rest, hydration, anti-inflammatory & iron-rich foods',
    meals: {
      breakfast: { name: 'Warm Oatmeal with Berries & Flaxseed', why: 'Oats provide sustained energy; flaxseed adds omega-3s for inflammation.', ingredients: ['Rolled oats', 'Mixed berries', 'Ground flaxseed', 'Honey'] },
      lunch: { name: 'Kale & Salmon Salad with Avocado', why: 'Salmon is rich in omega-3s; kale provides iron lost during menstruation.', ingredients: ['Kale', 'Salmon fillet', 'Avocado', 'Olive oil', 'Lemon'] },
      dinner: { name: 'Sweet Potato & Lentil Curry', why: 'Sweet potatoes are rich in magnesium; lentils provide iron and fiber.', ingredients: ['Sweet potato', 'Red lentils', 'Coconut milk', 'Curry powder', 'Onion', 'Garlic'] },
      snack: [
        { name: 'Dark Chocolate (70%+)', why: 'Magnesium-rich — helps with cramping.', ingredients: ['Dark chocolate (70%+)'] },
        { name: 'Warm Ginger Tea', why: 'Ginger has anti-inflammatory properties.', ingredients: ['Fresh ginger root', 'Honey'] },
      ],
    },
    flareUp: {
      breakfast: { name: 'Simple Bone Broth with Soft Rice', why: 'Warm, easy-to-digest, and soothing for the gut.', ingredients: ['Bone broth', 'White rice'] },
      lunch: { name: 'Stewed Apples with Cinnamon', why: 'Gentle on the stomach; cinnamon helps regulate blood sugar.', ingredients: ['Apples', 'Cinnamon'] },
      dinner: { name: 'Butternut Squash Soup (Blended)', why: 'Warm, low-residue, and full of vitamin A for recovery.', ingredients: ['Butternut squash', 'Vegetable broth', 'Fresh ginger'] },
      snack: [
        { name: 'Herbal Chamomile Tea', why: 'Calms the nervous system and supports sleep.', ingredients: ['Chamomile tea bags'] },
      ],
    },
  },
  follicular: {
    focus: 'Energy building, iron-rich foods, light movement',
    meals: {
      breakfast: { name: 'Green Smoothie Bowl', why: 'Spinach provides iron; banana gives quick energy for rising estrogen.', ingredients: ['Spinach', 'Banana', 'Almond milk', 'Chia seeds'] },
      lunch: { name: 'Quinoa & Chickpea Salad with Lemon', why: 'Quinoa is a complete protein; lemon aids iron absorption.', ingredients: ['Quinoa', 'Chickpeas', 'Lemon', 'Cucumber', 'Olive oil'] },
      dinner: { name: 'Grilled Chicken with Roasted Veggies', why: 'Lean protein supports tissue repair; colorful veggies provide antioxidants.', ingredients: ['Chicken breast', 'Bell peppers', 'Zucchini', 'Olive oil'] },
      snack: [
        { name: 'Handful of Almonds', why: 'Vitamin E supports endometrial health.', ingredients: ['Almonds'] },
        { name: 'Fresh Orange', why: 'Vitamin C boosts immune system.', ingredients: ['Orange'] },
      ],
    },
    flareUp: null,
  },
  ovulatory: {
    focus: 'Fiber-rich, liver-supporting foods for estrogen metabolism',
    meals: {
      breakfast: { name: 'Chia Pudding with Berries', why: 'Chia seeds are high in fiber and omega-3s.', ingredients: ['Chia seeds', 'Almond milk', 'Mixed berries'] },
      lunch: { name: 'Broccoli & Tofu Stir-fry', why: 'Broccoli supports liver detoxification of excess estrogen.', ingredients: ['Broccoli', 'Tofu', 'Soy sauce', 'Garlic', 'Fresh ginger'] },
      dinner: { name: 'Grilled Mackerel with Asparagus', why: 'Mackerel is rich in vitamin D; asparagus supports hormone balance.', ingredients: ['Mackerel fillet', 'Asparagus', 'Lemon', 'Olive oil'] },
      snack: [
        { name: 'Hummus with Crudités', why: 'Fiber-rich vegetables support gut health and estrogen metabolism.', ingredients: ['Hummus', 'Carrots', 'Celery', 'Bell pepper'] },
      ],
    },
    flareUp: null,
  },
  luteal: {
    focus: 'Magnesium, complex carbs, mood-stabilizing foods',
    meals: {
      breakfast: { name: 'Sweet Potato & Egg Scramble', why: 'Complex carbs boost serotonin; eggs provide B6 for hormone balance.', ingredients: ['Sweet potato', 'Eggs', 'Spinach'] },
      lunch: { name: 'Warm Quinoa Bowl with Roasted Veggies', why: 'Quinoa is magnesium-rich; warm food comforts the nervous system.', ingredients: ['Quinoa', 'Carrots', 'Zucchini', 'Olive oil'] },
      dinner: { name: 'Wild Salmon with Kale & Sweet Potato', why: 'Omega-3s reduce prostaglandins; kale supports estrogen clearance.', ingredients: ['Wild salmon fillet', 'Kale', 'Sweet potato'] },
      snack: [
        { name: 'Pumpkin Seeds', why: 'High in magnesium and zinc for hormone support.', ingredients: ['Pumpkin seeds'] },
        { name: 'Dark Chocolate', why: 'Magnesium and mood-boosting compounds.', ingredients: ['Dark chocolate (70%+)'] },
      ],
    },
    flareUp: {
      breakfast: { name: 'Simple Rice Porridge (Congee)', why: 'Warm, easily digestible, and grounding.', ingredients: ['White rice', 'Vegetable broth', 'Fresh ginger'] },
      lunch: { name: 'Mashed Potato with Bone Broth', why: 'Gentle on digestion; warming and nourishing.', ingredients: ['Potatoes', 'Bone broth'] },
      dinner: { name: 'Steamed Fish with Zucchini Noodles', why: 'Light but nutrient-dense; easy on the gut.', ingredients: ['White fish fillet', 'Zucchini'] },
      snack: [
        { name: 'Chamomile & Peppermint Tea', why: 'Calming for both mood and digestion.', ingredients: ['Chamomile tea bags', 'Peppermint tea bags'] },
      ],
    },
  },
}

const DIETARY_FILTERS = ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Nut-Free']

// Nut-Free runtime substitutions for phase meals containing nuts
const NUT_FREE_SUBSTITUTIONS = {
  follicular: {
    snack: [
      { name: 'Sunflower Seed & Date Bites', why: 'Seeds provide vitamin E for endometrial health without nuts.', ingredients: ['Sunflower seeds', 'Dates'] },
      { name: 'Fresh Orange', why: 'Vitamin C boosts immune system.', ingredients: ['Orange'] }
    ]
  },
  luteal: {
    snack: [
      { name: 'Dark Chocolate (verify nut-free)', why: 'Most 70%+ dark chocolate is nut-free. Pair with dried fruit instead of nuts.', ingredients: ['Dark chocolate (70%+)', 'Dried fruit'] },
      { name: 'Roasted Chickpeas with Sea Salt', why: 'Crunchy, magnesium-rich, and naturally nut-free.', ingredients: ['Chickpeas', 'Olive oil', 'Sea salt'] }
    ]
  }
}

export default function PremiumMealPlans({ currentPhase, isPremium = true }) {
  const [flareMode, setFlareMode] = useState(false)
  const [activeFilters, setActiveFilters] = useState([])
  const [expandedMeal, setExpandedMeal] = useState(null)
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [checkedItems, setCheckedItems] = useState({})
  const [copied, setCopied] = useState(false)

  const phase = currentPhase || 'luteal'
  const phaseStyle = PHASE_STYLES[phase] || PHASE_STYLES.luteal
  const phaseData = PHASE_MEALS[phase] || PHASE_MEALS.luteal

  const toggleFilter = useCallback((filter) => {
    setActiveFilters(prev => prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter])
  }, [])

  // Apply nut-free filter to meals by swapping nut-containing items
  const getFilteredMeals = useCallback((mealsData) => {
    if (!activeFilters.includes('Nut-Free')) return mealsData
    const phaseLower = (currentPhase || 'luteal').toLowerCase()
    const subs = NUT_FREE_SUBSTITUTIONS[phaseLower]
    if (!subs) return mealsData

    const filtered = { ...mealsData }
    for (const [mealType, replacements] of Object.entries(subs)) {
      if (filtered[mealType]) {
        filtered[mealType] = replacements
      }
    }
    return filtered
  }, [activeFilters, currentPhase])

  const meals = getFilteredMeals(flareMode && phaseData.flareUp ? phaseData.flareUp : phaseData.meals)

  // Build a deduplicated shopping list from whatever meals are currently
  // displayed (respects flare mode + active filters, so the list always
  // matches what's on screen).
  const shoppingList = useMemo(() => {
    const seen = new Map() // lowercase name -> display name
    for (const mealData of Object.values(meals)) {
      const items = Array.isArray(mealData) ? mealData : [mealData]
      for (const item of items) {
        for (const ingredient of item.ingredients || []) {
          const key = ingredient.trim().toLowerCase()
          if (!seen.has(key)) seen.set(key, ingredient.trim())
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b))
  }, [meals])

  const handleGenerateShoppingList = useCallback(() => {
    setCheckedItems({})
    setCopied(false)
    setShowShoppingList(true)
  }, [])

  const toggleChecked = useCallback((item) => {
    setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }))
  }, [])

  const handleCopyList = useCallback(async () => {
    const text = shoppingList.map(item => `- ${item}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Clipboard write failed:', e)
    }
  }, [shoppingList])

  if (!isPremium) {
    return (
      <div className="card text-center py-8">
        <div className="text-5xl mb-3">⭐</div>
        <h3 className="font-semibold text-gray-700 mb-2">Premium Feature</h3>
        <p className="text-sm text-gray-500">Upgrade to Premium for personalized phase-specific meal plans.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* Phase Context Bar */}
      <div className={`${phaseStyle.bg} -mx-6 -mt-6 px-6 py-3 mb-4 border-b ${phaseStyle.border}`}>
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-xs font-semibold ${phaseStyle.text}`}>{phaseStyle.label} Phase</span>
            <p className="text-sm text-gray-600 mt-0.5">{phaseData.focus}</p>
          </div>
          <span className="bg-white/80 text-xs font-medium px-2 py-1 rounded-full text-endo-purple">⭐ Premium</span>
        </div>
      </div>

      {/* Dietary Filters */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {DIETARY_FILTERS.map(filter => (
          <button
            key={filter}
            onClick={() => toggleFilter(filter)}
            className={`text-xs px-3 py-1.5 rounded-full transition-all ${
              activeFilters.includes(filter)
                ? 'bg-endo-purple text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Flare-Up Mode Toggle */}
      <div className="flex items-center justify-between mb-4 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <div>
            <p className="text-sm font-medium text-amber-800">Flare-Up Mode</p>
            <p className="text-xs text-amber-600">Ultra-gentle, easy-to-digest options</p>
          </div>
        </div>
        <button
          onClick={() => setFlareMode(prev => !prev)}
          className={`relative w-12 h-6 rounded-full transition-colors ${flareMode ? 'bg-amber-500' : 'bg-gray-300'}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${flareMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Meal Cards */}
      <div className="space-y-3">
        {Object.entries(meals).map(([mealType, mealData]) => {
          if (mealType === 'flareUp') return null
          const isExpanded = expandedMeal === mealType
          const items = Array.isArray(mealData) ? mealData : [mealData]
          
          return (
            <div key={mealType} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedMeal(isExpanded ? null : mealType)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {mealType === 'breakfast' ? '🌅' : mealType === 'lunch' ? '☀️' : mealType === 'dinner' ? '🌙' : '🍪'}
                  </span>
                  <span className="font-medium text-sm text-gray-800 capitalize">{mealType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{items.length} item{items.length > 1 ? 's' : ''}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {isExpanded && (
                <div className="px-4 pb-3 space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.why}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Shopping List Generator */}
      <button
        onClick={handleGenerateShoppingList}
        className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-endo-purple/10 to-endo-pink/10 text-endo-purple font-medium text-sm hover:from-endo-purple/20 hover:to-endo-pink/20 transition-colors border border-endo-purple/20"
      >
        🛒 Generate Shopping List
      </button>

      {showShoppingList && (
        <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-800">Shopping List</p>
              <p className="text-[10px] text-gray-500">{shoppingList.length} item{shoppingList.length !== 1 ? 's' : ''} for today's {phaseStyle.label.toLowerCase()} meals</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyList}
                className="text-xs font-medium text-endo-purple px-2.5 py-1.5 rounded-lg hover:bg-endo-purple/10 transition-colors"
              >
                {copied ? '✅ Copied' : '📋 Copy'}
              </button>
              <button
                onClick={() => setShowShoppingList(false)}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
              >
                Close
              </button>
            </div>
          </div>
          <div className="px-4 py-3 space-y-1.5 max-h-64 overflow-y-auto">
            {shoppingList.map(item => (
              <label key={item} className="flex items-center gap-2.5 py-1 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!checkedItems[item]}
                  onChange={() => toggleChecked(item)}
                  className="w-4 h-4 rounded border-gray-300 text-endo-purple focus:ring-endo-purple"
                />
                <span className={`text-sm ${checkedItems[item] ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

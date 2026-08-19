/**
 * PremiumMealPlans
 *
 * Phase-specific full recipe library with dietary filters and Flare-Up Mode.
 * Content lives in src/data/premium-recipes.js — each recipe has an image slot,
 * full ingredient list with amounts, and step-by-step instructions.
 * Features: Phase context bar, dietary filters, flare-up toggle, expandable
 * full-recipe cards, shopping list generator.
 */

import { useState, useCallback, useMemo } from 'react'
import { PHASE_STYLES } from '../utils/mockData'
import RECIPES from '../data/premium-recipes'
import ImageWithFallback from './ImageWithFallback'

const DIETARY_FILTERS = ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Nut-Free']

const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snack', 'flareUp']
const MEAL_TYPE_ICON = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍪', flareUp: '🔥' }
const MEAL_TYPE_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks', flareUp: 'Flare-Up Friendly' }

export default function PremiumMealPlans({ currentPhase, isPremium = true }) {
  const [flareMode, setFlareMode] = useState(false)
  const [activeFilters, setActiveFilters] = useState([])
  const [expandedRecipe, setExpandedRecipe] = useState(null)
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [checkedItems, setCheckedItems] = useState({})
  const [copied, setCopied] = useState(false)

  // RECIPES is only keyed by the 4 real menstrual phases. For users with
  // no cycle to key off (acyclic, or a hormone-therapy pattern that isn't
  // an ovarian phase), show the full combined library under a neutral
  // label rather than falsely claiming a "Luteal" (or any other) phase.
  const hasRealPhase = ['menstrual', 'follicular', 'ovulatory', 'luteal'].includes(currentPhase)
  const phase = hasRealPhase ? currentPhase : 'luteal'
  const phaseStyle = hasRealPhase ? (PHASE_STYLES[phase] || PHASE_STYLES.luteal) : PHASE_STYLES.off
  const allRecipes = hasRealPhase
    ? (RECIPES[phase] || RECIPES.luteal)
    : Object.values(RECIPES).flat()
  const phaseLabel = hasRealPhase ? `${phaseStyle.label} Phase` : 'All Recipes'

  const toggleFilter = useCallback((filter) => {
    setActiveFilters(prev => prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter])
  }, [])

  // Apply dietary + flare-mode filters
  const visibleRecipes = useMemo(() => {
    let list = allRecipes

    if (flareMode) {
      const flareFriendly = list.filter(r => r.mealType === 'flareUp' || r.tags?.includes('flare-friendly') || r.tags?.includes('easy-to-digest'))
      list = flareFriendly.length > 0 ? flareFriendly : list.filter(r => r.mealType !== 'flareUp')
    } else {
      list = list.filter(r => r.mealType !== 'flareUp')
    }

    if (activeFilters.length > 0) {
      list = list.filter(r => activeFilters.every(f => r.tags?.includes(f)))
    }

    return list
  }, [allRecipes, flareMode, activeFilters])

  const groupedRecipes = useMemo(() => {
    const groups = {}
    for (const recipe of visibleRecipes) {
      const key = recipe.mealType || 'snack'
      if (!groups[key]) groups[key] = []
      groups[key].push(recipe)
    }
    return groups
  }, [visibleRecipes])

  // Deduplicated shopping list built from whatever recipes are currently visible
  const shoppingList = useMemo(() => {
    const seen = new Map() // lowercase item -> "amount item" display string
    for (const recipe of visibleRecipes) {
      for (const ing of recipe.ingredients || []) {
        const key = ing.item.trim().toLowerCase()
        if (!seen.has(key)) seen.set(key, `${ing.amount ? ing.amount + ' ' : ''}${ing.item}`)
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b))
  }, [visibleRecipes])

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
        <p className="text-sm text-gray-500">Upgrade to Premium for the full phase-specific recipe library.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* Phase Context Bar */}
      <div className={`${phaseStyle.bg} -mx-6 -mt-6 px-6 py-3 mb-4 border-b ${phaseStyle.border}`}>
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-xs font-semibold ${phaseStyle.text}`}>{phaseLabel}</span>
            <p className="text-sm text-gray-600 mt-0.5">{allRecipes.length} full recipes{hasRealPhase ? ' for this phase' : ''}</p>
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
            <p className="text-xs text-amber-600">Ultra-gentle, easy-to-digest recipes</p>
          </div>
        </div>
        <button
          onClick={() => setFlareMode(prev => !prev)}
          className={`relative w-12 h-6 rounded-full transition-colors ${flareMode ? 'bg-amber-500' : 'bg-gray-300'}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${flareMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Recipe Groups */}
      <div className="space-y-5">
        {MEAL_TYPE_ORDER.filter(type => groupedRecipes[type]?.length).map(mealType => (
          <div key={mealType}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{MEAL_TYPE_ICON[mealType]}</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{MEAL_TYPE_LABEL[mealType]}</span>
            </div>
            <div className="space-y-3">
              {groupedRecipes[mealType].map(recipe => {
                const isExpanded = expandedRecipe === recipe.id
                return (
                  <div key={recipe.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedRecipe(isExpanded ? null : recipe.id)}
                      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <ImageWithFallback
                        src={recipe.image}
                        alt={recipe.title}
                        icon={MEAL_TYPE_ICON[recipe.mealType] || '🌿'}
                        className="w-14 h-14 rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{recipe.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{recipe.prepTime} prep · {recipe.servings} serving{recipe.servings > 1 ? 's' : ''}</p>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                        <ImageWithFallback
                          src={recipe.image}
                          alt={recipe.title}
                          icon={MEAL_TYPE_ICON[recipe.mealType] || '🌿'}
                          className="w-full h-40 rounded-lg"
                        />

                        <div className="flex flex-wrap gap-1.5">
                          {recipe.tags?.map(tag => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{tag}</span>
                          ))}
                        </div>

                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>⏱️ Prep {recipe.prepTime}</span>
                          <span>🔥 Cook {recipe.cookTime}</span>
                          <span>🍽️ Serves {recipe.servings}</span>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Why it helps</p>
                          <p className="text-xs text-gray-500 leading-relaxed">{recipe.whyItHelps}</p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1.5">Ingredients</p>
                          <ul className="space-y-1">
                            {recipe.ingredients?.map((ing, idx) => (
                              <li key={idx} className="text-xs text-gray-600 flex justify-between gap-2">
                                <span>{ing.item}</span>
                                <span className="text-gray-400 whitespace-nowrap">{ing.amount}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1.5">Steps</p>
                          <ol className="space-y-1.5">
                            {recipe.steps?.map((step, idx) => (
                              <li key={idx} className="text-xs text-gray-600 leading-relaxed flex gap-2">
                                <span className="font-semibold text-endo-purple flex-shrink-0">{idx + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {recipe.nutritionNotes && (
                          <p className="text-[11px] text-gray-400 italic leading-relaxed">{recipe.nutritionNotes}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {visibleRecipes.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No recipes match the current filters.</p>
        )}
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
              <p className="text-[10px] text-gray-500">{shoppingList.length} item{shoppingList.length !== 1 ? 's' : ''} for the {hasRealPhase ? phaseStyle.label.toLowerCase() + ' ' : ''}recipes shown</p>
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

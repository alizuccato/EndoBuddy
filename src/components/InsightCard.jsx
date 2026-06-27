/**
 * InsightCard
 * 
 * Displays AI-generated observations and suggestions.
 * Types: pattern_alert, comparison, flare_warning, wellness_prompt
 * Each card has an icon, title, description, and optional action button.
 * 
 * Reference: insights-ui-design.md Section 3
 */

const SEVERITY_STYLES = {
  info: {
    border: 'border-blue-100',
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    button: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  positive: {
    border: 'border-green-100',
    bg: 'bg-green-50',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    button: 'bg-green-500 hover:bg-green-600 text-white',
  },
  warning: {
    border: 'border-amber-100',
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    button: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
}

export default function InsightCard({ insight, onAction, className = '' }) {
  const styles = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info
  const confidencePercent = Math.round((insight.confidence || 0) * 100)

  return (
    <div className={`card border-l-4 ${styles.border} ${className}`}>
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center text-lg ${styles.iconColor}`}>
          {insight.icon || '✨'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-sm text-gray-900 leading-tight">
                {insight.title}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                AI Insight · {confidencePercent}% confidence
              </p>
            </div>
            {/* AI sparkle badge */}
            <span className="flex-shrink-0 bg-gradient-to-br from-endo-purple/10 to-endo-pink/10 text-endo-purple text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              ✦ AI
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            {insight.description}
          </p>

          {/* AI Transparency Disclaimer */}
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] text-gray-400 cursor-help" title="This insight is an AI-detected correlational pattern, not a medical diagnosis. Always consult your healthcare provider.">
              ⓘ AI-detected pattern (correlational)
            </span>
          </div>

          {/* Action Button */}
          {insight.actionLabel && (
            <button
              onClick={() => onAction?.(insight)}
              className={`mt-3 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${styles.button}`}
            >
              {insight.actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * InsightCardList - Renders a list of InsightCards
 */
export function InsightCardList({ insights, onAction, maxCards = 3, className = '' }) {
  const displayInsights = insights?.slice(0, maxCards) || []
  
  if (displayInsights.length === 0) {
    return (
      <div className="card text-center py-8">
        <div className="text-4xl mb-3">🔮</div>
        <h4 className="font-semibold text-gray-700 mb-1">No insights yet</h4>
        <p className="text-sm text-gray-500">
          Start logging symptoms and AI patterns will appear here
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">✨ AI Insights</h3>
        {insights?.length > maxCards && (
          <button className="text-xs text-endo-purple font-medium hover:underline">
            See all ({insights.length})
          </button>
        )}
      </div>
      {displayInsights.map((insight) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          onAction={onAction}
        />
      ))}
    </div>
  )
}
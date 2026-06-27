/**
 * ConfirmationStep
 * 
 * Final step shown after a successful daily log.
 * Displays a summary of what was logged and offers actions.
 */

export default function ConfirmationStep({ logData, onStartNew, onGoHome }) {
  const { painLevel, symptoms, flowLevel, notes } = logData || {}
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  return (
    <div className="space-y-6 text-center">
      {/* Success animation placeholder */}
      <div className="text-6xl mb-2">🌸</div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Logged! Take it easy today.
        </h2>
        <p className="text-gray-500 text-sm">
          {today}
        </p>
      </div>

      {/* Summary Card */}
      <div className="card max-w-sm mx-auto text-left space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm border-b border-gray-100 pb-2">
          Today's Summary
        </h3>
        
        {painLevel && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Pain Level</span>
            <span className={`font-bold text-lg ${
              painLevel >= 7 ? 'text-red-500' :
              painLevel >= 4 ? 'text-orange-500' :
              'text-green-500'
            }`}>
              {painLevel}/10
            </span>
          </div>
        )}

        {symptoms && symptoms.length > 0 && (
          <div>
            <span className="text-sm text-gray-600 block mb-1.5">Symptoms</span>
            <div className="flex flex-wrap gap-1.5">
              {symptoms.map((s) => (
                <span key={s.id} className="symptom-badge bg-endo-purple/10 text-endo-purple text-xs">
                  {s.icon} {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {flowLevel && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Flow</span>
            <span className="font-medium text-sm text-endo-pink capitalize">{flowLevel}</span>
          </div>
        )}

        {notes && (
          <div>
            <span className="text-sm text-gray-600 block mb-1">Notes</span>
            <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-2 italic">
              "{notes.length > 100 ? notes.substring(0, 100) + '...' : notes}"
            </p>
          </div>
        )}
      </div>

      {/* Empathetic message for high pain */}
      {painLevel >= 7 && (
        <div className="bg-red-50 rounded-xl p-4 max-w-sm mx-auto">
          <p className="text-sm text-red-700">
            💜 Rest is healthcare. You've done enough by logging today.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={onGoHome}
          className="px-6 py-2.5 text-sm text-gray-600 hover:text-gray-800 font-medium"
        >
          Back to Home
        </button>
        <button
          onClick={onStartNew}
          className="btn-primary text-sm px-6 py-2.5"
        >
          Log Another Day
        </button>
      </div>
    </div>
  )
}
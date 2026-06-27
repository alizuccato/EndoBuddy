/**
 * NotesStep
 * 
 * Step 5 of the logging flow: Notes & Finish.
 * Voice-to-text friendly with a large "Tap to Speak" button.
 * Large "Done" button to complete the log.
 */

import { useState, useCallback } from 'react'

export default function NotesStep({ onSelect, notes, onComplete, symptoms }) {
  const [isListening, setIsListening] = useState(false)
  const [localNotes, setLocalNotes] = useState(notes || '')
  const [showSymptomsReview, setShowSymptomsReview] = useState(true)

  const handleNotesChange = useCallback((e) => {
    setLocalNotes(e.target.value)
    onSelect('notes', e.target.value)
  }, [onSelect])

  const handleVoiceToggle = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser. You can type your notes instead.')
      return
    }
    
    setIsListening(true)
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      const updatedNotes = localNotes ? `${localNotes}\n${transcript}` : transcript
      setLocalNotes(updatedNotes)
      onSelect('notes', updatedNotes)
      setIsListening(false)
    }
    
    recognition.onerror = () => {
      setIsListening(false)
    }
    
    recognition.onend = () => {
      setIsListening(false)
    }
    
    recognition.start()
  }, [localNotes, onSelect])

  return (
    <div className="space-y-6">
      {/* Question */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Anything else to add?
        </h2>
        <p className="text-gray-500 text-sm">
          Optional notes about your day — or just tap done to finish
        </p>
      </div>

      {/* Review selected symptoms */}
      {showSymptomsReview && symptoms.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Logging today:</h3>
            <button 
              onClick={() => setShowSymptomsReview(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Hide
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {symptoms.map((s) => (
              <span key={s.id} className="symptom-badge bg-endo-purple/10 text-endo-purple text-xs">
                {s.icon} {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes Input */}
      <div className="max-w-lg mx-auto space-y-3">
        <textarea
          value={localNotes}
          onChange={handleNotesChange}
          placeholder="How are you feeling? Any triggers or relief methods?"
          rows={4}
          className="input-field resize-none text-sm"
          aria-label="Add notes about your day"
        />

        {/* Voice Input Button */}
        <button
          onClick={handleVoiceToggle}
          disabled={isListening}
          className={`
            w-full flex items-center justify-center gap-3
            py-4 rounded-xl text-base font-medium
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-endo-purple focus:ring-offset-2
            ${isListening
              ? 'bg-red-50 text-red-600 animate-pulse border-2 border-red-300'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200 hover:border-endo-purple/30'
            }
          `}
        >
          <span className="text-2xl">
            {isListening ? '🎤' : '🎙️'}
          </span>
          <span>
            {isListening ? 'Listening... Tap to stop' : 'Tap to Speak'}
          </span>
        </button>

        {isListening && (
          <p className="text-xs text-center text-gray-500">
            Speak clearly — your words will be added to the notes
          </p>
        )}
      </div>

      {/* Complete Button */}
      <div className="text-center pt-4">
        <button
          onClick={onComplete}
          className="bg-endo-teal hover:bg-teal-600 text-white font-bold text-lg px-12 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
        >
          ✅ Done
        </button>
        <p className="text-xs text-gray-400 mt-3">
          {localNotes ? 'Notes saved with your log' : 'Log will be saved without notes'}
        </p>
      </div>
    </div>
  )
}
/**
 * EmpathyMessage
 * 
 * Displays context-aware validation and supportive messages 
 * based on the user's reported pain/symptom levels.
 * Uses patient-first language from the endo-language guide.
 */

const MESSAGES = {
  // High pain (7-10)
  severe: [
    "That sounds incredibly difficult. I hear you. You're not alone in this — let's just log it and you can rest.",
    "That's really tough. Take a breath. You've gotten through this before.",
    "Your pain is real, and it matters. Let's capture this data for your care team.",
  ],
  // Medium pain (4-6)
  moderate: [
    "That's a rough day. Thank you for taking the time to log it — this data really matters for your health journey.",
    "That sounds really tough. Let's log it so we can spot patterns.",
    "Hang in there. Every log brings you closer to understanding your body better.",
  ],
  // Low pain (1-3)
  mild: [
    "Glad today is more manageable. Celebrate the good days — they're part of the picture too.",
    "A better day — that's worth noting. Balance is part of the journey.",
    "Good days matter too. Thanks for logging.",
  ],
  // Generic supportive
  general: [
    "Take it easy today. Your body is doing a lot.",
    "You're doing great by tracking this. Knowledge is power.",
    "Every log is a step toward better understanding your health.",
  ],
  // First-time welcome
  welcome: [
    "Welcome. Whatever you're feeling today — pain, frustration, hope, or all of the above — this is a safe space to track it all.",
  ],
  // Flare-up pattern detected (multiple consecutive high logs)
  flareUp: [
    "I notice you've had several tough days in a row. That pattern is important — consider sharing this with your care team.",
  ],
}

// Pick a random message from the array
function pickMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)]
}

export default function EmpathyMessage({ 
  painLevel, 
  isFirstLog = false, 
  isFlareUp = false,
  className = '' 
}) {
  let message = ''
  
  if (isFirstLog) {
    message = pickMessage(MESSAGES.welcome)
  } else if (isFlareUp) {
    message = pickMessage(MESSAGES.flareUp)
  } else if (painLevel >= 7) {
    message = pickMessage(MESSAGES.severe)
  } else if (painLevel >= 4) {
    message = pickMessage(MESSAGES.moderate)
  } else if (painLevel >= 1) {
    message = pickMessage(MESSAGES.mild)
  } else {
    message = pickMessage(MESSAGES.general)
  }

  return (
    <div className={`bg-endo-lavender/10 rounded-2xl p-4 border border-endo-lavender/20 ${className}`}>
      <p className="text-gray-700 text-sm leading-relaxed italic">
        <span className="text-endo-purple not-italic font-medium">💬 </span>
        {message}
      </p>
    </div>
  )
}
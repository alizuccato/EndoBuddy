import { useState, useCallback, useEffect } from 'react'
import LoggingFlow from './components/LoggingFlow'
import EmpathyMessage from './components/EmpathyMessage'
import InsightsDashboard from './components/InsightsDashboard'
import OnboardingFlow from './components/OnboardingFlow'
import DoctorReport from './components/DoctorReport'
import ComfortMode from './components/ComfortMode'
import PremiumMealPlans from './components/PremiumMealPlans'
import PremiumDeepReport from './components/PremiumDeepReport'
import PremiumVisualizations from './components/PremiumVisualizations'
import SurgicalPlanningSummary from './components/SurgicalPlanningSummary'
import TreatmentResponseDashboard from './components/TreatmentResponseDashboard'
import FeedbackPrompt from './components/FeedbackPrompt'
import PhaseAwareHome from './components/PhaseAwareHome'
import ClinicPortal from './components/ClinicPortal'
import PremiumUpgradeFlow from './components/PremiumUpgradeFlow'
import { mockCycleData, mockInsights } from './utils/mockData'
import { getUserId, getUser, getLogs, saveDailyLog, completeOnboarding } from './services/dbService'

function App() {
  const [currentView, setCurrentView] = useState('home')
  const [showLoggingFlow, setShowLoggingFlow] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [comfortModeActive, setComfortModeActive] = useState(false)
  const [showComfortPrompt, setShowComfortPrompt] = useState(false)
  const [showPremiumUpgrade, setShowPremiumUpgrade] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [recentLogs, setRecentLogs] = useState([])
  const [todayLogged, setTodayLogged] = useState(false)
  const [userId, setUserId] = useState(null)

  // On mount, check if user exists in DB
  useEffect(() => {
    async function checkUser() {
      const existingUserId = getUserId()
      const user = await getUser(existingUserId)
      if (user && user.onboarding_complete) {
        setUserId(user.id)
        setShowOnboarding(false)
        // Load recent logs
        try {
          const logs = await getLogs(user.id)
          if (logs && logs.length > 0) {
            const today = new Date().toISOString().split('T')[0]
            const formatted = logs.map(l => ({
              id: l.id,
              date: l.log_date,
              painLevel: l.pain_level,
              cycleDay: l.cycle_day,
              cyclePhase: l.cycle_phase,
              flowLevel: l.flow_level,
              symptoms: [],
            }))
            setRecentLogs(formatted)
            setTodayLogged(logs.some(l => l.log_date === today && l.pain_level != null))
          }
        } catch (e) {
          console.log('Could not load logs:', e)
        }
      }
      setOnboardingChecked(true)
    }
    checkUser()
  }, [])

  const handleOpenLogging = useCallback(() => {
    setShowLoggingFlow(true)
  }, [])

  const handleCloseLogging = useCallback(() => {
    setShowLoggingFlow(false)
  }, [])

  const handleLogComplete = useCallback(async (logData) => {
    const today = new Date().toISOString().split('T')[0]
    const entry = { ...logData, date: today, id: Date.now() }
    
    // Save to DB
    try {
      await saveDailyLog({ ...logData, userId })
    } catch (e) {
      console.error('Failed to save log to DB:', e)
    }
    
    setRecentLogs(prev => [entry, ...prev.slice(0, 6)])
    setTodayLogged(true)
    
    // Auto-prompt Comfort Mode for high pain logs (7+)
    if (logData.painLevel >= 7) {
      setShowComfortPrompt(true)
    }
  }, [userId])

  const handleOnboardingComplete = useCallback(async (data) => {
    try {
      const user = await completeOnboarding(data)
      setUserId(user.id)
    } catch (e) {
      console.error('Failed to save onboarding:', e)
      // Fall back to local ID
      setUserId(getUserId())
    }
    setShowOnboarding(false)
  }, [])

  const handleOnboardingSkip = useCallback(() => {
    setShowOnboarding(false)
  }, [])

  const handleComfortToggle = useCallback(() => {
    setComfortModeActive(prev => !prev)
    setShowComfortPrompt(false)
  }, [])

  const handleStartUpgrade = useCallback(() => {
    setShowPremiumUpgrade(true)
  }, [])

  const handleUpgradeComplete = useCallback(() => {
    setIsPremium(true)
    setShowPremiumUpgrade(false)
  }, [])

  const handleCloseUpgrade = useCallback(() => {
    setShowPremiumUpgrade(false)
  }, [])

  // Wait for onboarding check before rendering
  if (!onboardingChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🌸</div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Show onboarding if user hasn't completed it
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />
  }

  return (
    <ComfortMode isActive={comfortModeActive} onToggle={handleComfortToggle}>
      <div className="min-h-screen flex flex-col">
        <header className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="buddy">🌸</span>
              <h1 className="text-xl font-bold text-endo-purple">
                Endo<span className="text-endo-pink">Buddy</span>
              </h1>
            </div>
            <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
              <button 
                onClick={() => { setCurrentView('home'); setShowLoggingFlow(false) }} 
                className={`hover:text-endo-pink transition-colors ${currentView === 'home' && !showLoggingFlow ? 'text-endo-pink font-semibold' : ''}`}
              >
                Home
              </button>
              <button 
                onClick={() => { setCurrentView('log'); setShowLoggingFlow(true) }} 
                className={`hover:text-endo-pink transition-colors ${showLoggingFlow ? 'text-endo-pink font-semibold' : ''}`}
              >
                Log
              </button>
              <button 
                onClick={() => { setCurrentView('insights'); setShowLoggingFlow(false) }} 
                className={`hover:text-endo-pink transition-colors ${currentView === 'insights' ? 'text-endo-pink font-semibold' : ''}`}
              >
                Insights
              </button>
              <button
                            onClick={() => { setCurrentView('reports'); setShowLoggingFlow(false) }}
                            className={`hover:text-endo-pink transition-colors ${currentView === 'reports' ? 'text-endo-pink font-semibold' : ''}`}
                          >
                            Reports
                          </button>
                          <button
                                        onClick={() => { setCurrentView('premium'); setShowLoggingFlow(false) }}
                                        className={`hover:text-endo-pink transition-colors flex items-center gap-1 ${currentView === 'premium' ? 'text-endo-pink font-semibold' : ''}`}
                                      >
                                        <span className="text-xs">⭐</span> Premium
                                      </button>
                                      <button
                                        onClick={() => { setCurrentView('clinic'); setShowLoggingFlow(false) }}
                                        className={`hover:text-endo-pink transition-colors ${currentView === 'clinic' ? 'text-endo-pink font-semibold' : ''}`}
                                      >
                                        🏥 Clinic
                                      </button>
            </nav>
          </div>
        </header>

        {showComfortPrompt && !comfortModeActive && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧘</span>
                <p className="text-sm text-amber-800 font-medium">
                  Comfort Mode is available — softer visuals & flare-up relief tools
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowComfortPrompt(false)}
                  className="text-xs text-amber-600 px-3 py-1.5 rounded-full hover:bg-amber-100"
                >
                  Not now
                </button>
                <button
                  onClick={handleComfortToggle}
                  className="text-xs font-medium bg-amber-600 text-white px-4 py-1.5 rounded-full hover:bg-amber-700"
                >
                  Turn on
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 animate-fadeIn">
          {showLoggingFlow ? (
            <LoggingFlow
              onComplete={handleLogComplete}
              onClose={handleCloseLogging}
            />
          ) : currentView === 'home' ? (
                    <PhaseAwareHome onStartLogging={handleOpenLogging} todayLogged={todayLogged} recentLogs={recentLogs} cycleData={mockCycleData} isPremium={isPremium} onUpgrade={handleStartUpgrade} />
                  ) : currentView === 'insights' ? (
            <InsightsDashboard cycleData={mockCycleData} insights={mockInsights} />
          ) : currentView === 'reports' ? (
            <ReportsView recentLogs={recentLogs} />
          ) : currentView === 'premium' ? (
            <PremiumView isPremium={isPremium} onUpgrade={handleStartUpgrade} />
          ) : currentView === 'clinic' ? (
            <ClinicPortal />
          ) : (
            <div className="max-w-lg mx-auto px-6 py-12 text-center">
              <p className="text-gray-500">Select "Log" to start tracking</p>
              <button onClick={handleOpenLogging} className="btn-primary mt-4">
                Start Logging
              </button>
            </div>
          )}
        </main>

        {!showLoggingFlow && currentView === 'home' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 md:static md:border-t-0">
            <div className="max-w-4xl mx-auto">
              <button
                onClick={handleOpenLogging}
                className="w-full btn-primary text-lg py-4 shadow-lg flex items-center justify-center gap-2"
              >
                <span className="text-xl">+</span>
                Log Symptoms
              </button>
            </div>
          </div>
        )}

        {!showLoggingFlow && (
          <footer className="bg-gray-50 border-t border-gray-100 px-6 py-4 text-center text-sm text-gray-400 hidden md:block">
            EndoBuddy &mdash; Empowering your cycle journey with data
          </footer>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      {!showLoggingFlow && !showPremiumUpgrade && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex md:hidden z-40 safe-area-bottom shadow-lg">
          {[
            { id: 'home', label: 'Home', icon: '🌸' },
            { id: 'log', label: 'Log', icon: '➕' },
            { id: 'insights', label: 'Insights', icon: '📊' },
            { id: 'reports', label: 'Reports', icon: '📋' },
            { id: 'premium', label: 'Premium', icon: '⭐' },
          ].map(item => (
            <button key={item.id} onClick={() => { setCurrentView(item.id); setShowLoggingFlow(item.id === 'log') }}
              className={`flex-1 flex flex-col items-center py-2 text-[10px] transition-colors ${
                currentView === item.id ? 'text-endo-purple' : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-current={currentView === item.id ? 'page' : undefined}
            >
              <span className="text-lg mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Premium Upgrade Overlay */}
      {showPremiumUpgrade && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseUpgrade} />
          <div className="relative z-10">
            <PremiumUpgradeFlow onClose={handleCloseUpgrade} onUpgrade={handleUpgradeComplete} />
          </div>
        </div>
      )}
    </ComfortMode>
  )
}

function HomeView({ onStartLogging, todayLogged, recentLogs }) {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric' 
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24 md:pb-8">
      <div className="mb-6">
        <p className="text-sm text-gray-500">{today}</p>
        <h2 className="text-2xl font-bold text-gray-900 mt-1">
          {todayLogged ? "You've logged today ✅" : "Good morning! How are you feeling?"}
        </h2>
      </div>

      {todayLogged ? (
        <div className="card bg-gradient-to-br from-endo-lavender/5 to-endo-purple/5 border-endo-lavender/20 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🌸</span>
            <div>
              <p className="text-sm text-gray-700">
                Today's log saved. You can always add more details.
              </p>
              <button onClick={onStartLogging} className="text-sm text-endo-purple font-medium mt-1 hover:underline">
                Add more symptoms or notes →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card bg-gradient-to-br from-endo-purple/5 to-endo-pink/5 border-endo-purple/10 mb-6">
          <EmpathyMessage isFirstLog={recentLogs.length === 0} painLevel={0} />
          <button
            onClick={onStartLogging}
            className="mt-4 w-full btn-primary text-lg py-4 flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span>
            Log Now
          </button>
        </div>
      )}

      {recentLogs.length > 0 && (
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Recent Logs</h3>
          <div className="space-y-2">
            {recentLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="card !p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    log.painLevel >= 7 ? 'bg-red-500' :
                    log.painLevel >= 4 ? 'bg-orange-400' :
                    'bg-green-400'
                  }`} />
                  <div>
                    <span className="text-sm text-gray-500">{log.date}</span>
                    <div className="flex gap-1 mt-0.5">
                      {log.symptoms?.slice(0, 3).map((s) => (
                        <span key={s.id} className="text-xs">{s.icon}</span>
                      ))}
                      {log.symptoms?.length > 3 && (
                        <span className="text-xs text-gray-400">+{log.symptoms.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`font-bold text-sm ${
                  log.painLevel >= 7 ? 'text-red-500' :
                  log.painLevel >= 4 ? 'text-orange-500' :
                  'text-green-500'
                }`}>
                  {log.painLevel}/10
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <FeatureCard icon="📝" title="Daily Symptom Log" description="Log pain, symptoms, food, and cycle data in seconds" />
        <FeatureCard icon="🔍" title="AI Pattern Analysis" description="Discover hidden correlations in your symptoms" />
        <FeatureCard icon="📋" title="Doctor Reports" description="Generate data-backed reports for appointments" />
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="card text-center hover:shadow-lg transition-shadow duration-200">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}

function ReportsView({ recentLogs }) {
  const hasData = recentLogs.length > 0
  const [showFeedback, setShowFeedback] = useState(true)

  if (!hasData) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 pb-24 md:pb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 Doctor Reports</h2>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No data yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Log symptoms for at least one cycle to generate a clinical report
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <DoctorReport 
        cycleData={mockCycleData} 
        insights={mockInsights}
        onBack={() => {}} 
      />
      <div className="max-w-4xl mx-auto px-6 pb-8">
        {showFeedback && (
          <FeedbackPrompt
            type="doctor_report"
            targetId="report-1"
            targetLabel="Clinical Doctor Report"
            onDismiss={() => setShowFeedback(false)}
          />
        )}
      </div>
    </>
  )
}

function LockedFeature({ onUpgrade }) {
  return (
    <div className="card text-center py-12">
      <div className="text-6xl mb-4">🔒</div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">Premium Feature</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
        Upgrade to unlock this advanced feature and get the full picture of your cycle health.
      </p>
      <button onClick={onUpgrade} className="btn-primary text-lg px-10 py-3 shadow-lg">
        ⭐ Unlock Premium
      </button>
    </div>
  )
}

function PremiumView({ isPremium, onUpgrade }) {
  const [premiumTab, setPremiumTab] = useState('meals')
  const phase = mockCycleData?.currentPhase || 'luteal'

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">⭐ Premium Features</h2>
          <p className="text-sm text-gray-500 mt-1">Advanced AI-driven analysis & personalized wellness</p>
        </div>
        {isPremium ? (
          <span className="bg-gradient-to-r from-endo-purple to-endo-pink text-white text-xs font-bold px-3 py-1.5 rounded-full">
            ACTIVE
          </span>
        ) : (
          <button onClick={onUpgrade} className="bg-gradient-to-r from-endo-purple to-endo-pink text-white text-xs font-bold px-4 py-2 rounded-full hover:opacity-90 shadow-md">
            Upgrade Now
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-100 pb-3 flex-wrap">
        {[
          { id: 'meals', label: 'Meal Plans', icon: '🍽️' },
          { id: 'deep', label: 'Deep Report', icon: '📊' },
          { id: 'surgical', label: 'Surgical Plan', icon: '🔬' },
          { id: 'treatment', label: 'Treatments', icon: '💊' },
          { id: 'viz', label: 'Visualizations', icon: '✨' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setPremiumTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl transition-all ${
              premiumTab === tab.id ? 'bg-endo-purple text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          ><span>{tab.icon}</span><span>{tab.label}</span></button>
        ))}
      </div>

      {premiumTab === 'meals' && (
        <PremiumMealPlans currentPhase={phase} isPremium={isPremium} />
      )}
      {premiumTab === 'deep' && (
        <div className="space-y-4">
          <PremiumDeepReport cycleData={mockCycleData} patterns={mockInsights} isPremium={isPremium} />
        </div>
      )}
      {premiumTab === 'surgical' && (
        isPremium ? <SurgicalPlanningSummary patterns={mockInsights} /> : <LockedFeature onUpgrade={onUpgrade} />
      )}
      {premiumTab === 'treatment' && (
        isPremium ? <TreatmentResponseDashboard /> : <LockedFeature onUpgrade={onUpgrade} />
      )}
      {premiumTab === 'viz' && (
        <PremiumVisualizations
          patterns={mockInsights}
          isPremium={isPremium}
          currentPhase={mockCycleData?.currentPhase}
          currentDayNum={mockCycleData?.currentDayNum}
          cycleLength={mockCycleData?.cycleLength}
        />
      )}
    </div>
  )
}

export default App
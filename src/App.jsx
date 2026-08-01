import { useState, useCallback, useEffect, useMemo } from 'react'
import LoggingFlow from './components/LoggingFlow'
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
import LoginFlow from './components/LoginFlow'
import ProfileTab from './components/ProfileTab'
import { getUserId, getUser, getLogs, saveDailyLog, completeOnboarding, getPatterns, logoutUser, deleteLog, updateLog } from './services/dbService'
import { getLocalDateString, getDayOfCycle } from './utils/dateHelpers'

function App() {
  const [currentView, setCurrentView] = useState('home')
  const [showLoggingFlow, setShowLoggingFlow] = useState(false)
  const [showLogin, setShowLogin] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [comfortModeActive, setComfortModeActive] = useState(false)
  const [showComfortPrompt, setShowComfortPrompt] = useState(false)
  const [showPremiumUpgrade, setShowPremiumUpgrade] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [recentLogs, setRecentLogs] = useState([])
  const [todayLogged, setTodayLogged] = useState(false)
  const [userId, setUserId] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [patterns, setPatterns] = useState([])

  const refreshPatterns = useCallback(async (idToUse) => {
    if (!idToUse) return
    try {
      const result = await getPatterns(idToUse)
      setPatterns(result?.patterns || [])
    } catch (e) {
      console.log('Could not load patterns:', e)
      setPatterns([])
    }
  }, [])

  const refreshLogs = useCallback(async (idToUse) => {
    if (!idToUse) return
    try {
      const logs = await getLogs(idToUse)
      const today = getLocalDateString()
      const formatted = (logs || []).map(l => ({
        id: l.id, date: l.log_date, painLevel: l.pain_level,
        cycleDay: l.cycle_day, cyclePhase: l.cycle_phase,
        flowLevel: l.flow_level, notes: l.notes,
        overallWellness: l.overall_wellness, isPeriodDay: !!l.is_period_day,
        symptoms: [],
      }))
      setRecentLogs(formatted)
      setTodayLogged(formatted.some(l => l.date === today && l.painLevel != null))
    } catch (e) {
      console.log('Could not load logs:', e)
    }
  }, [])

  // Stripe's Payment Link redirects the browser back here after a real
  // payment completes (once you set the Payment Link's "after payment"
  // redirect URL, in the Stripe Dashboard, to https://myendobuddy.com/?upgraded=1).
  // We flip isPremium on optimistically for instant feedback, then poll the
  // server briefly for the DB's real is_premium flag — which only the
  // Stripe webhook (verified by signature, not guessable by a visitor) is
  // allowed to set. The webhook is usually near-instant, but this covers
  // the small window where the redirect lands before Stripe's event does.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded') !== '1') return

    setIsPremium(true)
    params.delete('upgraded')
    const cleanUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '')
    window.history.replaceState({}, '', cleanUrl)

    const idToConfirm = getUserId()
    if (!idToConfirm) return
    let attempts = 0
    const poll = setInterval(async () => {
      attempts += 1
      try {
        const user = await getUser(idToConfirm)
        if (user && (user.is_premium === 1 || user.is_premium === true)) {
          setIsPremium(true)
          clearInterval(poll)
        }
      } catch (e) { /* keep retrying */ }
      if (attempts >= 6) clearInterval(poll) // ~9s of polling, then give up quietly
    }, 1500)
    return () => clearInterval(poll)
  }, [])

  useEffect(() => {
    async function checkUser() {
      const existingUserId = getUserId()
      const user = await getUser(existingUserId)
      const isReturningClinician = user && user.role === 'clinician'
      if (user && (user.onboarding_complete || isReturningClinician)) {
        setUserId(user.id)
        setUserProfile(user)
        setUserRole(user.role || 'patient')
        setIsPremium(prev => prev || user.is_premium === 1 || user.is_premium === true)
        setShowLogin(false)
        setShowOnboarding(false)
        if (isReturningClinician) setCurrentView('clinic')
        await refreshLogs(user.id)
        refreshPatterns(user.id)
      }
      setOnboardingChecked(true)
    }
    checkUser()
  }, [refreshPatterns, refreshLogs])

  const handleLoginComplete = useCallback(async (userData) => {
    setUserId(userData.id)
    setUserRole(userData.role || 'patient')
    setShowLogin(false)
    let onboardingDone = userData.onboardingComplete
    try {
      const fullUser = await getUser(userData.id)
      if (fullUser) {
        setUserProfile(fullUser)
        onboardingDone = fullUser.onboarding_complete === 1 || fullUser.onboarding_complete === true
      } else {
        setUserProfile(userData)
      }
    } catch {
      setUserProfile(userData)
    }
    if (userData.role === 'clinician') { setShowOnboarding(false); setCurrentView('clinic') }
    else { setShowOnboarding(!onboardingDone); setCurrentView('home') }
  }, [])

  const handleLoginSkip = useCallback(() => {
    setShowLogin(false); setUserRole('patient'); setShowOnboarding(true); setCurrentView('home')
  }, [])

  const handleOpenLogging = useCallback(() => setShowLoggingFlow(true), [])
  const handleCloseLogging = useCallback(() => setShowLoggingFlow(false), [])

  const handleLogComplete = useCallback(async (logData) => {
    try { await saveDailyLog({ ...logData, userId }) } catch (e) { console.error('Failed to save log:', e) }
    setTodayLogged(true)
    if (logData.painLevel >= 7) setShowComfortPrompt(true)
    refreshLogs(userId)
    refreshPatterns(userId)
  }, [userId, refreshPatterns, refreshLogs])

  const handleOnboardingComplete = useCallback(async (data) => {
    try { 
      const user = await completeOnboarding(data)
      setUserId(user.id)
      setUserProfile(user)
    }
    catch (e) { console.error('Failed to save onboarding:', e); setUserId(getUserId()) }
    setShowOnboarding(false)
  }, [])

  const handleOnboardingSkip = useCallback(() => setShowOnboarding(false), [])
  const handleLogout = useCallback(() => {
    logoutUser()
    setUserId(null)
    setUserRole(null)
    setUserProfile(null)
    setIsPremium(false)
    setRecentLogs([])
    setTodayLogged(false)
    setPatterns([])
    setCurrentView('home')
    setShowLogin(true)
  }, [])
  const handleDeleteLog = useCallback(async (logId) => {
    await deleteLog(logId)
    await refreshLogs(userId)
    refreshPatterns(userId)
  }, [userId, refreshLogs, refreshPatterns])

  const handleUpdateLog = useCallback(async (logId, changes) => {
    await updateLog(logId, changes)
    await refreshLogs(userId)
    refreshPatterns(userId)
  }, [userId, refreshLogs, refreshPatterns])

  const handleComfortToggle = useCallback(() => { setComfortModeActive(prev => !prev); setShowComfortPrompt(false) }, [])
  const handleStartUpgrade = useCallback(() => setShowPremiumUpgrade(true), [])
  const handleUpgradeComplete = useCallback(() => { setIsPremium(true); setShowPremiumUpgrade(false) }, [])
  const handleCloseUpgrade = useCallback(() => setShowPremiumUpgrade(false), [])

  const isPatient = userRole === 'patient'
  const isClinician = userRole === 'clinician'

  // Builds the cycle/calendar data the rest of the app renders. This is
  // ALWAYS derived from the user's real logs (recentLogs, from the DB) —
  // it never falls back to fabricated sample data. If the user has no
  // profile yet and/or hasn't logged anything, the arrays are simply
  // empty and downstream components render their real "no data yet"
  // empty states instead of a fake pre-filled calendar.
  const cycleData = useMemo(() => {
    const cycleLength = userProfile?.cycleLength || userProfile?.cycle_length_avg || 28
    const lastPeriodStart = userProfile?.lastPeriodStart || userProfile?.last_period_start || null
    const today = getLocalDateString()

    const days = recentLogs.map(log => ({
      date: log.date,
      dayNum: log.cycleDay ?? null,
      phase: log.cyclePhase || null,
      painLevel: log.painLevel ?? 0,
      symptoms: log.symptoms || [],
      flowLevel: log.flowLevel || null,
      isFuture: log.date > today,
      isToday: log.date === today,
    }))

    let currentPhase = null
    let currentDayNum = null
    if (lastPeriodStart) {
      try {
        currentDayNum = getDayOfCycle(lastPeriodStart, cycleLength)
        if (currentDayNum != null) {
          if (currentDayNum <= 5) currentPhase = 'menstrual'
          else if (currentDayNum <= 14) currentPhase = 'follicular'
          else if (currentDayNum === 15) currentPhase = 'ovulatory'
          else currentPhase = 'luteal'
        }
      } catch (e) {
        console.error('Error computing cycle day:', e)
      }
    }

    return {
      days,
      currentPhase,
      currentDayNum,
      cycleStartDate: lastPeriodStart,
      cycleLength,
      periodLength: 5,
      hasRealData: days.length > 0,
    }
  }, [userProfile, recentLogs])

  const patientNavItems = [
    { id: 'home', label: 'Home', icon: '\u{1F338}' },
    { id: 'log', label: 'Log', icon: '\u{2795}' },
    { id: 'insights', label: 'Insights', icon: '\u{1F4CA}' },
    { id: 'reports', label: 'Reports', icon: '\u{1F4CB}' },
    { id: 'premium', label: 'Premium', icon: '\u{2B50}' },
    { id: 'profile', label: 'Profile', icon: '\u{1F464}' },
  ]
  const clinicianNavItems = [
    { id: 'clinic', label: 'Clinic', icon: '\u{1F3E5}' },
    { id: 'reports', label: 'Reports', icon: '\u{1F4CB}' },
    { id: 'profile', label: 'Profile', icon: '\u{1F464}' },
  ]

  if (!onboardingChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src="/logo-icon.png" alt="EndoBuddy" className="w-20 h-20 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (showLogin) return <LoginFlow onComplete={handleLoginComplete} onSkip={handleLoginSkip} />
  if (showOnboarding && isPatient) return (
    <OnboardingFlow
      onComplete={handleOnboardingComplete}
      onSkip={handleOnboardingSkip}
      onStartLogging={handleOpenLogging}
      onGoToDashboard={() => setCurrentView('home')}
    />
  )

  return (
    <ComfortMode isActive={comfortModeActive} onToggle={handleComfortToggle}>
      <div className="min-h-screen flex flex-col">
        <header className="bg-white border-b border-gray-100 px-6 py-4 no-print">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo-icon.png" alt="" className="w-8 h-8" />
              <h1 className="text-xl font-bold text-endo-purple">Endo<span className="text-endo-pink">Buddy</span></h1>
              {isClinician && <span className="ml-2 text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full">Clinician</span>}
            </div>
            <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
              {isPatient && (
                <>
                  <NavBtn currentView={currentView} view="home" onClick={() => { setCurrentView('home'); setShowLoggingFlow(false) }} active={currentView==='home'&&!showLoggingFlow}>Home</NavBtn>
                  <NavBtn currentView={currentView} view="log" onClick={() => { setCurrentView('log'); setShowLoggingFlow(true) }} active={showLoggingFlow}>Log</NavBtn>
                  <NavBtn currentView={currentView} view="insights" onClick={() => { setCurrentView('insights'); setShowLoggingFlow(false) }}>Insights</NavBtn>
                  <NavBtn currentView={currentView} view="reports" onClick={() => { setCurrentView('reports'); setShowLoggingFlow(false) }}>Reports</NavBtn>
                  <NavBtn currentView={currentView} view="premium" onClick={() => { setCurrentView('premium'); setShowLoggingFlow(false) }}><span className="text-xs">{'\u{2B50}'}</span> Premium</NavBtn>
                  <NavBtn currentView={currentView} view="profile" onClick={() => { setCurrentView('profile'); setShowLoggingFlow(false) }}>{'\u{1F464}'} Profile</NavBtn>
                </>
              )}
              {isClinician && (
                <>
                  <NavBtn currentView={currentView} view="clinic" onClick={() => { setCurrentView('clinic'); setShowLoggingFlow(false) }}>{'\u{1F3E5}'} Clinic Portal</NavBtn>
                  <NavBtn currentView={currentView} view="reports" onClick={() => { setCurrentView('reports'); setShowLoggingFlow(false) }}>{'\u{1F4CB}'} Reports</NavBtn>
                  <NavBtn currentView={currentView} view="profile" onClick={() => { setCurrentView('profile'); setShowLoggingFlow(false) }}>{'\u{1F464}'} Profile</NavBtn>
                </>
              )}
            </nav>
          </div>
        </header>

        {showComfortPrompt && !comfortModeActive && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{'\u{1F9D8}'}</span>
                <p className="text-sm text-amber-800 font-medium">Comfort Mode is available {'\u2014'} softer visuals & flare-up relief tools</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowComfortPrompt(false)} className="text-xs text-amber-600 px-3 py-1.5 rounded-full hover:bg-amber-100">Not now</button>
                <button onClick={handleComfortToggle} className="text-xs font-medium bg-amber-600 text-white px-4 py-1.5 rounded-full hover:bg-amber-700">Turn on</button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 animate-fadeIn">
          {isPatient && showLoggingFlow && <LoggingFlow onComplete={handleLogComplete} onClose={handleCloseLogging} />}
          {isPatient && !showLoggingFlow && currentView==='home' && <PhaseAwareHome onStartLogging={handleOpenLogging} todayLogged={todayLogged} recentLogs={recentLogs} cycleData={cycleData} isPremium={isPremium} onUpgrade={handleStartUpgrade} />}
          {isPatient && !showLoggingFlow && currentView==='insights' && <InsightsDashboard cycleData={cycleData} insights={patterns} />}
          {isPatient && !showLoggingFlow && currentView==='premium' && <PremiumView isPremium={isPremium} onUpgrade={handleStartUpgrade} cycleData={cycleData} patterns={patterns} />}
          {currentView==='reports' && <ReportsView recentLogs={recentLogs} cycleData={cycleData} patterns={patterns} />}
          {currentView==='profile' && (
            <ProfileTab
              userId={userId}
              userProfile={userProfile}
              isPremium={isPremium}
              userRole={userRole}
              onUpgrade={handleStartUpgrade}
              onLogout={handleLogout}
              onProfileUpdate={setUserProfile}
              recentLogs={recentLogs}
              onDeleteLog={handleDeleteLog}
              onUpdateLog={handleUpdateLog}
            />
          )}
          {isClinician && currentView==='clinic' && <ClinicPortal clinician={userProfile} />}
          {!showLoggingFlow && currentView==='home' && isClinician && (
            <div className="max-w-lg mx-auto px-6 py-12 text-center">
              <p className="text-gray-500">Welcome to the Clinician Portal</p>
              <button onClick={() => setCurrentView('clinic')} className="btn-primary mt-4">Open Clinic Portal</button>
            </div>
          )}
        </main>

        {isPatient && !showLoggingFlow && currentView==='home' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 md:static md:border-t-0 no-print">
            <div className="max-w-4xl mx-auto">
              <button onClick={handleOpenLogging} className="w-full btn-primary text-lg py-4 shadow-lg flex items-center justify-center gap-2"><span className="text-xl">+</span> Log Symptoms</button>
            </div>
          </div>
        )}

        {!showLoggingFlow && (
          <footer className="bg-gray-50 border-t border-gray-100 px-6 py-4 text-center text-sm text-gray-400 hidden md:block no-print">
            EndoBuddy {'\u2014'} Empowering your cycle journey with data
          </footer>
        )}
      </div>

      {/* Mobile Bottom Navigation — Role-Aware */}
      {!showLoggingFlow && !showPremiumUpgrade && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex md:hidden z-40 safe-area-bottom shadow-lg">
          {(isPatient ? patientNavItems : clinicianNavItems).map(item => (
            <button key={item.id}
              onClick={() => { setCurrentView(item.id); setShowLoggingFlow(item.id==='log') }}
              className={`flex-1 flex flex-col items-center py-2 text-[10px] transition-colors ${currentView===item.id?'text-endo-purple':'text-gray-400 hover:text-gray-600'}`}
              aria-current={currentView===item.id?'page':undefined}>
              <span className="text-lg mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {showPremiumUpgrade && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseUpgrade} />
          <div className="relative z-10"><PremiumUpgradeFlow onClose={handleCloseUpgrade} onUpgrade={handleUpgradeComplete} userId={userId} cycleData={cycleData} /></div>
        </div>
      )}
    </ComfortMode>
  )
}

function NavBtn({ currentView, view, onClick, active, children }) {
  const isActive = active !== undefined ? active : currentView === view
  return (
    <button onClick={onClick}
      className={`hover:text-endo-pink transition-colors flex items-center gap-1 ${isActive?'text-endo-pink font-semibold':''}`}>
      {children}
    </button>
  )
}

function ReportsView({ recentLogs, cycleData, patterns }) {
  const [showFeedback, setShowFeedback] = useState(true)
  if (recentLogs.length === 0) return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24 md:pb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{'\u{1F4CB}'} Doctor Reports</h2>
      <div className="text-center py-12">
        <div className="text-6xl mb-4">{'\u{1F4C4}'}</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No data yet</h3>
        <p className="text-gray-500 text-sm mb-4">Log symptoms for at least one cycle to generate a clinical report</p>
      </div>
    </div>
  )
  return (
    <>
      <DoctorReport cycleData={cycleData} insights={patterns} onBack={()=>{}} />
      <div className="max-w-4xl mx-auto px-6 pb-8">
        {showFeedback && <FeedbackPrompt type="doctor_report" targetId="report-1" targetLabel="Clinical Doctor Report" onDismiss={()=>setShowFeedback(false)} />}
      </div>
    </>
  )
}

const LOCKED_FEATURE_COPY = {
  meals: { icon: '\u{1F37D}', description: 'Unlock personalized phase-based meal plans tailored to your symptoms and cravings.' },
  deep: { icon: '\u{1F4CA}', description: 'Unlock your AI-powered deep report, correlating pain, symptoms, and phase across your full history.' },
  surgical: { icon: '\u{1F52C}', description: 'Unlock a lesion-mapped surgical planning summary to bring straight to your specialist.' },
  treatment: { icon: '\u{1F48A}', description: 'Unlock your treatment response dashboard to see what\u2019s actually working over time.' },
  viz: { icon: '\u2728', description: 'Unlock advanced visualizations of your cycle, symptoms, and pain patterns.' },
}

function LockedFeature({ onUpgrade, feature = 'meals' }) {
  const copy = LOCKED_FEATURE_COPY[feature] || { icon: '\u{1F512}', description: 'Upgrade to unlock this advanced feature and get the full picture of your cycle health.' }
  return (
    <div className="card text-center py-12">
      <div className="text-6xl mb-4">{copy.icon}</div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">Premium Feature</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">{copy.description}</p>
      <button onClick={onUpgrade} className="btn-primary text-lg px-10 py-3 shadow-lg">{'\u{2B50}'} Unlock Premium</button>
    </div>
  )
}

function PremiumView({ isPremium, onUpgrade, cycleData, patterns }) {
  const [premiumTab, setPremiumTab] = useState('meals')
  const phase = cycleData?.currentPhase || 'luteal'
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold text-gray-900">{'\u{2B50}'} Premium Features</h2><p className="text-sm text-gray-500 mt-1">Advanced AI-driven analysis & personalized wellness</p></div>
        {isPremium?<span className="bg-gradient-to-r from-endo-purple to-endo-pink text-white text-xs font-bold px-3 py-1.5 rounded-full">ACTIVE</span>
        :<button onClick={onUpgrade} className="bg-gradient-to-r from-endo-purple to-endo-pink text-white text-xs font-bold px-4 py-2 rounded-full hover:opacity-90 shadow-md">Upgrade Now</button>}
      </div>
      <div className="flex gap-2 mb-6 border-b border-gray-100 pb-3 flex-wrap">
        {[{id:'meals',label:'Meal Plans',icon:'\u{1F37D}'},{id:'deep',label:'Deep Report',icon:'\u{1F4CA}'},{id:'surgical',label:'Surgical Plan',icon:'\u{1F52C}'},{id:'treatment',label:'Treatments',icon:'\u{1F48A}'},{id:'viz',label:'Visualizations',icon:'\u2728'}].map(tab=>(
          <button key={tab.id} onClick={()=>setPremiumTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl transition-all ${premiumTab===tab.id?'bg-endo-purple text-white shadow-md':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><span>{tab.icon}</span><span>{tab.label}</span></button>
        ))}
      </div>
      {premiumTab==='meals'&&(isPremium?<PremiumMealPlans currentPhase={phase}/>:<LockedFeature onUpgrade={onUpgrade} feature="meals"/>)}
      {premiumTab==='deep'&&(isPremium?<div className="space-y-4"><PremiumDeepReport cycleData={cycleData} patterns={patterns}/></div>:<LockedFeature onUpgrade={onUpgrade} feature="deep"/>)}
      {premiumTab==='surgical'&&(isPremium?<SurgicalPlanningSummary patterns={patterns}/>:<LockedFeature onUpgrade={onUpgrade} feature="surgical"/>)}
      {premiumTab==='treatment'&&(isPremium?<TreatmentResponseDashboard/>:<LockedFeature onUpgrade={onUpgrade} feature="treatment"/>)}
      {premiumTab==='viz'&&(isPremium?<PremiumVisualizations patterns={patterns} currentDayNum={cycleData?.currentDayNum} cycleLength={cycleData?.cycleLength}/>:<LockedFeature onUpgrade={onUpgrade} feature="viz"/>)}
    </div>
  )
}

export default App
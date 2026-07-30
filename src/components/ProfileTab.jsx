/**
 * ProfileTab
 *
 * The account/settings screen: profile info (name, email), cycle settings
 * (last period start, period duration, average cycle length), password
 * management, premium status, data export, log out, and account deletion.
 *
 * All saves go through the existing updateUser/changePassword/deleteAccount
 * calls in dbService.js, which hit the same authenticated /api/users
 * endpoints the rest of the app already uses.
 */
import { useState, useCallback } from 'react'
import { updateUser, changePassword, deleteAccount, logoutUser, createBillingPortalSession } from '../services/dbService'

function formatMemberSince(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
}

function SectionCard({ icon, title, subtitle, children }) {
  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">{icon}</span> {title}
        </h3>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export default function ProfileTab({ userId, userProfile, isPremium, userRole, onUpgrade, onLogout, onProfileUpdate }) {
  const isClinician = userRole === 'clinician'

  // ---- Profile info (name/email) ----
  const [editingInfo, setEditingInfo] = useState(false)
  const [name, setName] = useState(userProfile?.display_name || '')
  const [email, setEmail] = useState(userProfile?.email || '')
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoError, setInfoError] = useState('')
  const [infoSaved, setInfoSaved] = useState(false)

  const startEditingInfo = useCallback(() => {
    setName(userProfile?.display_name || '')
    setEmail(userProfile?.email || '')
    setInfoError('')
    setInfoSaved(false)
    setEditingInfo(true)
  }, [userProfile])

  const saveInfo = useCallback(async () => {
    setInfoSaving(true)
    setInfoError('')
    try {
      await updateUser(userId, { displayName: name, email: email || undefined })
      onProfileUpdate?.({ ...userProfile, display_name: name, email })
      setEditingInfo(false)
      setInfoSaved(true)
      setTimeout(() => setInfoSaved(false), 3000)
    } catch (e) {
      setInfoError(e.message || 'Could not save changes')
    } finally {
      setInfoSaving(false)
    }
  }, [userId, name, email, userProfile, onProfileUpdate])

  // ---- Cycle settings ----
  const [editingCycle, setEditingCycle] = useState(false)
  const [lastPeriodStart, setLastPeriodStart] = useState(userProfile?.last_period_start || '')
  const [periodLength, setPeriodLength] = useState(userProfile?.period_length_avg || 5)
  const [cycleLength, setCycleLength] = useState(userProfile?.cycle_length_avg || 28)
  const [cycleSaving, setCycleSaving] = useState(false)
  const [cycleError, setCycleError] = useState('')
  const [cycleSaved, setCycleSaved] = useState(false)

  const startEditingCycle = useCallback(() => {
    setLastPeriodStart(userProfile?.last_period_start || '')
    setPeriodLength(userProfile?.period_length_avg || 5)
    setCycleLength(userProfile?.cycle_length_avg || 28)
    setCycleError('')
    setCycleSaved(false)
    setEditingCycle(true)
  }, [userProfile])

  const saveCycle = useCallback(async () => {
    setCycleSaving(true)
    setCycleError('')
    try {
      await updateUser(userId, {
        lastPeriodStart: lastPeriodStart || undefined,
        periodLength: Number(periodLength),
        cycleLength: Number(cycleLength),
      })
      onProfileUpdate?.({
        ...userProfile,
        last_period_start: lastPeriodStart,
        period_length_avg: Number(periodLength),
        cycle_length_avg: Number(cycleLength),
      })
      setEditingCycle(false)
      setCycleSaved(true)
      setTimeout(() => setCycleSaved(false), 3000)
    } catch (e) {
      setCycleError(e.message || 'Could not save changes')
    } finally {
      setCycleSaving(false)
    }
  }, [userId, lastPeriodStart, periodLength, cycleLength, userProfile, onProfileUpdate])

  // ---- Password ----
  const hasPassword = !!userProfile?.has_password
  const hasEmail = !!userProfile?.email
  const [editingPassword, setEditingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  const closePasswordForm = useCallback(() => {
    setEditingPassword(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPwError('')
  }, [])

  const savePassword = useCallback(async () => {
    setPwError('')
    if (newPassword.length < 6) return setPwError('New password must be at least 6 characters')
    if (newPassword !== confirmPassword) return setPwError('Passwords do not match')
    setPwSaving(true)
    try {
      await changePassword(userId, { currentPassword: currentPassword || undefined, newPassword })
      closePasswordForm()
      setPwSaved(true)
      setTimeout(() => setPwSaved(false), 3000)
    } catch (e) {
      setPwError(e.message || 'Could not update password')
    } finally {
      setPwSaving(false)
    }
  }, [userId, currentPassword, newPassword, confirmPassword, closePasswordForm])

  // ---- Export data ----
  const handleExport = useCallback(() => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: {
        displayName: userProfile?.display_name || '',
        email: userProfile?.email || '',
        cycleLengthAvg: userProfile?.cycle_length_avg || null,
        periodLengthAvg: userProfile?.period_length_avg || null,
        lastPeriodStart: userProfile?.last_period_start || null,
        memberSince: userProfile?.created_at || null,
      },
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `endobuddy-data-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [userProfile])

  // ---- Log out ----
  const handleLogout = useCallback(() => {
    logoutUser()
    onLogout?.()
  }, [onLogout])

  // ---- Manage / cancel subscription ----
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState('')

  const handleManageSubscription = useCallback(async () => {
    setPortalLoading(true)
    setPortalError('')
    try {
      const { url } = await createBillingPortalSession(userId)
      window.location.href = url
    } catch (e) {
      setPortalError(e.message || 'Could not open billing portal')
      setPortalLoading(false)
    }
  }, [userId])

  // ---- Delete account ----
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDelete = useCallback(async () => {
    setDeleteError('')
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      return setDeleteError('Type DELETE to confirm')
    }
    if (hasPassword && !deletePassword) {
      return setDeleteError('Enter your password to confirm')
    }
    setDeleting(true)
    try {
      await deleteAccount(userId, deletePassword || undefined)
      onLogout?.()
    } catch (e) {
      setDeleteError(e.message || 'Could not delete account')
      setDeleting(false)
    }
  }, [userId, deletePassword, deleteConfirmText, hasPassword, onLogout])

  const memberSince = formatMemberSince(userProfile?.created_at)
  const initial = (userProfile?.display_name || 'E').trim().charAt(0).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-24 md:pb-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-endo-purple to-endo-pink flex items-center justify-center text-white text-2xl font-bold shrink-0" aria-hidden="true">
          {initial}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">{userProfile?.display_name || 'My Profile'}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {isClinician && <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full">Clinician</span>}
            {isPremium && <span className="text-xs bg-gradient-to-r from-endo-purple to-endo-pink text-white font-bold px-2 py-0.5 rounded-full">{'\u2B50'} Premium</span>}
            {!hasEmail && <span className="text-xs bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full">Local device only</span>}
            {memberSince && <span className="text-xs text-gray-400">Member since {memberSince}</span>}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <SectionCard icon={"\u{1F464}"} title="Profile Info">
        {!editingInfo ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="text-sm text-gray-800">{userProfile?.display_name || <span className="text-gray-400">Not set</span>}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm text-gray-800">{userProfile?.email || <span className="text-gray-400">No email on file (local-only account)</span>}</p>
            </div>
            {infoSaved && <p className="text-xs text-green-600">Saved!</p>}
            <button onClick={startEditingInfo} className="text-sm font-medium text-endo-purple hover:text-endo-pink min-h-[44px]">Edit</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input id="profile-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="input-field min-h-[44px]" autoFocus />
            </div>
            <div>
              <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com" className="input-field min-h-[44px]" autoComplete="email" />
              {!hasEmail && <p className="text-xs text-gray-400 mt-1.5">Adding an email lets you log in from any device and enables a password.</p>}
            </div>
            {infoError && <p className="text-sm text-red-500" role="alert">{infoError}</p>}
            <div className="flex gap-2">
              <button onClick={saveInfo} disabled={infoSaving} className="btn-primary min-h-[44px] px-6 disabled:opacity-50">
                {infoSaving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditingInfo(false)} className="text-sm text-gray-500 hover:text-gray-700 min-h-[44px] px-4">Cancel</button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Cycle Settings — only meaningful for patients */}
      {!isClinician && (
        <SectionCard icon={"\u{1F338}"} title="Cycle Settings" subtitle="Used to calculate your current cycle day and phase">
          {!editingCycle ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Last period start</p>
                  <p className="text-sm text-gray-800">{userProfile?.last_period_start || <span className="text-gray-400">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Period duration</p>
                  <p className="text-sm text-gray-800">{userProfile?.period_length_avg ? `${userProfile.period_length_avg} days` : <span className="text-gray-400">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Average cycle length</p>
                  <p className="text-sm text-gray-800">{userProfile?.cycle_length_avg ? `${userProfile.cycle_length_avg} days` : <span className="text-gray-400">Not set</span>}</p>
                </div>
              </div>
              {cycleSaved && <p className="text-xs text-green-600">Saved!</p>}
              <button onClick={startEditingCycle} className="text-sm font-medium text-endo-purple hover:text-endo-pink min-h-[44px]">Edit</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="last-period" className="block text-sm font-medium text-gray-700 mb-1.5">Last period start date</label>
                <input id="last-period" type="date" value={lastPeriodStart} onChange={(e) => setLastPeriodStart(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)} className="input-field min-h-[44px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="period-length" className="block text-sm font-medium text-gray-700 mb-1.5">Period duration (days)</label>
                  <input id="period-length" type="number" min="1" max="14" value={periodLength}
                    onChange={(e) => setPeriodLength(e.target.value)} className="input-field min-h-[44px]" />
                </div>
                <div>
                  <label htmlFor="cycle-length" className="block text-sm font-medium text-gray-700 mb-1.5">Avg. cycle length (days)</label>
                  <input id="cycle-length" type="number" min="15" max="60" value={cycleLength}
                    onChange={(e) => setCycleLength(e.target.value)} className="input-field min-h-[44px]" />
                </div>
              </div>
              {cycleError && <p className="text-sm text-red-500" role="alert">{cycleError}</p>}
              <div className="flex gap-2">
                <button onClick={saveCycle} disabled={cycleSaving} className="btn-primary min-h-[44px] px-6 disabled:opacity-50">
                  {cycleSaving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setEditingCycle(false)} className="text-sm text-gray-500 hover:text-gray-700 min-h-[44px] px-4">Cancel</button>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* Password */}
      <SectionCard icon={"\u{1F512}"} title={hasPassword ? 'Password' : 'Set a Password'}
        subtitle={hasPassword ? 'Change the password used to log in' : (hasEmail ? 'Add a password so you can log in on other devices' : 'Add an email above first, then set a password')}>
        {!editingPassword ? (
          <div className="space-y-3">
            {pwSaved && <p className="text-xs text-green-600">Password updated!</p>}
            <button onClick={() => setEditingPassword(true)} disabled={!hasEmail && !hasPassword}
              className="text-sm font-medium text-endo-purple hover:text-endo-pink min-h-[44px] disabled:text-gray-300 disabled:cursor-not-allowed">
              {hasPassword ? 'Change password' : 'Set password'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {hasPassword && (
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1.5">Current password</label>
                <input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field min-h-[44px]" autoComplete="current-password" autoFocus />
              </div>
            )}
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
              <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters" className="input-field min-h-[44px]" autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
              <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field min-h-[44px]" autoComplete="new-password"
                onKeyDown={(e) => { if (e.key === 'Enter' && newPassword && confirmPassword && !pwSaving) savePassword() }} />
            </div>
            {pwError && <p className="text-sm text-red-500" role="alert">{pwError}</p>}
            <div className="flex gap-2">
              <button onClick={savePassword} disabled={pwSaving} className="btn-primary min-h-[44px] px-6 disabled:opacity-50">
                {pwSaving ? 'Saving...' : 'Save password'}
              </button>
              <button onClick={closePasswordForm} className="text-sm text-gray-500 hover:text-gray-700 min-h-[44px] px-4">Cancel</button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Premium status */}
      {!isClinician && (
        <SectionCard icon={"\u2B50"} title="Subscription">
          {isPremium ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">You're on <span className="font-semibold text-gray-800">Premium</span> — full access to all features.</p>
                <span className="bg-gradient-to-r from-endo-purple to-endo-pink text-white text-xs font-bold px-3 py-1.5 rounded-full shrink-0">ACTIVE</span>
              </div>
              {portalError && <p className="text-sm text-red-500" role="alert">{portalError}</p>}
              <button onClick={handleManageSubscription} disabled={portalLoading}
                className="text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded-full px-4 py-2 min-h-[44px] disabled:opacity-50">
                {portalLoading ? 'Opening...' : 'Manage / cancel subscription'}
              </button>
              <p className="text-xs text-gray-400">Opens Stripe's secure billing portal to update payment details, view invoices, or cancel.</p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600">You're on the <span className="font-semibold text-gray-800">Free</span> plan.</p>
                <p className="text-xs text-gray-400 mt-0.5">Unlock meal plans, deep reports, and more.</p>
              </div>
              <button onClick={onUpgrade} className="bg-gradient-to-r from-endo-purple to-endo-pink text-white text-sm font-bold px-4 py-2 rounded-full hover:opacity-90 shadow-md min-h-[44px] shrink-0">
                Upgrade
              </button>
            </div>
          )}
        </SectionCard>
      )}

      {/* Data export */}
      <SectionCard icon={"\u{1F4E5}"} title="Your Data" subtitle="Download a copy of your profile info for your own records">
        <button onClick={handleExport} className="btn-secondary min-h-[44px] px-6">Export my data</button>
      </SectionCard>

      {/* Log out */}
      <button onClick={handleLogout} className="w-full card text-center text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 min-h-[44px] py-3">
        {'\u{1F6AA}'} Log Out
      </button>

      {/* Danger zone */}
      <div className="border border-red-100 rounded-2xl p-6 bg-red-50/40">
        <h3 className="text-base font-semibold text-red-700 mb-1">Danger Zone</h3>
        <p className="text-xs text-red-600/80 mb-4">Permanently delete your account and all logged data. This can't be undone.</p>
        <button onClick={() => setShowDeleteModal(true)} className="text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 rounded-full px-4 py-2 min-h-[44px]">
          Delete my account
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setShowDeleteModal(false)} />
          <div className="relative z-10 card max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete your account?</h3>
            <p className="text-sm text-gray-500 mb-4">This permanently deletes your profile, cycle logs, and reports. This action cannot be undone.</p>
            {hasPassword && (
              <div className="mb-3">
                <label htmlFor="delete-password" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm your password</label>
                <input id="delete-password" type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
                  className="input-field min-h-[44px]" autoFocus />
              </div>
            )}
            <div className="mb-4">
              <label htmlFor="delete-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">Type DELETE to confirm</label>
              <input id="delete-confirm" type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="input-field min-h-[44px]" placeholder="DELETE" />
            </div>
            {deleteError && <p className="text-sm text-red-500 mb-3" role="alert">{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-full min-h-[44px] disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Permanently delete'}
              </button>
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting}
                className="text-sm text-gray-500 hover:text-gray-700 min-h-[44px] px-4">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

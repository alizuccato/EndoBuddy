/**
 * SymptomHeatmap
 * 
 * Monthly calendar view showing pain levels as color-coded day tiles.
 * - Standard 7-day grid (Sun-Sat)
 * - Days colored by highest pain level logged
 * - Current day highlighted with bold border
 * - Tap a day to see symptom icons
 * - Legend at the bottom
 * 
 * Reference: insights-ui-design.md Section 2
 */

import { useState, useMemo } from 'react'
import { getPainColor, PHASE_STYLES } from '../utils/mockData'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function SymptomHeatmap({ cycleData }) {
  const { days, cycleStartDate } = cycleData
  const [selectedDay, setSelectedDay] = useState(null)
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0)
  
  // Calculate calendar grid based on the cycle start date
  const calendar = useMemo(() => {
    const startDate = new Date(cycleStartDate || Date.now())
    
    // Adjust month by offset
    const targetDate = new Date(startDate)
    targetDate.setMonth(targetDate.getMonth() + currentMonthOffset)
    
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()
    
    // First day of month
    const firstDay = new Date(year, month, 1)
    const startDayOfWeek = firstDay.getDay() // 0=Sun
    
    // Days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    // Build grid cells
    const cells = []
    const today = new Date()
    
    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ empty: true })
    }
    
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayData = days.find(day => day.date === dateStr)
      const isToday = dateStr === today.toISOString().split('T')[0]
      const isFuture = dateStr > today.toISOString().split('T')[0]
      
      cells.push({
        day: d,
        date: dateStr,
        data: dayData,
        isToday,
        isFuture,
      })
    }
    
    return {
      year,
      month,
      monthName: MONTH_NAMES[month],
      cells,
      daysInMonth,
    }
  }, [cycleStartDate, currentMonthOffset, days])
  
  const handlePrevMonth = () => setCurrentMonthOffset(prev => prev - 1)
  const handleNextMonth = () => setCurrentMonthOffset(prev => prev + 1)
  
  const selectedDayData = selectedDay !== null ? calendar.cells[selectedDay] : null
  
  return (
    <div className="card">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="font-semibold text-gray-900 text-sm">
          {calendar.monthName} {calendar.year}
        </h3>
        
        <button
          onClick={handleNextMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className="text-center text-[10px] font-medium text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendar.cells.map((cell, index) => {
          if (cell.empty) {
            return <div key={`empty-${index}`} className="aspect-square" />
          }
          
          const isSelected = selectedDay === index
          const painLevel = cell.data?.painLevel || 0
          const painColor = getPainColor(painLevel)
          const hasSymptoms = cell.data?.symptoms?.length > 0
          
          return (
            <button
              key={cell.date}
              onClick={() => setSelectedDay(isSelected ? null : index)}
              className={`
                relative aspect-square rounded-lg flex flex-col items-center justify-center
                text-xs font-medium transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-endo-purple focus:ring-offset-1
                ${cell.isFuture ? 'opacity-30 cursor-default' : 'cursor-pointer'}
                ${cell.isToday 
                  ? 'ring-2 ring-endo-purple ring-offset-1' 
                  : isSelected 
                    ? 'ring-2 ring-gray-400' 
                    : ''
                }
              `}
              disabled={cell.isFuture}
            >
              {/* Background color based on pain level */}
              <div 
                className={`
                  absolute inset-0 rounded-lg
                  ${cell.isFuture ? 'bg-gray-50' : painColor.bg}
                  ${isSelected ? 'opacity-100' : 'opacity-80'}
                `}
              />
              
              {/* Day number */}
              <span className={`relative z-10 text-[11px] font-semibold
                ${painLevel >= 8 ? 'text-white' : painLevel >= 4 ? 'text-gray-800' : 'text-gray-600'}
              `}>
                {cell.day}
              </span>
              
              {/* Symptom indicators */}
              {hasSymptoms && !cell.isFuture && (
                <div className="relative z-10 flex gap-0.5 mt-0.5">
                  {cell.data.symptoms.slice(0, 2).map((s) => (
                    <span key={s.id} className="text-[8px]">{s.icon}</span>
                  ))}
                  {cell.data.symptoms.length > 2 && (
                    <span className="text-[7px] text-gray-400">+{cell.data.symptoms.length - 2}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
      
      {/* Selected Day Details */}
      {selectedDayData && selectedDayData.data && !selectedDayData.isFuture && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm text-gray-900">
              Day {selectedDayData.data.dayNum} — {selectedDayData.date}
            </span>
            <span className={`text-xs font-semibold ${
              selectedDayData.data.phase ? PHASE_STYLES[selectedDayData.data.phase]?.text : ''
            }`}>
              {selectedDayData.data.phase ? PHASE_STYLES[selectedDayData.data.phase]?.label : ''}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${getPainColor(selectedDayData.data.painLevel).bg}`}>
              <span className="font-semibold">{selectedDayData.data.painLevel}/10</span>
              <span className="text-gray-600">pain</span>
            </div>
            
            {selectedDayData.data.symptoms?.map((s) => (
              <span key={s.id} className="symptom-badge bg-gray-100 text-gray-700 text-[11px]">
                {s.icon} {s.name}
              </span>
            ))}
            
            {selectedDayData.data.flowLevel && (
              <span className="symptom-badge bg-endo-pink/10 text-endo-pink text-[11px] capitalize">
                🩸 {selectedDayData.data.flowLevel}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Color Legend */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span className="text-[10px] text-gray-400 font-medium">Pain intensity</span>
        <div className="flex items-center gap-0.5">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
            <div
              key={level}
              className={`w-4 h-3 ${getPainColor(level).bg} ${level === 0 ? 'border border-gray-200' : ''}`}
              title={`Level ${level}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400">Low</span>
          <span className="text-[10px] text-gray-400">High</span>
        </div>
      </div>
    </div>
  )
}
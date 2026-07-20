/**
 * CycleMap
 * 
 * Circular visualization showing the user's cycle phases and pain levels.
 * Inner ring: 4 phases (Menstrual, Follicular, Ovulatory, Luteal)
 * Outer ring: Individual days with color-coded pain dots
 * Center: Current day and phase display
 * Interactive: Tap a phase to see its description
 * 
 * Reference: insights-ui-design.md Section 1
 */

import { useState, useMemo } from 'react'
import { PHASE_ORDER, PHASE_STYLES, getPainColor } from '../utils/mockData'

// SVG dimensions
const SIZE = 280
const CENTER = SIZE / 2
const INNER_RADIUS = 50
const MID_RADIUS = 90
const OUTER_RADIUS = 130
const DOT_RADIUS = 5
const PHASE_PADDING = 2

export default function CycleMap({ cycleData }) {
  const [selectedPhase, setSelectedPhase] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  
  const { days, currentPhase, currentDayNum, cycleLength, periodLength } = cycleData
  
  // Calculate SVG arc paths for phases
  const phaseArcs = useMemo(() => {
    const segments = []
    const totalDays = cycleLength || 28
    
    // Phase day ranges (simplified)
    const phaseDays = {
      menstrual: { start: 0, end: periodLength || 5 },
      follicular: { start: periodLength || 5, end: 14 },
      ovulatory: { start: 14, end: 15 },
      luteal: { start: 15, end: totalDays },
    }
    
    PHASE_ORDER.forEach((phaseKey) => {
      const range = phaseDays[phaseKey]
      if (!range) return
      
      const startAngle = (range.start / totalDays) * 360 - 90
      const endAngle = (range.end / totalDays) * 360 - 90
      
      segments.push({
        phase: phaseKey,
        startAngle,
        endAngle,
        ...PHASE_STYLES[phaseKey],
        isActive: phaseKey === currentPhase,
      })
    })
    
    return segments
  }, [cycleLength, periodLength, currentPhase])
  
  // Convert angle to SVG coordinates
  const polarToCartesian = (angle, radius) => {
    const rad = (angle * Math.PI) / 180
    return {
      x: CENTER + radius * Math.cos(rad),
      y: CENTER + radius * Math.sin(rad),
    }
  }
  
  // Generate SVG arc path
  const describeArc = (startAngle, endAngle, radius) => {
    const start = polarToCartesian(endAngle, radius)
    const end = polarToCartesian(startAngle, radius)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    
    return [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    ].join(' ')
  }
  
  // Draw inner phase arcs
  const renderPhaseArcs = () => {
    return phaseArcs.map((seg) => {
      const isSelected = selectedPhase === seg.phase
      const innerRadius = isSelected ? INNER_RADIUS + 5 : INNER_RADIUS
      
      return (
        <g key={seg.phase}>
          <path
            d={describeArc(seg.startAngle, seg.endAngle, MID_RADIUS)}
            fill="none"
            stroke={isSelected ? seg.color : seg.color + '80'}
            strokeWidth={isSelected ? (MID_RADIUS - innerRadius) * 2 + 4 : MID_RADIUS - innerRadius + 2}
            opacity={isSelected ? 1 : 0.85}
            className="cursor-pointer transition-all duration-200"
            onClick={() => setSelectedPhase(selectedPhase === seg.phase ? null : seg.phase)}
          />
          {/* Phase label */}
          {(isSelected || seg.phase === currentPhase) && (
            <text
              x={CENTER}
              y={CENTER - 35}
              textAnchor="middle"
              className="text-xs font-semibold"
              fill={seg.color}
            >
              {seg.label}
            </text>
          )}
        </g>
      )
    })
  }
  
  // Draw outer pain dots
  const renderPainDots = () => {
    return days.map((day, index) => {
      const angle = (index / cycleLength) * 360 - 90
      const pos = polarToCartesian(angle, OUTER_RADIUS)
      const painColor = getPainColor(day.painLevel)
      const isClicked = selectedDay === index
      
      return (
        <g key={day.date}>
          <circle
            cx={pos.x}
            cy={pos.y}
            r={isClicked ? DOT_RADIUS + 3 : DOT_RADIUS}
            fill={day.painLevel > 0 ? painColor.hex : '#E5E7EB'}
            stroke={day.isToday ? '#7C3AED' : isClicked ? '#1F2937' : 'none'}
            strokeWidth={day.isToday ? 2 : isClicked ? 1.5 : 0}
            className={`cursor-pointer transition-all duration-150 ${day.isFuture ? 'opacity-30' : 'hover:opacity-80'}`}
            onClick={() => setSelectedDay(selectedDay === index ? null : index)}
          />
          {/* Tooltip on click */}
          {isClicked && (
            <g>
              <rect
                x={pos.x - 35}
                y={pos.y - 28}
                width={70}
                height={22}
                rx={4}
                fill="white"
                stroke="#E5E7EB"
                strokeWidth={1}
              />
              <text
                x={pos.x}
                y={pos.y - 13}
                textAnchor="middle"
                className="text-[9px]"
                fill="#4B5563"
              >
                Day {day.dayNum}: {day.painLevel}/10
              </text>
            </g>
          )}
        </g>
      )
    })
  }

  // Current phase description panel
  const phaseInfo = selectedPhase ? PHASE_STYLES[selectedPhase] : null

  return (
    <div className="card">
      <div className="flex flex-col items-center">
        {/* SVG Cycle Map */}
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Outer ring background */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={OUTER_RADIUS + DOT_RADIUS + 4}
            fill="none"
            stroke="#F3F4F6"
            strokeWidth={2}
          />
          
          {/* Phase arcs */}
          {renderPhaseArcs()}
          
          {/* Pain dots */}
          {renderPainDots()}
          
          {/* Center circle */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={INNER_RADIUS - 2}
            fill="white"
            stroke="#E5E7EB"
            strokeWidth={1}
          />
          
          {/* Center text - current day */}
          <text
            x={CENTER}
            y={CENTER - 8}
            textAnchor="middle"
            className="text-2xl font-bold"
            fill="#1F2937"
          >
            Day {currentDayNum}
          </text>
          <text
            x={CENTER}
            y={CENTER + 12}
            textAnchor="middle"
            className="text-[11px] font-medium"
            fill={PHASE_STYLES[currentPhase]?.color || '#6B7280'}
          >
            {PHASE_STYLES[currentPhase]?.label || 'Unknown'}
          </text>
        </svg>

        {/* Phase Description */}
        {phaseInfo && (
          <div className={`${phaseInfo.bg} ${phaseInfo.text} rounded-xl p-3 mt-2 -mb-2 w-full text-center`}>
            <p className="text-xs leading-relaxed">{phaseInfo.description}</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-300" />
          <span className="text-[10px] text-gray-500">Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-400" />
          <span className="text-[10px] text-gray-500">Moderate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-[10px] text-gray-500">Severe</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-purple-700" />
          <span className="text-[10px] text-gray-500">Worst</span>
        </div>
        <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
          <div className="w-3 h-3 rounded-full bg-gray-200" />
          <span className="text-[10px] text-gray-500">No data</span>
        </div>
      </div>
    </div>
  )
}
import React from 'react'
import { Info } from 'lucide-react'

export default function PollutantBreakdown({ pollutants = {}, t }) {
  // WHO 24-hour guidelines:
  // PM2.5: 15 µg/m³
  // PM10: 45 µg/m³
  // O3: 100 µg/m³ (8h)
  // NO2: 25 µg/m³
  const metrics = [
    {
      id: 'pm2_5',
      name: 'PM2.5 (Fine Particles)',
      val: pollutants.pm2_5 ?? 0,
      unit: 'µg/m³',
      whoLimit: 15,
      impact: 'Penetrates deep into alveolar sacs & bloodstream.',
    },
    {
      id: 'pm10',
      name: 'PM10 (Coarse Dust)',
      val: pollutants.pm10 ?? 0,
      unit: 'µg/m³',
      whoLimit: 45,
      impact: 'Irritates nasal passages, throat, and upper airways.',
    },
    {
      id: 'o3',
      name: 'Ozone (O₃)',
      val: pollutants.o3 ?? 0,
      unit: 'µg/m³',
      whoLimit: 100,
      impact: 'Powerful oxidant; causes chest tightness & asthma attacks.',
    },
    {
      id: 'no2',
      name: 'Nitrogen Dioxide (NO₂)',
      val: pollutants.no2 ?? 0,
      unit: 'µg/m³',
      whoLimit: 25,
      impact: 'Combustion byproduct; inflames bronchial lining.',
    },
  ]

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-teal-600" aria-hidden="true" />
          {t.pollutantsTitle}
        </h3>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          WHO 24-hour Guideline Benchmarked
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {metrics.map((m) => {
          const ratio = (m.val / m.whoLimit).toFixed(1)
          const isOver = m.val > m.whoLimit
          const barPct = Math.min(100, (m.val / (m.whoLimit * 3)) * 100)

          return (
            <div
              key={m.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60"
            >
              <div className="flex items-start justify-between gap-1">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    {m.name}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {m.impact}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {m.val}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-0.5">{m.unit}</span>
                </div>
              </div>

              {/* Progress indicator vs WHO benchmark */}
              <div className="mt-2.5">
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    role="progressbar"
                    aria-valuenow={m.val}
                    aria-valuemin={0}
                    aria-valuemax={m.whoLimit * 3}
                    aria-label={`${m.name} concentration`}
                    style={{ width: `${barPct}%` }}
                    className={`h-full rounded-full transition-all ${
                      m.val > m.whoLimit * 2
                        ? 'bg-rose-500'
                        : isOver
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>WHO Standard: {m.whoLimit} {m.unit}</span>
                  <span className={isOver ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-emerald-600'}>
                    {isOver ? `${ratio}x WHO limit` : 'Within safe range'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

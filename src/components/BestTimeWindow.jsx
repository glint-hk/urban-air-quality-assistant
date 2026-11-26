import React from 'react'
import { Clock, Star, TrendingDown } from 'lucide-react'

export default function BestTimeWindow({ bestTimeWindow, forecast = [], t, lang }) {
  if (!bestTimeWindow || !bestTimeWindow.hasRecommendation) return null

  // Take next 12 hours for visual timeline
  const nextHours = forecast.slice(0, 12)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-teal-600" aria-hidden="true" />
          {t.bestTimeTitle}
        </h3>
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" aria-hidden="true" />
          Optimal: {bestTimeWindow.start} – {bestTimeWindow.end}
        </span>
      </div>

      <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/60 mb-4">
        <div className="flex items-start gap-2.5">
          <TrendingDown className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-xs sm:text-sm text-teal-950 dark:text-teal-200 font-medium">
            {lang === 'hi' ? bestTimeWindow.hindiAdvice : bestTimeWindow.advice}
          </p>
        </div>
      </div>

      {/* Visual Hourly Forecast Bar Chart */}
      {nextHours.length > 0 && (
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            12-Hour AQI Trend:
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 items-end h-24 pt-4 px-1">
            {nextHours.map((item, idx) => {
              const d = new Date(item.time)
              const hour = d.getHours()
              const label = `${hour % 12 === 0 ? 12 : hour % 12}${hour >= 12 ? 'p' : 'a'}`
              const aqiVal = item.aqi || 50
              const heightPct = Math.min(100, Math.max(15, (aqiVal / 300) * 100))
              const isBest = item.time === bestTimeWindow.rawTime

              // Accessible bar color
              let barColor = 'bg-emerald-500'
              if (aqiVal > 200) barColor = 'bg-rose-600'
              else if (aqiVal > 150) barColor = 'bg-red-500'
              else if (aqiVal > 100) barColor = 'bg-orange-500'
              else if (aqiVal > 50) barColor = 'bg-amber-400'

              return (
                <div key={idx} className="flex flex-col items-center justify-end h-full group relative">
                  <div
                    tabIndex={0}
                    role="img"
                    aria-label={`Time: ${label}, AQI: ${aqiVal}`}
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all ${barColor} ${
                      isBest ? 'ring-2 ring-teal-500 ring-offset-1 font-bold shadow-xs' : 'opacity-85 hover:opacity-100'
                    }`}
                  />
                  <span className={`text-[10px] mt-1 transition-colors ${isBest ? 'font-bold text-teal-700 dark:text-teal-300' : 'text-slate-400'}`}>
                    {label}
                  </span>

                  {/* Tooltip on hover/focus */}
                  <div className="absolute -top-7 hidden group-hover:flex group-focus:flex items-center px-1.5 py-0.5 bg-slate-900 text-white text-[10px] rounded whitespace-nowrap z-20 shadow">
                    AQI {aqiVal}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

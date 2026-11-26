import React from 'react'
import { HeartPulse, Activity, Clock, ShieldAlert, Baby, UserCheck, Flame } from 'lucide-react'
import { SENSITIVITY_PROFILES, ACTIVITY_PROFILES } from '../engine/decisionEngine.js'

export default function UserProfileForm({
  sensitivity,
  setSensitivity,
  activity,
  setActivity,
  timeWindow,
  setTimeWindow,
  t,
  lang,
}) {
  const sensitivityIcons = {
    general: UserCheck,
    asthma: Flame,
    heart: HeartPulse,
    pregnancy: HeartPulse,
    elderly: ShieldAlert,
    child: Baby,
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-4">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
        <Activity className="w-4 h-4 text-teal-600" aria-hidden="true" />
        {t.userProfileSection}
      </h2>

      {/* Sensitivity Group Selector */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
          {t.healthSensitivityLabel}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label={t.healthSensitivityLabel}>
          {Object.keys(SENSITIVITY_PROFILES).map((key) => {
            const Icon = sensitivityIcons[key] || UserCheck
            const isSelected = sensitivity === key
            const label = lang === 'hi' ? SENSITIVITY_PROFILES[key].hindiName : SENSITIVITY_PROFILES[key].name

            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSensitivity(key)}
                className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all text-xs font-medium ${
                  isSelected
                    ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} aria-hidden="true" />
                <span className="line-clamp-2 leading-tight">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Planned Activity Selector */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
          {t.activityLabel}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label={t.activityLabel}>
          {Object.keys(ACTIVITY_PROFILES).map((key) => {
            const isSelected = activity === key
            const label = lang === 'hi' ? ACTIVITY_PROFILES[key].hindiName : ACTIVITY_PROFILES[key].name

            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setActivity(key)}
                className={`p-2.5 rounded-xl border text-left transition-all text-xs font-medium ${
                  isSelected
                    ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="line-clamp-2 leading-tight">{label}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Time Window Selector */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          {t.timeWindowLabel}
        </label>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t.timeWindowLabel}>
          {[
            { id: 'now', label: t.timeNow },
            { id: 'morning', label: t.timeMorning },
            { id: 'midday', label: t.timeMidday },
            { id: 'evening', label: t.timeEvening },
            { id: 'night', label: t.timeNight },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={timeWindow === item.id}
              onClick={() => setTimeWindow(item.id)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                timeWindow === item.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

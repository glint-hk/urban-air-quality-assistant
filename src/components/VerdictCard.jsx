import React from 'react'
import { CheckCircle2, AlertTriangle, XOctagon, Shield, Wind, Sparkles } from 'lucide-react'

export default function VerdictCard({ decision, t, lang, highContrast }) {
  if (!decision) return null

  const { verdict, verdictTitle, verdictHindi, riskLevel, aqi, category, reasons, maskRecommendation, ventilationAdvisory } = decision

  // Color-blind safe visual indicators: Distinct symbols, high-contrast borders, explicit badges
  const verdictConfig = {
    GO: {
      Icon: CheckCircle2,
      badgeText: lang === 'hi' ? 'सुरक्षित (GO)' : 'GO — SAFE',
      bgColor: highContrast ? 'bg-black text-white border-4 border-green-400' : 'bg-emerald-500 text-white',
      cardBorder: highContrast ? 'border-4 border-green-400' : 'border-emerald-300 dark:border-emerald-700/60',
      pillBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300',
      pattern: '● GO / SAFE',
    },
    LIMIT: {
      Icon: AlertTriangle,
      badgeText: lang === 'hi' ? 'सीमित करें (LIMIT)' : 'LIMIT — CAUTION',
      bgColor: highContrast ? 'bg-black text-yellow-300 border-4 border-yellow-400' : 'bg-amber-500 text-white',
      cardBorder: highContrast ? 'border-4 border-yellow-400' : 'border-amber-300 dark:border-amber-700/60',
      pillBg: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300',
      pattern: '▲ LIMIT / CAUTION',
    },
    AVOID: {
      Icon: XOctagon,
      badgeText: lang === 'hi' ? 'बचें (AVOID)' : 'AVOID — HAZARDOUS',
      bgColor: highContrast ? 'bg-black text-red-400 border-4 border-red-500' : 'bg-rose-600 text-white',
      cardBorder: highContrast ? 'border-4 border-red-500' : 'border-rose-300 dark:border-rose-700/60',
      pillBg: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border-rose-300',
      pattern: '■ AVOID / DANGER',
    },
  }

  const current = verdictConfig[verdict] || verdictConfig.LIMIT
  const VerdictIcon = current.Icon

  return (
    <div
      role="region"
      aria-labelledby="verdict-heading"
      className={`rounded-2xl p-5 sm:p-6 border shadow-sm transition-all bg-white dark:bg-slate-900 ${current.cardBorder}`}
    >
      {/* Top Banner with Verdict and AQI */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3.5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${current.bgColor}`}>
            <VerdictIcon className="w-8 h-8" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${current.pillBg}`}>
                {current.pattern}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Risk: {riskLevel.toUpperCase()}
              </span>
            </div>
            <h3 id="verdict-heading" className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {lang === 'hi' ? verdictHindi : verdictTitle}
            </h3>
          </div>
        </div>

        {/* Big AQI Badge */}
        <div className="flex items-baseline space-x-2 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-right">
            <span className="text-xs uppercase text-slate-500 dark:text-slate-400 block font-semibold">Current AQI</span>
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{category}</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {aqi}
          </div>
        </div>
      </div>

      {/* Logical Decision Reasons */}
      <div className="py-4 border-b border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
          {t.reasonsTitle}
        </h4>
        <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
          {reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-teal-600 dark:text-teal-400 font-bold mt-0.5">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actionable Prescriptions: Mask & Ventilation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
        {/* Mask Advisory Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center gap-2 mb-1.5">
            <Shield className="w-4 h-4 text-teal-600" aria-hidden="true" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {t.maskAdvisoryTitle}
            </span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {lang === 'hi' ? maskRecommendation.hindiType : maskRecommendation.type}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {lang === 'hi' ? maskRecommendation.hindiNote : maskRecommendation.note}
          </p>
        </div>

        {/* Ventilation Advisory Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center gap-2 mb-1.5">
            <Wind className="w-4 h-4 text-teal-600" aria-hidden="true" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {t.ventilationAdvisoryTitle}
            </span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {lang === 'hi' ? ventilationAdvisory.hindiAction : ventilationAdvisory.action}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {lang === 'hi' ? ventilationAdvisory.hindiDetails : ventilationAdvisory.details}
          </p>
        </div>
      </div>
    </div>
  )
}

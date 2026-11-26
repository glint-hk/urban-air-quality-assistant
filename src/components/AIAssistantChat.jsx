import React, { useState } from 'react'
import { Bot, Send, Sparkles, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react'

export default function AIAssistantChat({
  decision,
  location,
  sensitivity,
  activity,
  timeWindow,
  pollutants,
  t,
  lang,
  announce,
}) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState(null)
  const [error, setError] = useState(null)

  const quickQuestions = [
    t.quickQ1,
    t.quickQ2,
    t.quickQ3,
    t.quickQ4,
  ]

  const handleAsk = async (queryToAsk) => {
    const q = queryToAsk || question
    if (!q || !q.trim() || loading) return

    setLoading(true)
    setError(null)
    announce('Sending question to Gemini AI advisor...')

    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          location: location?.name || 'Local Area',
          sensitivity,
          activity,
          timeWindow,
          engineVerdict: decision,
          pollutants,
          language: lang,
        }),
      })

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`)
      }

      const data = await res.json()
      setAiResponse(data)
      announce(`AI Advisor answered: ${data.summary}`)
    } catch (err) {
      console.error('Advisor query error:', err)
      setError('Could not reach Gemini service. Showing deterministic safety guidance.')
      // Graceful fallback display
      setAiResponse({
        summary: decision?.verdictTitle || 'Follow safety precautions based on current air quality.',
        detailedExplanation: `Current AQI is ${decision?.aqi || 100} in ${location?.name}. Sensitive groups should minimize outdoor physical exertion.`,
        verdictAlignment: `Grounded in ${decision?.verdict} engine verdict.`,
        actionableSteps: [
          'Monitor real-time AQI updates.',
          decision?.maskRecommendation?.required ? 'Wear an N95 respirator outdoors.' : 'No mask required.',
          decision?.ventilationAdvisory?.action || 'Keep windows closed.',
        ],
        optimalAlternative: decision?.bestTimeWindow?.advice || 'Look for cleaner afternoon hours.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
            <Bot className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              {t.aiAdvisorTitle}
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                Grounded
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.aiAdvisorSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
          {t.quickQuestions}:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuestion(q)
                handleAsk(q)
              }}
              className="text-xs text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-400 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Question Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleAsk()
        }}
        className="flex gap-2"
      >
        <label htmlFor="ai-question-input" className="sr-only">
          Ask Gemini AI Advisor
        </label>
        <input
          id="ai-question-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t.aiPlaceholder}
          className="flex-1 px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="w-4 h-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{loading ? t.askingButton : t.askButton}</span>
        </button>
      </form>

      {/* Grounded Response Display */}
      {aiResponse && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3 mt-3 animate-fadeIn">
          {/* Summary Box */}
          <div className="flex items-start gap-2.5">
            <CheckCircle className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {aiResponse.summary}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                {aiResponse.detailedExplanation}
              </p>
            </div>
          </div>

          {/* Actionable Steps Checklist */}
          {aiResponse.actionableSteps && aiResponse.actionableSteps.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Recommended Action Plan:
              </span>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {aiResponse.actionableSteps.map((step, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Optimal Alternative Timing */}
          {aiResponse.optimalAlternative && (
            <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200">
              <span className="font-semibold">Timing Strategy: </span>
              {aiResponse.optimalAlternative}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

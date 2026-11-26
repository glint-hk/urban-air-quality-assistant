import React, { useState, useEffect, useMemo } from 'react'
import Header from './components/Header.jsx'
import LocationSelector from './components/LocationSelector.jsx'
import UserProfileForm from './components/UserProfileForm.jsx'
import VerdictCard from './components/VerdictCard.jsx'
import BestTimeWindow from './components/BestTimeWindow.jsx'
import PollutantBreakdown from './components/PollutantBreakdown.jsx'
import AIAssistantChat from './components/AIAssistantChat.jsx'
import A11yAnnouncer from './components/A11yAnnouncer.jsx'
import { POPULAR_CITIES, fetchAirQualityData } from './services/airQualityService.js'
import { evaluateAirQuality } from './engine/decisionEngine.js'
import { TRANSLATIONS } from './services/translations.js'

export default function App() {
  const [lang, setLang] = useState('en')
  const [highContrast, setHighContrast] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  // State
  const [location, setLocation] = useState(POPULAR_CITIES[0]) // Default Delhi
  const [sensitivity, setSensitivity] = useState('general')
  const [activity, setActivity] = useState('running')
  const [timeWindow, setTimeWindow] = useState('now')

  // Live air quality & forecast data
  const [aqData, setAqData] = useState(null)
  const [loadingAq, setLoadingAq] = useState(true)

  const t = useMemo(() => TRANSLATIONS[lang] || TRANSLATIONS.en, [lang])

  // Announce helper for screen-readers
  const announce = (msg) => {
    setAnnouncement(msg)
  }

  // Fetch air quality whenever location changes
  useEffect(() => {
    let active = true
    async function loadData() {
      setLoadingAq(true)
      const data = await fetchAirQualityData(location.lat, location.lon)
      if (active) {
        setAqData(data)
        setLoadingAq(false)
        announce(`Air quality updated for ${location.name}: AQI ${data.aqi}`)
      }
    }
    loadData()
    return () => {
      active = false
    }
  }, [location])

  // Re-compute deterministic decision whenever inputs change
  const decision = useMemo(() => {
    if (!aqData) return null
    return evaluateAirQuality({
      aqi: aqData.aqi,
      pollutants: aqData.pollutants,
      sensitivity,
      activity,
      forecast: aqData.forecast,
    })
  }, [aqData, sensitivity, activity, timeWindow])

  return (
    <div className={`min-h-screen transition-colors ${highContrast ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100'}`}>
      <A11yAnnouncer message={announcement} />

      <Header
        lang={lang}
        setLang={(l) => {
          setLang(l)
          announce(l === 'hi' ? 'भाषा बदलकर हिंदी कर दी गई है' : 'Language switched to English')
        }}
        highContrast={highContrast}
        setHighContrast={(val) => {
          setHighContrast(val)
          announce(val ? 'High contrast enabled' : 'High contrast disabled')
        }}
        t={t}
      />

      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Top Controls: Location & User Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <LocationSelector
              currentLocation={location}
              onSelectLocation={setLocation}
              t={t}
              announce={announce}
            />
            <UserProfileForm
              sensitivity={sensitivity}
              setSensitivity={(s) => {
                setSensitivity(s)
                announce(`Health profile set to ${s}`)
              }}
              activity={activity}
              setActivity={(a) => {
                setActivity(a)
                announce(`Activity set to ${a}`)
              }}
              timeWindow={timeWindow}
              setTimeWindow={setTimeWindow}
              t={t}
              lang={lang}
            />
          </div>

          {/* Right Column: Verdict, Time Window & Pollutants */}
          <div className="lg:col-span-7 space-y-6">
            {/* Primary Actionable Verdict Card */}
            <VerdictCard
              decision={decision}
              t={t}
              lang={lang}
              highContrast={highContrast}
            />

            {/* Optimal 24-Hour Activity Window */}
            {decision && (
              <BestTimeWindow
                bestTimeWindow={decision.bestTimeWindow}
                forecast={aqData?.forecast}
                t={t}
                lang={lang}
              />
            )}

            {/* Pollutant Breakdown with WHO Guidelines */}
            {aqData && (
              <PollutantBreakdown
                pollutants={aqData.pollutants}
                t={t}
              />
            )}
          </div>
        </div>

        {/* Gemini AI Conversational Health Advisor */}
        <section aria-label={t.aiAdvisorTitle} className="pt-2">
          <AIAssistantChat
            decision={decision}
            location={location}
            sensitivity={sensitivity}
            activity={activity}
            timeWindow={timeWindow}
            pollutants={aqData?.pollutants}
            t={t}
            lang={lang}
            announce={announce}
          />
        </section>

        {/* Footer & Disclaimer */}
        <footer className="pt-6 pb-8 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p>{t.disclaimer}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Data powered by Open-Meteo Air Quality & Geocoding • Grounded by Google Gemini AI
          </p>
        </footer>
      </main>
    </div>
  )
}

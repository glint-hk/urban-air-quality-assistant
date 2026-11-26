/**
 * Deterministic Rule-Based Decision Engine for Urban Air Quality Advisory.
 *
 * Combines:
 * 1. Current AQI and pollutant concentrations (PM2.5, PM10, O3, NO2, etc.)
 * 2. User health sensitivity profile (asthma, heart, elderly, pregnancy, child, general)
 * 3. Planned activity (running/cardio, commute/walking, outdoor work, window ventilation, child play)
 * 4. 24-hour forecast timeline
 *
 * Produces:
 * - Clear verdict: GO | LIMIT | AVOID
 * - Mask recommendation (type and rationale)
 * - Ventilation / purifier guidance
 * - Best time window today
 * - Transparent explanation of reasons
 */

import { getAqiCategory } from './aqiCalculators.js'

// Activity risk factors (exertion and inhalation multipliers)
export const ACTIVITY_PROFILES = {
  running: {
    name: 'Running / High Cardio',
    hindiName: 'दौड़ना / भारी व्यायाम',
    exertionMultiplier: 1.6, // Inhalation rate increases 4-8x during cardio
    ventilationConcern: false,
    childFocused: false,
  },
  commute: {
    name: 'Commuting / Walking',
    hindiName: 'सड़क पर चलना / आवागमन',
    exertionMultiplier: 1.1,
    ventilationConcern: false,
    childFocused: false,
  },
  outdoor_work: {
    name: 'Outdoor Work (Prolonged)',
    hindiName: 'लंबे समय तक बाहर काम',
    exertionMultiplier: 1.4, // Long cumulative exposure
    ventilationConcern: false,
    childFocused: false,
  },
  ventilation: {
    name: 'Window Ventilation',
    hindiName: 'घर की खिड़कियां खोलना',
    exertionMultiplier: 0.5,
    ventilationConcern: true,
    childFocused: false,
  },
  child_play: {
    name: 'Child Park / Playground Play',
    hindiName: 'बच्चों का पार्क / खेल',
    exertionMultiplier: 1.4,
    ventilationConcern: false,
    childFocused: true,
  },
  general_outdoor: {
    name: 'General Outdoor Leisure',
    hindiName: 'सामान्य बाहर घूमना',
    exertionMultiplier: 1.0,
    ventilationConcern: false,
    childFocused: false,
  },
}

// Health sensitivities with risk multiplier and specific triggers
export const SENSITIVITY_PROFILES = {
  general: {
    name: 'General Adult (No known sensitivity)',
    hindiName: 'सामान्य वयस्क (कोई ज्ञात संवेदनशीलता नहीं)',
    riskMultiplier: 1.0,
    o3Sensitive: false,
    pm25Sensitive: false,
  },
  asthma: {
    name: 'Asthma / Respiratory Condition',
    hindiName: 'अस्थमा / सांस की बीमारी',
    riskMultiplier: 1.7,
    o3Sensitive: true, // Ground-level ozone triggers severe bronchospasm
    pm25Sensitive: true,
  },
  heart: {
    name: 'Heart Disease / Cardiovascular',
    hindiName: 'हृदय रोग / कार्डियोवैस्कुलर',
    riskMultiplier: 1.6,
    o3Sensitive: false,
    pm25Sensitive: true, // PM2.5 enters bloodstream triggering vascular inflammation
  },
  pregnancy: {
    name: 'Pregnancy',
    hindiName: 'गर्भावस्था',
    riskMultiplier: 1.5,
    o3Sensitive: false,
    pm25Sensitive: true,
  },
  elderly: {
    name: 'Elderly (65+)',
    hindiName: 'वरिष्ठ नागरिक (65+ वर्ष)',
    riskMultiplier: 1.5,
    o3Sensitive: true,
    pm25Sensitive: true,
  },
  child: {
    name: 'Child / Infant (<14)',
    hindiName: 'बच्चा / शिशु (<14 वर्ष)',
    riskMultiplier: 1.6,
    o3Sensitive: true,
    pm25Sensitive: true,
  },
}

/**
 * Evaluates the air quality situation deterministically.
 */
export function evaluateAirQuality({
  aqi = 50,
  pollutants = {},
  sensitivity = 'general',
  activity = 'general_outdoor',
  forecast = [],
} = {}) {
  const numAqi = Math.max(0, Math.round(Number(aqi) || 0))
  const act = ACTIVITY_PROFILES[activity] || ACTIVITY_PROFILES.general_outdoor
  const sens = SENSITIVITY_PROFILES[sensitivity] || SENSITIVITY_PROFILES.general

  const pm25 = Number(pollutants.pm2_5) || 0
  const pm10 = Number(pollutants.pm10) || 0
  const o3 = Number(pollutants.o3) || 0
  const no2 = Number(pollutants.no2) || 0

  const reasons = []
  const aqiInfo = getAqiCategory(numAqi)

  // Calculate effective risk score
  // Adjusted AQI considers both activity exertion and medical sensitivity
  const adjustedAqi = Math.round(numAqi * sens.riskMultiplier * act.exertionMultiplier)

  let verdict = 'GO'
  let riskLevel = 'low'
  let verdictTitle = 'Safe to Proceed'
  let verdictHindi = 'बाहर जाने के लिए सुरक्षित'

  // --- SPECIAL CASE: WINDOW VENTILATION ---
  if (act.ventilationConcern) {
    if (numAqi <= 50 && pm25 <= 15) {
      verdict = 'GO'
      riskLevel = 'low'
      verdictTitle = 'Safe to Ventilate'
      verdictHindi = 'खिड़कियां खोलना सुरक्षित है'
      reasons.push('Ambient outdoor air is clean and will improve indoor air circulation.')
    } else if (numAqi <= 90 && pm25 <= 30) {
      verdict = 'LIMIT'
      riskLevel = 'moderate'
      verdictTitle = 'Brief Airing Only'
      verdictHindi = 'केवल 10-15 मिनट के लिए वेंटिलेट करें'
      reasons.push('Air quality is borderline; limit cross-ventilation to 10–15 minutes, preferably during midday.')
    } else {
      verdict = 'AVOID'
      riskLevel = 'severe'
      verdictTitle = 'Keep Windows Closed'
      verdictHindi = 'खिड़कियां पूरी तरह बंद रखें'
      reasons.push(`Outdoor AQI is ${numAqi} with elevated particulate matter (${pm25} µg/m³ PM2.5). Opening windows will degrade indoor air.`)
      reasons.push('Use a HEPA air purifier inside if available.')
    }
  } else {
    // --- OUTDOOR ACTIVITIES ---

    // 1. Extreme Hazard Condition
    if (numAqi >= 300) {
      verdict = 'AVOID'
      riskLevel = 'severe'
      verdictTitle = 'Hazardous Exposure — Stay Indoors'
      verdictHindi = 'अत्यधिक खतरनाक स्तर — घर के अंदर रहें'
      reasons.push(`AQI ${numAqi} represents hazardous emergency conditions for all individuals.`)
    }
    // 2. Very Unhealthy Condition
    else if (numAqi >= 200) {
      verdict = 'AVOID'
      riskLevel = 'high'
      verdictTitle = 'Avoid Outdoor Exposure'
      verdictHindi = 'बाहर जाने से बचें'
      reasons.push(`AQI of ${numAqi} poses serious health risks for both sensitive groups and healthy adults.`)
    }
    // 3. Unhealthy Condition (AQI 151 - 200)
    else if (numAqi >= 151) {
      if (sensitivity !== 'general' || activity === 'running' || activity === 'outdoor_work') {
        verdict = 'AVOID'
        riskLevel = 'high'
        verdictTitle = 'Avoid Strenuous Outdoor Activity'
        verdictHindi = 'भारी शारीरिक गतिविधि से बचें'
        reasons.push(`Air quality is unhealthy (AQI ${numAqi}). ${sens.name} profile is vulnerable to airway inflammation.`)
      } else {
        verdict = 'LIMIT'
        riskLevel = 'moderate'
        verdictTitle = 'Limit Outdoor Exposure'
        verdictHindi = 'बाहरी समय को सीमित करें'
        reasons.push(`General public can handle short outdoor errands, but prolonged exposure should be avoided.`)
      }
    }
    // 4. Unhealthy for Sensitive Groups (AQI 101 - 150)
    else if (numAqi >= 101) {
      if (sensitivity !== 'general') {
        verdict = activity === 'running' ? 'AVOID' : 'LIMIT'
        riskLevel = 'moderate'
        verdictTitle = activity === 'running' ? 'Avoid Strenuous Outdoor Exercise' : 'Limit Outdoor Duration'
        verdictHindi = activity === 'running' ? 'दौड़ने या भारी व्यायाम से बचें' : 'बाहर का समय सीमित रखें'
        reasons.push(`AQI ${numAqi} exceeds the safe threshold for ${sens.name}.`)
      } else if (activity === 'running' || activity === 'outdoor_work') {
        verdict = 'LIMIT'
        riskLevel = 'moderate'
        verdictTitle = 'Reduce Exertion & Pace'
        verdictHindi = 'व्यायाम की तीव्रता और समय कम करें'
        reasons.push('Higher inhalation volume during cardio pulls particulate deeper into bronchial tubes.')
      } else {
        verdict = 'GO'
        riskLevel = 'low'
        verdictTitle = 'Generally Acceptable'
        verdictHindi = 'सामान्य तौर पर सुरक्षित'
        reasons.push('Acceptable for general public, though sensitive individuals should take precautions.')
      }
    }
    // 5. Moderate Air Quality (AQI 51 - 100)
    else if (numAqi >= 51) {
      if ((sensitivity === 'asthma' || sensitivity === 'child') && activity === 'running') {
        verdict = 'LIMIT'
        riskLevel = 'moderate'
        verdictTitle = 'Limit High-Intensity Cardio'
        verdictHindi = 'तीव्र दौड़ या खेल सीमित करें'
        reasons.push(`Even moderate AQI (${numAqi}) can provoke symptoms during high aerobic demand.`)
      } else {
        verdict = 'GO'
        riskLevel = 'low'
        verdictTitle = 'Good to Proceed'
        verdictHindi = 'बाहर जाना सुरक्षित है'
        reasons.push('Air quality is acceptable for most outdoor activities.')
      }
    }
    // 6. Good Air Quality (AQI <= 50)
    else {
      verdict = 'GO'
      riskLevel = 'low'
      verdictTitle = 'Optimal Air Quality — Enjoy Outdoors'
      verdictHindi = 'उत्कृष्ट वायु गुणवत्ता — आनंद लें'
      reasons.push('Pollution levels are well within WHO and EPA clean air standards.')
    }

    // Specific Pollutant Overrides
    if (sens.o3Sensitive && o3 >= 120) {
      reasons.push(`Elevated ground-level ozone (${Math.round(o3)} µg/m³) is a primary respiratory irritant for ${sens.name}.`)
      if (verdict === 'GO') {
        verdict = 'LIMIT'
        verdictTitle = 'Caution: Elevated Ozone Levels'
        verdictHindi = 'सावधानी: ओजोन स्तर बढ़ा हुआ है'
      }
    }
    if (pm25 >= 75) {
      reasons.push(`Fine particulate PM2.5 is significantly elevated (${Math.round(pm25)} µg/m³), surpassing 5x the WHO 24h recommended limit.`)
    }
  }

  // --- MASK RECOMMENDATION ---
  let maskRecommendation = {
    required: false,
    type: 'None',
    hindiType: 'मास्क की आवश्यकता नहीं',
    note: 'No respiratory protection needed in clean outdoor air.',
    hindiNote: 'साफ हवा में किसी मास्क की आवश्यकता नहीं है।',
  }

  if (numAqi >= 250) {
    maskRecommendation = {
      required: true,
      type: 'N95 / FFP2 / P100 Respirator',
      hindiType: 'N95 / FFP2 या उच्चतर मास्क आवश्यक',
      note: 'A well-fitted N95 or FFP2 respirator with tight seal is critical if stepping outside.',
      hindiNote: 'यदि बाहर निकलना अनिवार्य हो तो N95 या FFP2 मास्क अवश्य लगाएं।',
    }
  } else if (numAqi >= 150 || (numAqi >= 100 && sensitivity !== 'general')) {
    maskRecommendation = {
      required: true,
      type: 'N95 / FFP2',
      hindiType: 'N95 / FFP2 मास्क अनुशंसित',
      note: 'Cloth and simple surgical masks do not filter fine PM2.5. Use an N95 certified mask.',
      hindiNote: 'साधारण कपड़ा मास्क PM2.5 नहीं रोकता। N95 प्रमाणित मास्क का उपयोग करें।',
    }
  } else if (numAqi >= 100 && activity === 'commute') {
    maskRecommendation = {
      required: false,
      type: 'Surgical or N95 optional',
      hindiType: 'वैकल्पिक N95 मास्क',
      note: 'Roadside traffic exhaust contains elevated PM and NO2; mask advised on busy corridors.',
      hindiNote: 'सड़क के ट्रैफिक प्रदूषण से बचाव के लिए मास्क पहनना लाभकारी है।',
    }
  }

  // --- VENTILATION & PURIFIER ADVISORY ---
  let ventilationAdvisory = {
    openWindows: numAqi <= 60 && pm25 <= 20,
    action: numAqi <= 60 ? 'Open Windows for Fresh Air' : 'Keep Windows Closed & Run Purifier',
    hindiAction: numAqi <= 60 ? 'ताजी हवा के लिए खिड़कियां खोलें' : 'खिड़कियां बंद रखें और प्यूरीफायर चलाएं',
    details: numAqi <= 60
      ? 'Outdoor air is cleaner than typical indoor stale air; 30 minutes of natural ventilation recommended.'
      : 'Outdoor air pollution exceeds safe indoor thresholds. Keep windows closed and circulate indoor air through a HEPA filter.',
    hindiDetails: numAqi <= 60
      ? 'बाहरी हवा स्वच्छ है। 30 मिनट प्राकृतिक वेंटिलेशन की सलाह दी जाती है।'
      : 'बाहर का प्रदूषण अधिक है। खिड़कियां बंद रखें और HEPA एयर प्यूरीफायर का उपयोग करें।',
  }

  // --- BEST TIME WINDOW CALCULATION (from forecast) ---
  const bestTimeWindow = calculateBestTimeWindow(forecast, sensitivity, activity)

  return {
    verdict, // 'GO' | 'LIMIT' | 'AVOID'
    verdictTitle,
    verdictHindi,
    riskLevel, // 'low' | 'moderate' | 'high' | 'severe'
    aqi: numAqi,
    adjustedAqi,
    category: aqiInfo.category,
    color: aqiInfo.color,
    textColor: aqiInfo.textColor,
    bgColor: aqiInfo.bgColor,
    borderColor: aqiInfo.borderColor,
    reasons,
    maskRecommendation,
    ventilationAdvisory,
    bestTimeWindow,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Scans the next 24 hours of forecast to find the optimal window
 */
export function calculateBestTimeWindow(forecast = [], sensitivity = 'general', activity = 'running') {
  if (!Array.isArray(forecast) || forecast.length === 0) {
    return {
      hasRecommendation: false,
      start: null,
      end: null,
      bestAqi: null,
      advice: 'Forecast data unavailable to compute time window.',
      hindiAdvice: 'पूर्वानुमान डेटा उपलब्ध नहीं है।',
    }
  }

  // Filter for the next 24 forecast entries
  const upcoming = forecast.slice(0, 24)
  let lowestAqi = Infinity
  let bestHour = upcoming[0]

  upcoming.forEach((item) => {
    const val = Number(item.aqi) || Number(item.pm2_5) || 100
    if (val < lowestAqi) {
      lowestAqi = val
      bestHour = item
    }
  })

  if (!bestHour || !bestHour.time) {
    return {
      hasRecommendation: false,
      start: null,
      end: null,
      bestAqi: null,
      advice: 'Insufficient forecast data.',
      hindiAdvice: 'पर्याप्त डेटा उपलब्ध नहीं है।',
    }
  }

  const bestDate = new Date(bestHour.time)
  const hourNum = bestDate.getHours()
  const formatTime = (h) => {
    const ampm = h >= 12 ? 'PM' : 'AM'
    const disp = h % 12 === 0 ? 12 : h % 12
    return `${disp}:00 ${ampm}`
  }

  const windowStart = formatTime(hourNum)
  const windowEnd = formatTime((hourNum + 2) % 24)

  const isCurrentGood = lowestAqi <= 60
  const advice = `The lowest expected AQI today is ~${Math.round(lowestAqi)} around ${windowStart} – ${windowEnd}. Best opportunity for ${ACTIVITY_PROFILES[activity]?.name || 'outdoor activity'}.`
  const hindiAdvice = `आज का सबसे स्वच्छ समय ${windowStart} से ${windowEnd} के बीच (अनुमानित AQI ~${Math.round(lowestAqi)}) रहेगा।`

  return {
    hasRecommendation: true,
    start: windowStart,
    end: windowEnd,
    bestAqi: Math.round(lowestAqi),
    rawTime: bestHour.time,
    advice,
    hindiAdvice,
    isCurrentGood,
  }
}

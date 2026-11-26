/**
 * US EPA AQI & WHO standard pollutant calculation utilities.
 */

// Breakpoints for PM2.5 (µg/m³), PM10 (µg/m³), O3 (µg/m³), NO2 (µg/m³)
const PM25_BREAKPOINTS = [
  { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
]

const PM10_BREAKPOINTS = [
  { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
  { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
  { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
  { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
  { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
  { cLow: 425, cHigh: 604, iLow: 301, iHigh: 500 },
]

/**
 * Linear interpolation to calculate sub-index for a concentration
 */
function calculateSubIndex(concentration, breakpoints) {
  if (concentration === null || concentration === undefined || isNaN(concentration) || concentration < 0) {
    return 0
  }
  for (const bp of breakpoints) {
    if (concentration >= bp.cLow && concentration <= bp.cHigh) {
      return Math.round(
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (concentration - bp.cLow) + bp.iLow
      )
    }
  }
  // Exceeding max breakpoint
  const last = breakpoints[breakpoints.length - 1]
  if (concentration > last.cHigh) {
    return 500
  }
  return 0
}

export function calculateAqiFromPollutants(pollutants = {}) {
  const safe = pollutants || {}
  const pm25Sub = calculateSubIndex(safe.pm2_5, PM25_BREAKPOINTS)
  const pm10Sub = calculateSubIndex(safe.pm10, PM10_BREAKPOINTS)
  
  // If provided directly via API, use max of calculated or provided
  const directAqi = Number(safe.aqi) || 0
  return Math.max(pm25Sub, pm10Sub, directAqi)
}

export function getAqiCategory(aqi) {
  const val = Math.round(Number(aqi) || 0)
  if (val <= 50) {
    return {
      category: 'Good',
      level: 1,
      color: '#10B981', // Emerald
      textColor: 'text-emerald-700 dark:text-emerald-300',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-300 dark:border-emerald-700',
      description: 'Air quality is satisfactory and poses little or no health risk.',
      hindiDesc: 'हवा की गुणवत्ता संतोषजनक है और स्वास्थ्य के लिए कोई खतरा नहीं है।',
    }
  }
  if (val <= 100) {
    return {
      category: 'Moderate',
      level: 2,
      color: '#F59E0B', // Amber
      textColor: 'text-amber-700 dark:text-amber-300',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: 'border-amber-300 dark:border-amber-700',
      description: 'Air quality is acceptable; however, some pollutants may affect unusually sensitive individuals.',
      hindiDesc: 'हवा मध्यम है; बहुत संवेदनशील लोगों को हल्की परेशानी हो सकती है।',
    }
  }
  if (val <= 150) {
    return {
      category: 'Unhealthy for Sensitive Groups',
      level: 3,
      color: '#F97316', // Orange
      textColor: 'text-orange-700 dark:text-orange-300',
      bgColor: 'bg-orange-50 dark:bg-orange-950/40',
      borderColor: 'border-orange-300 dark:border-orange-700',
      description: 'Members of sensitive groups may experience health effects. General public is less likely to be affected.',
      hindiDesc: 'संवेदनशील समूहों (अस्थमा, बच्चे, बुजुर्ग) के स्वास्थ्य पर असर पड़ सकता है।',
    }
  }
  if (val <= 200) {
    return {
      category: 'Unhealthy',
      level: 4,
      color: '#EF4444', // Red
      textColor: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-50 dark:bg-red-950/40',
      borderColor: 'border-red-300 dark:border-red-700',
      description: 'Everyone may begin to experience health effects; sensitive groups may experience more serious effects.',
      hindiDesc: 'हवा अस्वास्थ्यकर है। हर किसी को स्वास्थ्य समस्या महसूस हो सकती है।',
    }
  }
  if (val <= 300) {
    return {
      category: 'Very Unhealthy',
      level: 5,
      color: '#8B5CF6', // Purple
      textColor: 'text-purple-700 dark:text-purple-300',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40',
      borderColor: 'border-purple-300 dark:border-purple-700',
      description: 'Health alert: The risk of health effects is increased for everyone.',
      hindiDesc: 'स्वास्थ्य चेतावनी: सभी के लिए गंभीर स्वास्थ्य जोखिम।',
    }
  }
  return {
    category: 'Hazardous',
    level: 6,
    color: '#881337', // Deep Maroon/Rose 900
    textColor: 'text-rose-900 dark:text-rose-200',
    bgColor: 'bg-rose-100 dark:bg-rose-950/60',
    borderColor: 'border-rose-400 dark:border-rose-800',
    description: 'Health warning of emergency conditions: everyone is more likely to be affected.',
    hindiDesc: 'आपातकालीन स्तर: सभी को तुरंत बाहर जाने से बचना चाहिए।',
  }
}

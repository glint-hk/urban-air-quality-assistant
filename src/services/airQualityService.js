/**
 * Air Quality and Geocoding Service.
 * Default provider: Open-Meteo Air Quality & Geocoding API (Free, global, no API key required).
 * Includes resilient fallbacks and coordinates caching.
 */

import { calculateAqiFromPollutants } from '../engine/aqiCalculators.js'

// Predefined major urban centers for instant quick-selection
export const POPULAR_CITIES = [
  { name: 'Delhi', state: 'Delhi', country: 'India', lat: 28.6139, lon: 77.2090 },
  { name: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.0760, lon: 72.8777 },
  { name: 'Bengaluru', state: 'Karnataka', country: 'India', lat: 12.9716, lon: 77.5946 },
  { name: 'Kolkata', state: 'West Bengal', country: 'India', lat: 22.5726, lon: 88.3639 },
  { name: 'London', state: 'England', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', state: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060 },
  { name: 'Los Angeles', state: 'California', country: 'United States', lat: 34.0522, lon: -118.2437 },
]

/**
 * Searches locations using Open-Meteo Geocoding API
 */
export async function searchLocations(query) {
  if (!query || query.trim().length < 2) return []

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Geocoding request failed')
    const data = await res.json()

    if (!data.results || !Array.isArray(data.results)) {
      return []
    }

    return data.results.map((r) => ({
      name: r.name,
      state: r.admin1 || '',
      country: r.country || '',
      countryCode: r.country_code || '',
      lat: r.latitude,
      lon: r.longitude,
      display: `${r.name}${r.admin1 ? `, ${r.admin1}` : ''}, ${r.country || ''}`,
    }))
  } catch (err) {
    console.warn('Geocoding fetch failed, falling back to local matches:', err)
    // Local filter fallback
    const q = query.toLowerCase()
    return POPULAR_CITIES.filter((c) =>
      c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    ).map((c) => ({
      ...c,
      display: `${c.name}, ${c.country}`,
    }))
  }
}

/**
 * Fetches real-time air quality and 24h hourly forecast
 */
export async function fetchAirQualityData(lat, lon) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi,pm10,pm2_5,ozone,nitrogen_dioxide&forecast_days=2&timezone=auto`
    
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`Open-Meteo API returned status ${res.status}`)
    const data = await res.json()

    const current = data.current || {}
    const hourly = data.hourly || {}

    // Extract current pollutant metrics
    const pm2_5 = current.pm2_5 ?? 0
    const pm10 = current.pm10 ?? 0
    const o3 = current.ozone ?? 0
    const no2 = current.nitrogen_dioxide ?? 0
    const so2 = current.sulphur_dioxide ?? 0
    const co = current.carbon_monoxide ? (current.carbon_monoxide / 1000).toFixed(2) : 0 // mg/m³

    // Calculate AQI or use reported US AQI
    const rawAqi = current.us_aqi ?? calculateAqiFromPollutants({ pm2_5, pm10 })

    // Process hourly forecast for the next 24 hours
    const forecast = []
    if (hourly.time && Array.isArray(hourly.time)) {
      const nowIso = new Date().toISOString()
      // find nearest hour index
      let startIndex = 0
      for (let i = 0; i < hourly.time.length; i++) {
        if (hourly.time[i] >= nowIso.slice(0, 13)) {
          startIndex = i
          break
        }
      }

      for (let i = startIndex; i < Math.min(startIndex + 24, hourly.time.length); i++) {
        const hTime = hourly.time[i]
        const hAqi = hourly.us_aqi?.[i] ?? calculateAqiFromPollutants({
          pm2_5: hourly.pm2_5?.[i],
          pm10: hourly.pm10?.[i],
        })
        forecast.push({
          time: hTime,
          aqi: Math.round(hAqi),
          pm2_5: hourly.pm2_5?.[i] ?? 0,
          pm10: hourly.pm10?.[i] ?? 0,
          o3: hourly.ozone?.[i] ?? 0,
          no2: hourly.nitrogen_dioxide?.[i] ?? 0,
        })
      }
    }

    return {
      aqi: Math.round(rawAqi),
      pollutants: {
        pm2_5: Math.round(pm2_5 * 10) / 10,
        pm10: Math.round(pm10 * 10) / 10,
        o3: Math.round(o3 * 10) / 10,
        no2: Math.round(no2 * 10) / 10,
        so2: Math.round(so2 * 10) / 10,
        co: Number(co),
      },
      forecast,
      provider: 'Open-Meteo Worldwide Air Quality',
      updatedAt: current.time || new Date().toISOString(),
    }
  } catch (err) {
    console.error('Failed to fetch live air quality data:', err)
    // Fallback simulated data for high resilience
    return generateFallbackAirQualityData()
  }
}

/**
 * Resilient fallback generator in case network is disconnected
 */
function generateFallbackAirQualityData() {
  const baseAqi = 112
  const now = new Date()
  const forecast = []

  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getTime() + i * 3600 * 1000)
    // Diurnal cycle: cleaner afternoon, dirtier night/morning
    const hour = d.getHours()
    const variance = (hour >= 13 && hour <= 16) ? -40 : (hour >= 6 && hour <= 9) ? 35 : 0
    const aqi = Math.max(30, Math.min(220, baseAqi + variance))
    forecast.push({
      time: d.toISOString(),
      aqi,
      pm2_5: Math.round(aqi * 0.45),
      pm10: Math.round(aqi * 0.8),
      o3: 45,
      no2: 30,
    })
  }

  return {
    aqi: baseAqi,
    pollutants: {
      pm2_5: 42.5,
      pm10: 88.0,
      o3: 45.0,
      no2: 32.0,
      so2: 12.0,
      co: 0.8,
    },
    forecast,
    provider: 'Simulated Air Quality (Offline Mode)',
    updatedAt: now.toISOString(),
  }
}

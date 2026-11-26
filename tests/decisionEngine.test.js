import { describe, it, expect } from 'vitest'
import { evaluateAirQuality, calculateBestTimeWindow } from '../src/engine/decisionEngine.js'

describe('Decision Engine - Rule-based Logical Advisory', () => {
  it('returns GO for general adult with low AQI', () => {
    const result = evaluateAirQuality({
      aqi: 25,
      pollutants: { pm2_5: 6, pm10: 15, o3: 20, no2: 10 },
      sensitivity: 'general',
      activity: 'running',
    })

    expect(result.verdict).toBe('GO')
    expect(result.riskLevel).toBe('low')
    expect(result.maskRecommendation.required).toBe(false)
    expect(result.ventilationAdvisory.openWindows).toBe(true)
  })

  it('advises LIMIT or AVOID for asthma patients at moderate AQI during vigorous running', () => {
    const result = evaluateAirQuality({
      aqi: 75,
      pollutants: { pm2_5: 24, pm10: 45, o3: 50 },
      sensitivity: 'asthma',
      activity: 'running',
    })

    expect(result.verdict).toBe('LIMIT')
    expect(result.riskLevel).toBe('moderate')
    expect(result.reasons.some((r) => r.includes('moderate AQI'))).toBe(true)
  })

  it('recommends N95 mask when AQI exceeds unhealthy threshold (150+)', () => {
    const result = evaluateAirQuality({
      aqi: 165,
      pollutants: { pm2_5: 85, pm10: 120 },
      sensitivity: 'general',
      activity: 'commute',
    })

    expect(result.maskRecommendation.required).toBe(true)
    expect(result.maskRecommendation.type).toContain('N95')
  })

  it('recommends AVOID and keeping windows closed during severe pollution', () => {
    const result = evaluateAirQuality({
      aqi: 280,
      pollutants: { pm2_5: 230, pm10: 310 },
      sensitivity: 'child',
      activity: 'child_play',
    })

    expect(result.verdict).toBe('AVOID')
    expect(result.riskLevel).toBe('high')
    expect(result.ventilationAdvisory.openWindows).toBe(false)
    expect(result.ventilationAdvisory.action).toContain('Keep Windows Closed')
  })

  it('correctly handles window ventilation activity', () => {
    // When air is dirty, ventilate verdict should be AVOID
    const dirtyAir = evaluateAirQuality({
      aqi: 140,
      pollutants: { pm2_5: 55 },
      activity: 'ventilation',
    })
    expect(dirtyAir.verdict).toBe('AVOID')
    expect(dirtyAir.verdictTitle).toBe('Keep Windows Closed')

    // When air is clean, ventilate verdict should be GO
    const cleanAir = evaluateAirQuality({
      aqi: 30,
      pollutants: { pm2_5: 8 },
      activity: 'ventilation',
    })
    expect(cleanAir.verdict).toBe('GO')
    expect(cleanAir.verdictTitle).toBe('Safe to Ventilate')
  })

  it('computes the best time window from the 24-hour forecast', () => {
    const mockForecast = [
      { time: '2026-11-26T08:00:00Z', aqi: 180, pm2_5: 110 },
      { time: '2026-11-26T09:00:00Z', aqi: 150, pm2_5: 90 },
      { time: '2026-11-26T14:00:00Z', aqi: 45, pm2_5: 12 }, // cleanest window
      { time: '2026-11-26T18:00:00Z', aqi: 160, pm2_5: 95 },
    ]

    const window = calculateBestTimeWindow(mockForecast, 'general', 'running')
    expect(window.hasRecommendation).toBe(true)
    expect(window.bestAqi).toBe(45)
    expect(window.advice).toContain('lowest expected AQI')
  })
})

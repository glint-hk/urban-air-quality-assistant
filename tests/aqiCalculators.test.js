import { describe, it, expect } from 'vitest'
import { calculateAqiFromPollutants, getAqiCategory } from '../src/engine/aqiCalculators.js'

describe('AQI Calculators', () => {
  it('correctly maps standard AQI value to category and accessibility colors', () => {
    const good = getAqiCategory(35)
    expect(good.category).toBe('Good')
    expect(good.level).toBe(1)
    expect(good.color).toBe('#10B981')

    const moderate = getAqiCategory(85)
    expect(moderate.category).toBe('Moderate')
    expect(moderate.level).toBe(2)

    const unhealthySensitive = getAqiCategory(125)
    expect(unhealthySensitive.category).toBe('Unhealthy for Sensitive Groups')
    expect(unhealthySensitive.level).toBe(3)

    const unhealthy = getAqiCategory(175)
    expect(unhealthy.category).toBe('Unhealthy')
    expect(unhealthy.level).toBe(4)

    const veryUnhealthy = getAqiCategory(250)
    expect(veryUnhealthy.category).toBe('Very Unhealthy')
    expect(veryUnhealthy.level).toBe(5)

    const hazardous = getAqiCategory(420)
    expect(hazardous.category).toBe('Hazardous')
    expect(hazardous.level).toBe(6)
  })

  it('calculates AQI sub-index from PM2.5 and PM10 concentrations', () => {
    // PM2.5 of 10.0 µg/m³ is in Good (0-50 range)
    const aqi1 = calculateAqiFromPollutants({ pm2_5: 10 })
    expect(aqi1).toBeGreaterThanOrEqual(0)
    expect(aqi1).toBeLessThanOrEqual(50)

    // PM2.5 of 60.0 µg/m³ is in Unhealthy (151-200 range)
    const aqi2 = calculateAqiFromPollutants({ pm2_5: 60 })
    expect(aqi2).toBeGreaterThanOrEqual(151)
    expect(aqi2).toBeLessThanOrEqual(200)

    // PM2.5 of 300.0 µg/m³ is Hazardous (301-500)
    const aqi3 = calculateAqiFromPollutants({ pm2_5: 300 })
    expect(aqi3).toBeGreaterThan(300)
  })

  it('handles empty, null, or extreme values gracefully', () => {
    expect(calculateAqiFromPollutants({})).toBe(0)
    expect(calculateAqiFromPollutants(null)).toBe(0)
    expect(calculateAqiFromPollutants({ pm2_5: -10 })).toBe(0)
    expect(calculateAqiFromPollutants({ pm2_5: 1000 })).toBe(500)
  })
})

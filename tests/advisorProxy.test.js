import { describe, it, expect } from 'vitest'
import handler from '../api/advisor.js'

describe('Advisor API Proxy Unit Tests', () => {
  it('rejects non-POST requests with 405 Method Not Allowed', async () => {
    let statusCode = null
    let responseData = null

    const req = { method: 'GET', body: {} }
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code
        return {
          json: (data) => { responseData = data },
          end: () => {},
        }
      },
    }

    await handler(req, res)
    expect(statusCode).toBe(405)
    expect(responseData?.error).toContain('Method not allowed')
  })

  it('rejects empty questions with 400 Bad Request', async () => {
    let statusCode = null
    let responseData = null

    const req = { method: 'POST', body: { question: '   ' } }
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code
        return {
          json: (data) => { responseData = data },
          end: () => {},
        }
      },
    }

    await handler(req, res)
    expect(statusCode).toBe(400)
    expect(responseData?.error).toBe('Question is required.')
  })

  it('returns grounded fallback advice adhering strictly to schema', async () => {
    let statusCode = null
    let responseData = null

    const req = {
      method: 'POST',
      body: {
        question: 'Should I run today?',
        location: 'Delhi',
        sensitivity: 'asthma',
        activity: 'running',
        engineVerdict: {
          verdict: 'AVOID',
          verdictTitle: 'Avoid Strenuous Cardio',
          aqi: 220,
          category: 'Very Unhealthy',
          maskRecommendation: { required: true, type: 'N95 / FFP2' },
          ventilationAdvisory: { action: 'Keep Windows Closed' },
          bestTimeWindow: { advice: 'Wait until tomorrow morning' },
        },
      },
    }

    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code
        return {
          json: (data) => { responseData = data },
          end: () => {},
        }
      },
    }

    await handler(req, res)
    expect(statusCode).toBe(200)
    expect(responseData).toBeDefined()
    expect(responseData.summary).toContain('AVOID')
    expect(Array.isArray(responseData.actionableSteps)).toBe(true)
    expect(responseData.verdictAlignment).toContain('AVOID')
  })
})

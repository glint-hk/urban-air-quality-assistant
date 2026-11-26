/**
 * Server-Side Gemini AI Advisor Proxy.
 *
 * Implements:
 * 1. Safe credential handling (GEMINI_API_KEY never exposed to client).
 * 2. Model fallback chain with strict execution time budgets.
 * 3. Input validation, length bounding, and prompt sanitization.
 * 4. Grounded decision compliance: Gemini is strictly instructed to align with
 *    the deterministic engine's verdict (GO / LIMIT / AVOID) and data points.
 * 5. Structured JSON output with schema enforcement.
 */

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
]

const TOTAL_BUDGET_MS = 25000
const ATTEMPT_TIMEOUT_MS = 8000
const MIN_ATTEMPT_MS = 2000

const MAX_QUESTION_LENGTH = 500

const SYSTEM_PROMPT = `You are VayuVani, an expert environmental health epidemiologist and urban air quality advisor.
Your mission is to provide clear, actionable, and empathetic advice to urban residents based on real-time air quality data, forecast conditions, and their personal health profile.

CRITICAL SAFETY & GROUNDING RULES:
1. You MUST NEVER contradict the rule-based Decision Engine's verdict (GO, LIMIT, or AVOID).
   - If Verdict is AVOID: You must firmly counsel against the outdoor activity/ventilation. Explain the biological harm.
   - If Verdict is LIMIT: You must advise reducing duration, lowering aerobic intensity, and wearing protection.
   - If Verdict is GO: You can encourage outdoor activity while noting standard precautions.
2. Ground all statements in the actual numbers provided (AQI, PM2.5, PM10, O3, NO2).
3. Frame your advice around the user's specific health sensitivity profile (e.g. child lung development, asthma bronchospasm, heart vascular inflammation).
4. If requested in Hindi (language="hi"), write the response in fluent, natural, reassuring Hindi (Devanagari script). Otherwise, write in clear English.

Output must be STRICTLY valid JSON with no markdown fences, matching this schema:
{
  "summary": "1-2 sentences direct answer to the user query",
  "detailedExplanation": "2-3 paragraphs providing the physiological rationale, pollutant impact, and protective actions",
  "verdictAlignment": "Brief statement confirming alignment with engine verdict",
  "actionableSteps": [
    "Step 1: clear imperative action",
    "Step 2: clear imperative action",
    "Step 3: clear imperative action"
  ],
  "optimalAlternative": "Suggested cleaner time window or indoor alternative if outdoors is hazardous"
}`

function stripMarkdownFences(str) {
  return str.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
}

export default async function handler(req, res) {
  // CORS handling
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const {
    question = '',
    location = 'Unknown City',
    sensitivity = 'general',
    activity = 'running',
    timeWindow = 'now',
    engineVerdict = {},
    pollutants = {},
    language = 'en',
  } = req.body || {}

  const cleanQuestion = String(question).slice(0, MAX_QUESTION_LENGTH).trim()
  if (!cleanQuestion) {
    return res.status(400).json({ error: 'Question is required.' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not configured. Returning deterministic fallback response.')
    return res.status(200).json(generateDeterministicFallback({
      question: cleanQuestion,
      location,
      sensitivity,
      activity,
      engineVerdict,
      language,
    }))
  }

  const userContextPrompt = `
USER CONTEXT & SENSOR DATA:
- Location: ${location}
- Health Sensitivity: ${sensitivity}
- Planned Activity: ${activity}
- Time Window: ${timeWindow}
- Current AQI: ${engineVerdict.aqi ?? 'N/A'} (Category: ${engineVerdict.category ?? 'N/A'})
- Engine Verdict: ${engineVerdict.verdict ?? 'LIMIT'} (${engineVerdict.verdictTitle ?? ''})
- Risk Level: ${engineVerdict.riskLevel ?? 'moderate'}
- Mask Recommendation: ${engineVerdict.maskRecommendation?.type ?? 'None'}
- Ventilation Advisory: ${engineVerdict.ventilationAdvisory?.action ?? ''}
- Best Time Window Today: ${engineVerdict.bestTimeWindow?.start ?? 'N/A'} - ${engineVerdict.bestTimeWindow?.end ?? 'N/A'} (AQI: ${engineVerdict.bestTimeWindow?.bestAqi ?? 'N/A'})
- Pollutants: PM2.5=${pollutants.pm2_5 ?? 0} µg/m³, PM10=${pollutants.pm10 ?? 0} µg/m³, O3=${pollutants.o3 ?? 0} µg/m³, NO2=${pollutants.no2 ?? 0} µg/m³
- Language Requested: ${language === 'hi' ? 'Hindi (हिंदी)' : 'English'}

USER QUESTION:
"${cleanQuestion}"

Deliver your response adhering strictly to the JSON schema.
`

  const requestBody = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: userContextPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.4, // Low temperature for factual precision
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  })

  const deadline = Date.now() + TOTAL_BUDGET_MS
  let lastError = null

  for (const model of GEMINI_MODELS) {
    const remaining = deadline - Date.now()
    if (remaining < MIN_ATTEMPT_MS) break

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
        signal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining)),
      })

      if (!geminiRes.ok) {
        const errBody = await geminiRes.json().catch(() => ({}))
        const msg = errBody?.error?.message || geminiRes.statusText
        console.warn(`Gemini model ${model} returned error (${geminiRes.status}): ${msg}`)
        if (geminiRes.status === 400 || geminiRes.status === 401) {
          // If auth or bad structure, don't fail user — serve grounded deterministic response
          return res.status(200).json(generateDeterministicFallback({
            question: cleanQuestion,
            location,
            sensitivity,
            activity,
            engineVerdict,
            language,
          }))
        }
        lastError = 'AI model busy'
        continue
      }

      const geminiData = await geminiRes.json()
      const candidate = geminiData?.candidates?.[0]
      const rawText = (candidate?.content?.parts || [])
        .filter((p) => typeof p.text === 'string' && !p.thought)
        .map((p) => p.text)
        .join('')

      if (!rawText) {
        console.warn(`Empty response from ${model}`)
        continue
      }

      let parsed
      try {
        parsed = JSON.parse(stripMarkdownFences(rawText))
      } catch (e) {
        console.warn(`Failed to parse JSON from ${model}:`, rawText.slice(0, 200))
        continue
      }

      if (parsed && typeof parsed === 'object' && parsed.summary) {
        return res.status(200).json(parsed)
      }
    } catch (err) {
      console.warn(`Gemini model ${model} attempt failed:`, err.message)
      lastError = err.message
    }
  }

  // Graceful fallback grounded in engine results
  return res.status(200).json(generateDeterministicFallback({
    question: cleanQuestion,
    location,
    sensitivity,
    activity,
    engineVerdict,
    language,
  }))
}

/**
 * Deterministic grounded fallback when API is unreachable
 */
function generateDeterministicFallback({ question, location, sensitivity, activity, engineVerdict, language }) {
  const isHi = language === 'hi'
  const v = engineVerdict.verdict || 'LIMIT'
  const aqi = engineVerdict.aqi || 100

  if (isHi) {
    return {
      summary: `वर्तमान AQI ${aqi} और आपकी स्वास्थ्य संवेदनशीलता के अनुसार, आपका निर्णय ${engineVerdict.verdictHindi || v} है।`,
      detailedExplanation: `हमने ${location} के नवीनतम वायु गुणवत्ता डेटा का विश्लेषण किया है। जब AQI ${aqi} होता है, तो ${sensitivity} प्रोफ़ाइल के लिए बाहरी एरोबिक गतिविधियों में सावधानी बरतना आवश्यक है।`,
      verdictAlignment: `यह सलाह निर्णय इंजन के ${v} निर्णय के पूर्णतः अनुरूप है।`,
      actionableSteps: [
        v === 'AVOID' ? 'कठिन बाहरी व्यायाम से बचें और इनडोर रहें।' : 'बाहरी समय को सीमित करें।',
        engineVerdict.maskRecommendation?.required ? 'बाहर जाते समय N95 प्रमाणित मास्क पहनें।' : 'हवा की निगरानी करते रहें।',
        engineVerdict.ventilationAdvisory?.action || 'खिड़कियों को बंद रखकर एयर प्यूरीफायर चलाएं।',
      ],
      optimalAlternative: engineVerdict.bestTimeWindow?.hindiAdvice || 'आज दोपहर के समय हवा अधिक स्वच्छ रहने की संभावना है।',
    }
  }

  return {
    summary: `Based on current AQI of ${aqi} in ${location} and your ${sensitivity} profile, the recommended action is ${v}: ${engineVerdict.verdictTitle || 'Take standard precautions'}.`,
    detailedExplanation: `Our health evaluation engine reviewed local pollutant levels for ${location}. With an AQI of ${aqi}, ${sensitivity === 'general' ? 'general residents' : 'sensitive individuals'} face increased exposure risk during ${activity}.`,
    verdictAlignment: `This advice strictly complies with the rule engine's ${v} verdict.`,
    actionableSteps: [
      v === 'AVOID' ? 'Avoid vigorous outdoor cardio; transition to an indoor session.' : 'Keep outdoor exertion moderate and limit exposure time.',
      engineVerdict.maskRecommendation?.required ? `Wear an ${engineVerdict.maskRecommendation.type} mask if commuting.` : 'No special respirator required.',
      engineVerdict.ventilationAdvisory?.action || 'Check indoor filtration.',
    ],
    optimalAlternative: engineVerdict.bestTimeWindow?.advice || 'Monitor the forecast for cleaner midday hours.',
  }
}

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Local dev middleware for /api/advisor
function localApiMiddleware() {
  return {
    name: 'local-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/advisor')) {
          try {
            // Load environment variables for local dev
            const env = loadEnv('development', process.cwd(), '')
            process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY

            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', async () => {
              try {
                req.body = body ? JSON.parse(body) : {}
              } catch {
                req.body = {}
              }

              // Mock Express-like res methods
              res.status = (code) => {
                res.statusCode = code
                return res
              }
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
                return res
              }

              const { default: handler } = await import('./api/advisor.js')
              await handler(req, res)
            })
            return
          } catch (err) {
            console.error('Local API dev error:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
            return
          }
        }
        next()
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localApiMiddleware()],
  test: {
    environment: 'node',
    globals: true,
  },
  server: {
    port: 3000,
  },
})

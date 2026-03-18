import express from 'express'
import request from 'supertest'
import githubRouter from '../src/hosts/github'

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

const createApp = () => {
  const app = express()
  app.use('/github', githubRouter)

  // Route for / - returns URL lists specified in HOSTS env var
  app.get('/', async (_req, res) => {
    try {
      const lists = process.env.HOSTS
      if (!lists) {
        return res.status(400).send('HOSTS environment variable not set')
      }
      const paths = lists
        .split(',')
        .map((path) => path.trim().replace(/^\/+|\/+$/g, ''))
      const baseUrl = `http://localhost:3000`
      const allValues = []
      for (const path of paths) {
        try {
          const response = await fetch(`${baseUrl}/${path}`)
          if (response.ok) {
            const text = await response.text()
            const lines = text.split('\n').filter((line) => line.trim())
            allValues.push(...lines)
          }
        } catch (error) {
          console.error(`Error fetching ${path}:`, error)
        }
      }
      const result = allValues.join('\n')
      res.type('text/plain').send(result)
    } catch (error) {
      console.error('Error:', error)
      res.status(500).send('Internal server error')
    }
  })

  return app
}

describe('Server Routes', () => {
  let app: express.Application

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    app = createApp()
  })

  describe('GET /', () => {
    it('should return 400 when HOSTS is not set', async () => {
      delete process.env.HOSTS

      const response = await request(app).get('/').expect(400)

      expect(response.text).toBe('HOSTS environment variable not set')
    })

    it('should fetch and combine data from specified paths', async () => {
      process.env.HOSTS = '/github/hooks,/github/web'

      // Mock the fetch calls for /github/hooks and /github/web
      const _mockData = {
        hooks: ['192.30.252.0/22', '185.199.108.0/22'],
        web: ['140.82.112.0/20'],
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '192.30.252.0/22\n185.199.108.0/22',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '140.82.112.0/20',
        })

      const response = await request(app).get('/').expect(200)

      expect(response.type).toBe('text/plain')
      expect(response.text).toBe(
        '192.30.252.0/22\n185.199.108.0/22\n140.82.112.0/20',
      )

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/github/hooks',
      )
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/github/web',
      )
    })

    it('should handle optional leading/trailing slashes in HOSTS', async () => {
      process.env.HOSTS = ' /github/hooks/, /github/web/ '

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '192.30.252.0/22',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '140.82.112.0/20',
        })

      const _response = await request(app).get('/').expect(200)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/github/hooks',
      )
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/github/web',
      )
    })

    it('should handle fetch errors gracefully', async () => {
      process.env.HOSTS = '/github/hooks,/github/invalid'

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '192.30.252.0/22',
        })
        .mockRejectedValueOnce(new Error('Network error'))

      const response = await request(app).get('/').expect(200)

      expect(response.text).toBe('192.30.252.0/22')
    })

    it('should handle non-ok responses gracefully', async () => {
      process.env.HOSTS = '/github/hooks,/github/invalid'

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '192.30.252.0/22',
        })
        .mockResolvedValueOnce({
          ok: false,
        })

      const response = await request(app).get('/').expect(200)

      expect(response.text).toBe('192.30.252.0/22')
    })
  })
})

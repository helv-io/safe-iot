import express from 'express'
import request from 'supertest'
import githubRouter from '../src/hosts/github'

const app = express()
app.use('/github', githubRouter)

describe('GitHub Routes', () => {
  const isIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true'

  if (!isIntegrationTest) {
    describe('Unit Tests', () => {
      beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(console, 'error').mockImplementation(() => {})

        // Mock fetch for unit tests
        global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>
      })

      describe('GET /github/:subpath', () => {
        it('should return array values for valid subpath', async () => {
          const mockData = {
            hooks: ['192.30.252.0/22', '185.199.108.0/22'],
            web: ['140.82.112.0/20'],
          }

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app).get('/github/hooks').expect(200)

          expect(response.type).toBe('text/plain')
          expect(response.text).toBe('192.30.252.0/22\n185.199.108.0/22')
          expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/meta')
        })

        it('should return 400 for invalid subpath', async () => {
          const mockData = {
            hooks: ['192.30.252.0/22'],
          }

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app).get('/github/invalid').expect(400)

          expect(response.text).toBe('Invalid subpath or not an array')
        })

        it('should handle API errors', async () => {
          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
          })

          const response = await request(app).get('/github/hooks').expect(500)

          expect(response.text).toBe('Internal server error')
        })
      })

      describe('GET /github (subpathless)', () => {
        it('should return only valid IPv4 and IPv6 subnets', async () => {
          const mockData = {
            verifiable_password_authentication: true,
            ssh_key_fingerprints: {},
            ssh_keys: ['ssh-key'],
            domains: ['github.com'],
            hooks: ['192.30.252.0/22', '185.199.108.0/22'],
            web: ['140.82.112.0/20', '143.55.64.0/20'],
            api: ['2a0a:a440::/29', '2606:50c0::/32'],
            git: ['20.201.28.148/32'],
            packages: ['invalid-subnet', '192.168.1.1/24'],
          }

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app).get('/github').expect(200)

          expect(response.type).toBe('text/plain')
          const lines = response.text.split('\n').filter((line) => line.trim())

          // Check that all lines are valid subnets
          const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
          const ipv6Regex = /^([0-9a-fA-F:]+)\/\d{1,3}$/

          lines.forEach((line) => {
            expect(ipv4Regex.test(line) || ipv6Regex.test(line)).toBe(true)
          })

          // Check specific expected values
          expect(lines).toContain('192.30.252.0/22')
          expect(lines).toContain('185.199.108.0/22')
          expect(lines).toContain('140.82.112.0/20')
          expect(lines).toContain('143.55.64.0/20')
          expect(lines).toContain('2a0a:a440::/29')
          expect(lines).toContain('2606:50c0::/32')
          expect(lines).toContain('20.201.28.148/32')

          // Ensure excluded keys are not present and invalid subnets are filtered
          expect(lines).not.toContain('invalid-subnet')
          expect(lines).toContain('192.168.1.1/24')
        })

        it('should handle API errors', async () => {
          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
          })

          const response = await request(app).get('/github').expect(500)

          expect(response.text).toBe('Internal server error')
        })
      })
    })
  }

  describe('Integration Test - Live GitHub API', () => {
    ;(isIntegrationTest ? it : it.skip)(
      'should validate real GitHub API data contains only valid subnets',
      async () => {
        const response = await request(app)
          .get('/github')
          .timeout(10000) // 10 second timeout for API call

        expect(response.status).toBe(200)
        expect(response.type).toBe('text/plain')

        const lines = response.text.split('\n').filter((line) => line.trim())

        // Validate that all returned lines are valid IPv4 or IPv6 subnets
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
        const ipv6Regex = /^([0-9a-fA-F:]+)\/\d{1,3}$/

        lines.forEach((line, index) => {
          const isValid = ipv4Regex.test(line) || ipv6Regex.test(line)
          if (!isValid) {
            throw new Error(`Line ${index + 1} is not a valid subnet: "${line}"`)
          }
        })

        // Ensure we got some data
        expect(lines.length).toBeGreaterThan(0)
      },
      15000, // 15 second timeout
    )
  })
})

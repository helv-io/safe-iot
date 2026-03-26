import express from 'express'
import request from 'supertest'
import googleRouter from '../src/hosts/google'

const app = express()
app.use('/google', googleRouter)

describe('Google Cloud Routes', () => {
  const isIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true'

  if (!isIntegrationTest) {
    describe('Unit Tests', () => {
      beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(console, 'error').mockImplementation(() => {})

        // Mock fetch for unit tests
        global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>
      })

      describe('GET /google (all scopes)', () => {
        it('should return all Google Cloud IP subnets across all regions', async () => {
          const mockData = {
            syncToken: '1774534680611',
            creationTime: '2026-03-26T07:18:00.611042',
            prefixes: [
              {
                ipv4Prefix: '34.1.208.0/20',
                service: 'Google Cloud',
                scope: 'africa-south1',
              },
              {
                ipv4Prefix: '34.35.0.0/16',
                service: 'Google Cloud',
                scope: 'africa-south1',
              },
              {
                ipv6Prefix: '2600:1900:8000::/44',
                service: 'Google Cloud',
                scope: 'africa-south1',
              },
              {
                ipv4Prefix: '35.184.0.0/13',
                service: 'Google Cloud',
                scope: 'us-central1',
              },
            ],
          }

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app).get('/google').expect(200)

          expect(response.type).toBe('text/plain')
          const lines = response.text.split('\n').filter((line) => line.trim())
          expect(lines).toEqual([
            '34.1.208.0/20',
            '34.35.0.0/16',
            '2600:1900:8000::/44',
            '35.184.0.0/13',
          ])
          expect(global.fetch).toHaveBeenCalledWith(
            'https://www.gstatic.com/ipranges/cloud.json',
          )
        })

        it('should filter out invalid subnets', async () => {
          const mockData = {
            syncToken: '1774534680611',
            creationTime: '2026-03-26T07:18:00.611042',
            prefixes: [
              {
                ipv4Prefix: '34.1.208.0/20',
                service: 'Google Cloud',
                scope: 'africa-south1',
              },
              {
                ipv4Prefix: 'not-a-subnet',
                service: 'Google Cloud',
                scope: 'africa-south1',
              },
              {
                ipv6Prefix: '2600:1900:8000::/44',
                service: 'Google Cloud',
                scope: 'africa-south1',
              },
            ],
          }

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app).get('/google').expect(200)

          const lines = response.text.split('\n').filter((line) => line.trim())
          expect(lines).toEqual(['34.1.208.0/20', '2600:1900:8000::/44'])
          expect(lines).not.toContain('not-a-subnet')
        })

        it('should handle API errors', async () => {
          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
          })

          const response = await request(app).get('/google').expect(500)

          expect(response.text).toBe('Internal server error')
        })
      })

      describe('GET /google/:scope', () => {
        it('should return IP subnets for a specific region scope', async () => {
          const mockData = {
            syncToken: '1774534680611',
            creationTime: '2026-03-26T07:18:00.611042',
            prefixes: [
              {
                ipv4Prefix: '34.1.208.0/20',
                service: 'Google Cloud',
                scope: 'africa-south1',
              },
              {
                ipv4Prefix: '34.35.0.0/16',
                service: 'Google Cloud',
                scope: 'africa-south1',
              },
              {
                ipv6Prefix: '2600:1900:8000::/44',
                service: 'Google Cloud',
                scope: 'africa-south1',
              },
              {
                ipv4Prefix: '35.184.0.0/13',
                service: 'Google Cloud',
                scope: 'us-central1',
              },
            ],
          }

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app).get('/google/us-central1').expect(200)

          expect(response.type).toBe('text/plain')
          const lines = response.text.split('\n').filter((line) => line.trim())
          expect(lines).toEqual(['35.184.0.0/13'])
        })

        it('should filter by scope case-insensitively', async () => {
          const mockData = {
            syncToken: '1774534680611',
            creationTime: '2026-03-26T07:18:00.611042',
            prefixes: [
              {
                ipv4Prefix: '34.1.208.0/20',
                service: 'Google Cloud',
                scope: 'africa-south1',
              },
              {
                ipv4Prefix: '35.184.0.0/13',
                service: 'Google Cloud',
                scope: 'US-CENTRAL1',
              },
            ],
          }

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app)
            .get('/google/us-central1')
            .expect(200)

          const lines = response.text.split('\n').filter((line) => line.trim())
          expect(lines).toEqual(['35.184.0.0/13'])
        })

        it('should return empty output for an unknown scope', async () => {
          // The Google Cloud API only includes entries for valid scopes
          const mockData = {
            syncToken: '1774534680611',
            creationTime: '2026-03-26T07:18:00.611042',
            prefixes: [
              {
                ipv4Prefix: '34.1.208.0/20',
                service: 'Google Cloud',
                scope: 'africa-south1',
              },
            ],
          }

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app)
            .get('/google/unknown-scope')
            .expect(200)

          expect(response.type).toBe('text/plain')
          expect(response.text).toBe('')
        })

        it('should handle API errors for a scope', async () => {
          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
          })

          const response = await request(app)
            .get('/google/us-central1')
            .expect(500)

          expect(response.text).toBe('Internal server error')
        })
      })
    })
  }

  describe('Integration Test - Live Google Cloud API', () => {
    ;(isIntegrationTest ? it : it.skip)(
      'should validate real Google Cloud API data contains only valid subnets',
      async () => {
        const response = await request(app)
          .get('/google')
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

import express from 'express'
import request from 'supertest'
import azureRouter from '../src/hosts/azure'

const app = express()
app.use('/azure', azureRouter)

describe('Azure Routes', () => {
  const isIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true'

  if (!isIntegrationTest) {
    describe('Unit Tests', () => {
      beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(console, 'error').mockImplementation(() => {})

        // Mock fetch for unit tests
        global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>
      })

      describe('GET /azure (AzureCloud)', () => {
        it('should return all address prefixes for AzureCloud', async () => {
          const mockData = ['13.64.0.0/11', '13.96.0.0/13', '2603:1000::/46']

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app).get('/azure').expect(200)

          expect(response.type).toBe('text/plain')
          const lines = response.text.split('\n').filter((line) => line.trim())
          expect(lines).toEqual(['13.64.0.0/11', '13.96.0.0/13', '2603:1000::/46'])
          expect(global.fetch).toHaveBeenCalledWith(
            'https://azservicetags.azurewebsites.net/api/servicetag/AzureCloud/addressprefixes',
          )
        })

        it('should filter out invalid subnets', async () => {
          const mockData = ['13.64.0.0/11', 'not-a-subnet', '2603:1000::/46']

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app).get('/azure').expect(200)

          const lines = response.text.split('\n').filter((line) => line.trim())
          expect(lines).toEqual(['13.64.0.0/11', '2603:1000::/46'])
          expect(lines).not.toContain('not-a-subnet')
        })

        it('should handle API errors', async () => {
          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
          })

          const response = await request(app).get('/azure').expect(500)

          expect(response.text).toBe('Internal server error')
        })
      })

      describe('GET /azure/:service', () => {
        it('should return address prefixes for a specific service tag', async () => {
          const mockData = ['40.74.0.0/18', '40.112.0.0/14', '2603:1020::/47']

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app).get('/azure/AzureKeyVault').expect(200)

          expect(response.type).toBe('text/plain')
          const lines = response.text.split('\n').filter((line) => line.trim())
          expect(lines).toEqual(['40.74.0.0/18', '40.112.0.0/14', '2603:1020::/47'])
          expect(global.fetch).toHaveBeenCalledWith(
            'https://azservicetags.azurewebsites.net/api/servicetag/AzureKeyVault/addressprefixes',
          )
        })

        it('should filter out invalid subnets for service tag', async () => {
          const mockData = ['40.74.0.0/18', 'invalid', '2603:1020::/47']

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app).get('/azure/Storage').expect(200)

          const lines = response.text.split('\n').filter((line) => line.trim())
          expect(lines).toEqual(['40.74.0.0/18', '2603:1020::/47'])
        })

        it('should return empty output for an unknown service tag', async () => {
          // The Azure API returns an empty array for unknown service tags (HTTP 200)
          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => [],
          })

          const response = await request(app).get('/azure/UnknownTag').expect(200)

          expect(response.type).toBe('text/plain')
          expect(response.text).toBe('')
        })

        it('should handle API errors for service tag', async () => {
          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
          })

          const response = await request(app).get('/azure/UnknownTag').expect(500)

          expect(response.text).toBe('Internal server error')
        })
      })
    })
  }

  describe('Integration Test - Live Azure API', () => {
    ;(isIntegrationTest ? it : it.skip)(
      'should validate real Azure API data contains only valid subnets',
      async () => {
        const response = await request(app)
          .get('/azure')
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

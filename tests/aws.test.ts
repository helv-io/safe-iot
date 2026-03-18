import express from 'express'
import request from 'supertest'
import awsRouter from '../src/hosts/aws'

const app = express()
app.use('/aws', awsRouter)

describe('AWS Routes', () => {
  const isIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true'

  if (!isIntegrationTest) {
    describe('Unit Tests', () => {
      beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(console, 'error').mockImplementation(() => {})

        // Mock fetch for unit tests
        global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>
      })

      describe('GET /aws (no service filter)', () => {
        it('should return all IP prefixes', async () => {
          const mockData = {
            prefixes: [
              { ip_prefix: '3.4.12.4/32', region: 'eu-west-1', service: 'AMAZON' },
              { ip_prefix: '3.5.140.0/22', region: 'ap-northeast-2', service: 'AMAZON' },
              { ip_prefix: '15.190.244.0/22', region: 'ap-east-2', service: 'EC2' },
            ]
          }

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app).get('/aws').expect(200)

          expect(response.type).toBe('text/plain')
          const lines = response.text.split('\n').filter(line => line.trim())
          expect(lines).toEqual(['3.4.12.4/32', '3.5.140.0/22', '15.190.244.0/22'])
          expect(global.fetch).toHaveBeenCalledWith('https://ip-ranges.amazonaws.com/ip-ranges.json')
        })

        it('should handle API errors', async () => {
          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
          })

          const response = await request(app).get('/aws').expect(500)

          expect(response.text).toBe('Internal server error')
        })
      })

      describe('GET /aws/:service', () => {
        it('should return filtered IP prefixes for specific service', async () => {
          const mockData = {
            prefixes: [
              { ip_prefix: '3.4.12.4/32', region: 'eu-west-1', service: 'AMAZON' },
              { ip_prefix: '3.5.140.0/22', region: 'ap-northeast-2', service: 'AMAZON' },
              { ip_prefix: '15.190.244.0/22', region: 'ap-east-2', service: 'EC2' },
              { ip_prefix: '15.230.15.29/32', region: 'eu-central-1', service: 'EC2' },
            ]
          }

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app).get('/aws/EC2').expect(200)

          expect(response.type).toBe('text/plain')
          const lines = response.text.split('\n').filter(line => line.trim())
          expect(lines).toEqual(['15.190.244.0/22', '15.230.15.29/32'])
        })

        it('should be case insensitive for service filter', async () => {
          const mockData = {
            prefixes: [
              { ip_prefix: '3.4.12.4/32', region: 'eu-west-1', service: 'AMAZON' },
              { ip_prefix: '15.190.244.0/22', region: 'ap-east-2', service: 'ec2' },
            ]
          }

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app).get('/aws/EC2').expect(200)

          expect(response.type).toBe('text/plain')
          const lines = response.text.split('\n').filter(line => line.trim())
          expect(lines).toEqual(['15.190.244.0/22'])
        })

        it('should return empty result for non-existent service', async () => {
          const mockData = {
            prefixes: [
              { ip_prefix: '3.4.12.4/32', region: 'eu-west-1', service: 'AMAZON' },
              { ip_prefix: '3.5.140.0/22', region: 'ap-northeast-2', service: 'AMAZON' },
            ]
          }

          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
          })

          const response = await request(app).get('/aws/NONEXISTENT').expect(200)

          expect(response.type).toBe('text/plain')
          expect(response.text).toBe('')
        })

        it('should handle API errors', async () => {
          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
          })

          const response = await request(app).get('/aws/EC2').expect(500)

          expect(response.text).toBe('Internal server error')
        })
      })
    })
  }

  describe('Integration Test - Live AWS API', () => {
    ;(isIntegrationTest ? it : it.skip)(
      'should validate real AWS API data contains only valid subnets',
      async () => {
        const response = await request(app)
          .get('/aws')
          .timeout(10000) // 10 second timeout for API call

        expect(response.status).toBe(200)
        expect(response.type).toBe('text/plain')

        const lines = response.text.split('\n').filter((line) => line.trim())

        // Validate that all returned lines are valid IPv4 subnets
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
import { Router } from 'express'

const router = Router()

// Helper function to check if a string is a valid IPv4 or IPv6 subnet
function isValidSubnet(subnet: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
  const ipv6Regex = /^([0-9a-fA-F:]+)\/\d{1,3}$/
  return ipv4Regex.test(subnet) || ipv6Regex.test(subnet)
}

router.get('/', async (_req, res) => {
  try {
    const response = await fetch('https://ip-ranges.amazonaws.com/ip-ranges.json')
    if (!response.ok) {
      throw new Error(`AWS API responded with status ${response.status}`)
    }
    const data = await response.json()
    const prefixes = data.prefixes || []
    const ipPrefixes = prefixes
      .map((prefix: any) => prefix.ip_prefix)
      .filter((ip: string) => ip && isValidSubnet(ip))
    const result = ipPrefixes.join('\n')
    res.type('text/plain').send(result)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).send('Internal server error')
  }
})

router.get('/:service', async (req, res) => {
  const service = req.params.service
  try {
    const response = await fetch('https://ip-ranges.amazonaws.com/ip-ranges.json')
    if (!response.ok) {
      throw new Error(`AWS API responded with status ${response.status}`)
    }
    const data = await response.json()
    const prefixes = data.prefixes || []
    const filteredPrefixes = prefixes.filter((prefix: any) =>
      !service || prefix.service.toLowerCase() === service.toLowerCase()
    )
    const ipPrefixes = filteredPrefixes
      .map((prefix: any) => prefix.ip_prefix)
      .filter((ip: string) => ip && isValidSubnet(ip))
    const result = ipPrefixes.join('\n')
    res.type('text/plain').send(result)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).send('Internal server error')
  }
})

export default router
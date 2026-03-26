import { Router } from 'express'

const router = Router()

const BASE_URL = 'https://www.gstatic.com/ipranges/cloud.json'

// Helper function to check if a string is a valid IPv4 or IPv6 subnet
function isValidSubnet(subnet: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
  const ipv6Regex = /^([0-9a-fA-F:]+)\/\d{1,3}$/
  return ipv4Regex.test(subnet) || ipv6Regex.test(subnet)
}

// Returns all Google Cloud IP subnets across all regions (scopes)
router.get('/', async (_req, res) => {
  try {
    const response = await fetch(BASE_URL)
    if (!response.ok) {
      throw new Error(`Google Cloud API responded with status ${response.status}`)
    }
    const data: any = await response.json()
    const prefixes = data.prefixes || []
    const allSubnets = []

    // Collect both ipv4Prefix and ipv6Prefix from each entry
    for (const prefix of prefixes) {
      if (prefix.ipv4Prefix && isValidSubnet(prefix.ipv4Prefix)) {
        allSubnets.push(prefix.ipv4Prefix)
      }
      if (prefix.ipv6Prefix && isValidSubnet(prefix.ipv6Prefix)) {
        allSubnets.push(prefix.ipv6Prefix)
      }
    }

    const result = allSubnets.join('\n')
    res.type('text/plain').send(result)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).send('Internal server error')
  }
})

// Returns Google Cloud IP subnets for a specific region scope (e.g., africa-south1, us-central1)
// Unknown scopes return an empty response — the API only includes entries for valid scopes.
router.get('/:scope', async (req, res) => {
  const scope = req.params.scope
  try {
    const response = await fetch(BASE_URL)
    if (!response.ok) {
      throw new Error(`Google Cloud API responded with status ${response.status}`)
    }
    const data: any = await response.json()
    const prefixes = data.prefixes || []
    const scopeSubnets = []

    // Filter prefixes by the requested scope
    for (const prefix of prefixes) {
      if (prefix.scope && prefix.scope.toLowerCase() === scope.toLowerCase()) {
        if (prefix.ipv4Prefix && isValidSubnet(prefix.ipv4Prefix)) {
          scopeSubnets.push(prefix.ipv4Prefix)
        }
        if (prefix.ipv6Prefix && isValidSubnet(prefix.ipv6Prefix)) {
          scopeSubnets.push(prefix.ipv6Prefix)
        }
      }
    }

    const result = scopeSubnets.join('\n')
    res.type('text/plain').send(result)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).send('Internal server error')
  }
})

export default router

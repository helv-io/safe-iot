import { Router } from 'express'

const router = Router()

const BASE_URL = 'https://azservicetags.azurewebsites.net/api/servicetag'

// Helper function to check if a string is a valid IPv4 or IPv6 subnet
function isValidSubnet(subnet: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
  const ipv6Regex = /^([0-9a-fA-F:]+)\/\d{1,3}$/
  return ipv4Regex.test(subnet) || ipv6Regex.test(subnet)
}

// Returns all Azure IP subnets under the AzureCloud aggregate tag, which covers every Azure public IP globally
router.get('/', async (_req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/AzureCloud/addressprefixes`)
    if (!response.ok) {
      throw new Error(`Azure API responded with status ${response.status}`)
    }
    const data: string[] = await response.json()
    const validSubnets = data.filter(isValidSubnet)
    const result = validSubnets.join('\n')
    res.type('text/plain').send(result)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).send('Internal server error')
  }
})

// Returns IP subnets for a specific Azure service tag (e.g. AzureKeyVault, Storage, AzureDevOps).
// Unknown tags return an empty response — the Azure API yields [] for unrecognised names.
router.get('/:service', async (req, res) => {
  const service = req.params.service
  try {
    const response = await fetch(`${BASE_URL}/${encodeURIComponent(service)}/addressprefixes`)
    if (!response.ok) {
      throw new Error(`Azure API responded with status ${response.status}`)
    }
    const data: string[] = await response.json()
    const validSubnets = data.filter(isValidSubnet)
    const result = validSubnets.join('\n')
    res.type('text/plain').send(result)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).send('Internal server error')
  }
})

export default router

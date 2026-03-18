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
    const response = await fetch('https://api.github.com/meta')
    if (!response.ok) {
      throw new Error(`GitHub API responded with status ${response.status}`)
    }
    const data = await response.json()
    const excludedKeys = [
      'verifiable_password_authentication',
      'ssh_key_fingerprints',
      'ssh_keys',
      'domains',
    ]
    const keys = Object.keys(data).filter((key) => !excludedKeys.includes(key))
    const allValues = []
    for (const key of keys) {
      if (Array.isArray(data[key])) {
        allValues.push(...data[key])
      }
    }
    const validSubnets = allValues.filter(isValidSubnet)
    const result = validSubnets.join('\n')
    res.type('text/plain').send(result)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).send('Internal server error')
  }
})

router.get('/:service', async (req, res) => {
  const service = req.params.service
  try {
    const response = await fetch('https://api.github.com/meta')
    if (!response.ok) {
      throw new Error(`GitHub API responded with status ${response.status}`)
    }
    const data = await response.json()
    const array = data[service]
    if (Array.isArray(array)) {
      const result = array.join('\n')
      res.type('text/plain').send(result)
    } else {
      res.status(400).send('Invalid service or not an array')
    }
  } catch (error) {
    console.error('Error:', error)
    res.status(500).send('Internal server error')
  }
})

export default router

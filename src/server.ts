import 'dotenv/config'
import express from 'express'
import githubRouter from './hosts/github'
import awsRouter from './hosts/aws'

const app = express()
const port = process.env.PORT || 3000

app.use('/github', githubRouter)
app.use('/aws', awsRouter)

// Route for / - returns URL lists specified in LISTS env var
app.get('/', async (_req, res) => {
  try {
    const lists = process.env.LISTS
    if (!lists) {
      return res.status(400).send('LISTS environment variable not set')
    }
    const paths = lists
      .split(',')
      .map((path) => path.trim().replace(/^\/+|\/+$/g, ''))
    const baseUrl = `http://localhost:${port}`
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

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Process terminated')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('Process terminated')
    process.exit(0)
  })
})

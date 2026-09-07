import http from 'http'
import { env } from './config/env.js'
import { createApp } from './app.js'
import { connectDatabase, disconnectDatabase } from './config/database.js'

async function start() {
  const app = createApp()
  const server = http.createServer(app)

  try {
    await connectDatabase(env.mongodbUri)
  } catch (error) {
    console.error('Database connection failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }

  server.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`)
  })

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${env.port} is already in use`)
    } else {
      console.error('Server error:', error)
    }
    process.exit(1)
  })

  async function gracefulShutdown(signal: string) {
    console.log(`${signal} received, starting graceful shutdown`)

    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          console.error('Error closing HTTP server:', err)
          reject(err)
          return
        }
        console.log('HTTP server closed')
        resolve()
      })
    }).catch(() => process.exit(1))

    try {
      await disconnectDatabase()
    } catch {
      // Error already logged in disconnectDatabase
    }

    process.exit(0)
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
}

start()

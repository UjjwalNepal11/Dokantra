import mongoose from 'mongoose'

let connectionPromise: Promise<void> | null = null

function extractDbName(uri: string): string | null {
  try {
    return new URL(uri).pathname.replace(/^\//, '') || null
  } catch {
    return null
  }
}

export async function connectDatabase(uri: string): Promise<void> {
  if (connectionPromise) {
    return connectionPromise
  }

  connectionPromise = mongoose.connect(uri).then(() => {
    const dbName = mongoose.connection.db?.databaseName ?? extractDbName(uri)
    console.log(`Database connected: ${dbName ?? 'unknown'}`)
  })

  return connectionPromise
}

export async function disconnectDatabase(): Promise<void> {
  if (!connectionPromise) {
    return
  }

  try {
    await mongoose.disconnect()
    console.log('Database connection closed')
  } catch (error) {
    console.error('Error closing database connection:', error)
    throw error
  } finally {
    connectionPromise = null
  }
}

export function getConnectionState(): string {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
}

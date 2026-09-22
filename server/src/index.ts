import { app } from './app.js'
import { connectDatabase, disconnectDatabase } from './config/database.js'
import { env } from './config/env.js'

async function start(): Promise<void> {
  await connectDatabase()
  const server = app.listen(env.PORT, () => {
    console.info(`API listening on port ${env.PORT}`)
  })

  const shutdown = async () => {
    server.close(async () => {
      await disconnectDatabase()
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch((error: unknown) => {
  console.error('Unable to start server', error)
  process.exit(1)
})

import app from './app.js'
import { env } from './config/env.js'
import { connectDatabase } from './config/database.js'

async function startServer() {
  if (env.mongoUri) {
    await connectDatabase(env.mongoUri)
    console.log('MongoDB connected')
  } else {
    console.warn('MONGODB_URI is not set; database-backed routes will be unavailable.')
  }

  app.listen(env.port, () => console.log(`EVENTORA API listening on http://localhost:${env.port}`))
}

startServer().catch((error) => {
  console.error('Backend startup failed:', error.message)
  process.exitCode = 1
})
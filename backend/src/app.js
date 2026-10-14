import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { rateLimit } from 'express-rate-limit'
import { env } from './config/env.js'
import { mongoose } from './config/database.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { requireDatabase } from './middleware/requireDatabase.js'
import authRoutes from './routes/authRoutes.js'
import eventRoutes from './routes/eventRoutes.js'
import organizerRoutes from './routes/organizerRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import bookingRoutes from './routes/bookingRoutes.js'
import userRoutes from './routes/userRoutes.js'

export const app = express()

app.disable('x-powered-by')
app.set('trust proxy', env.isProduction ? 1 : false)
app.use(helmet())
app.use(cors({ origin: env.frontendUrl, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }))
app.use('/api/auth', authRoutes)
app.use('/api/events', requireDatabase, eventRoutes)
app.use('/api/organizer', organizerRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/users', userRoutes)

app.get('/api/health', (request, response) => {
  response.json({
    status: 'ok',
    service: 'eventora-api',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api', notFoundHandler)
app.use(errorHandler)

export default app
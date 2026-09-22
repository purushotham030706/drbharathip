import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import mongoSanitize from 'express-mongo-sanitize'
import rateLimit from 'express-rate-limit'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import { env } from './config/env.js'
import { doubleCsrfProtection } from './config/csrf.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { adminAuthRouter } from './routes/admin-auth.routes.js'
import { healthRouter } from './routes/health.routes.js'
import { publicRouter } from './routes/public.routes.js'

export const app = express()

app.set('trust proxy', 1)
app.use(helmet())
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
app.use(express.json({ limit: '100kb' }))
app.use(mongoSanitize())
app.use(session({
  name: env.SESSION_COOKIE_NAME,
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: env.MONGODB_URI }),
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 8,
  },
}))
app.use(cookieParser())

const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 })
app.use('/api', publicLimiter)
app.use('/api', healthRouter)
app.use('/api', publicRouter)
app.use('/api/admin/auth', adminAuthRouter)
app.use('/api/admin', doubleCsrfProtection)
app.use(notFoundHandler)
app.use(errorHandler)

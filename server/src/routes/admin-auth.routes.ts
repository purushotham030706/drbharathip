import argon2 from 'argon2'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { doubleCsrfProtection, generateCsrfToken } from '../config/csrf.js'
import { env } from '../config/env.js'
import { AuditLog } from '../models/audit-log.model.js'
import { AdminUser } from '../models/admin-user.model.js'
import { requireAuth } from '../middleware/require-auth.js'

export const adminAuthRouter = Router()
const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(1024) })
const loginLimiter = rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60_000, limit: env.RATE_LIMIT_MAX_ATTEMPTS, standardHeaders: true, legacyHeaders: false, message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many sign-in attempts. Please try again later.' } } })

adminAuthRouter.post('/login', loginLimiter, async (request, response, next) => {
  try {
    const { email, password } = loginSchema.parse(request.body)
    const user = await AdminUser.findOne({ email: email.toLowerCase(), isActive: true })
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } })
      return
    }
    request.session.regenerate(async (error) => {
      if (error) return next(error)
      request.session.adminUserId = user._id.toString()
      request.session.role = user.role
      user.lastLoginAt = new Date()
      await user.save()
      await AuditLog.create({ userId: user._id, action: 'ADMIN_LOGIN', metadata: { role: user.role } })
      response.json({ user: { id: user._id, email: user.email, role: user.role }, csrfToken: generateCsrfToken(request, response, { overwrite: true }) })
    })
  } catch (error) { next(error) }
})

adminAuthRouter.get('/session', requireAuth, async (request, response, next) => {
  try {
    const user = await AdminUser.findById(request.session.adminUserId).select('email role').lean()
    if (!user) { request.session.destroy(() => undefined); response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in is required' } }); return }
    response.json({ user, csrfToken: generateCsrfToken(request, response) })
  } catch (error) { next(error) }
})

adminAuthRouter.post('/logout', requireAuth, doubleCsrfProtection, (request, response, next) => request.session.destroy((error) => error ? next(error) : response.status(204).send()))

import type { RequestHandler } from 'express'

export const requireAuth: RequestHandler = (request, response, next) => {
  if (!request.session.adminUserId) {
    response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in is required' } })
    return
  }
  next()
}

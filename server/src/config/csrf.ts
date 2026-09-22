import { doubleCsrf } from 'csrf-csrf'
import { env } from './env.js'

export const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  getSessionIdentifier: (request) => request.sessionID,
  cookieName: env.NODE_ENV === 'production' ? '__Host-dr-bharathi-csrf' : 'dr-bharathi-csrf',
  cookieOptions: { sameSite: 'strict', secure: env.NODE_ENV === 'production', httpOnly: true, path: '/' },
  getCsrfTokenFromRequest: (request) => request.headers['x-csrf-token'],
  errorConfig: { statusCode: 403, code: 'CSRF_INVALID', message: 'Your session could not be verified. Refresh and try again.' },
})

import 'dotenv/config'
import { z } from 'zod'

const environmentSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_COOKIE_NAME: z.string().min(1).default('sid'),
  CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters'),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_ORIGIN: z.string().url(),
  EMAIL_PROVIDER: z.enum(['resend', 'brevo']).default('resend'),
  EMAIL_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
})

export const env = environmentSchema.parse(process.env)

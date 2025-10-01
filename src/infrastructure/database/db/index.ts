import dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from '../schema'

dotenv.config()

// eslint-disable-next-line node/prefer-global/process
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// eslint-disable-next-line node/prefer-global/process
export const client = postgres(process.env.DATABASE_URL)
export const db = drizzle(client, { schema })

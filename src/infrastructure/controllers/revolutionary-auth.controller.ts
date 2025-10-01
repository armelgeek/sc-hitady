import { OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { db } from '../database/db'
import { users, sessions } from '../database/schema/auth'
import { eq, and } from 'drizzle-orm'
import { generatePassphrase, validatePassphraseFormat, encryptText, verifyEncryptedText, generateRecoveryHint } from '../utils/passphrase.util'
import { randomBytes } from 'crypto'

// Helper function to generate unique IDs
function generateId(length: number = 16): string {
  return randomBytes(length).toString('hex')
}

const router = new OpenAPIHono()

// Registration schema
const RegisterSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-z0-9]+$/i, 'Username must contain only letters and numbers'),
  name: z.string().min(1),
  phoneNumber: z.string().min(10),
  recoveryWord: z.string().min(3).max(50),
  email: z.string().email().optional()
})

// Login schema
const LoginSchema = z.object({
  username: z.string(),
  connectionWords: z.string()
})

// Recovery schema
const RecoverySchema = z.object({
  username: z.string(),
  recoveryWord: z.string()
})

/**
 * Register a new user with revolutionary authentication
 * POST /api/auth/register
 */
router.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = RegisterSchema.parse(body)
    
    // Check if username already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, validatedData.username))
      .limit(1)
    
    if (existingUser.length > 0) {
      return c.json({ error: 'Username already taken' }, 400)
    }
    
    // Generate connection words (passphrase)
    const connectionWords = generatePassphrase(4)
    
    // Encrypt recovery word and connection words
    const encryptedRecoveryWord = await encryptText(validatedData.recoveryWord, validatedData.username)
    const encryptedConnectionWords = await encryptText(connectionWords, validatedData.username)
    
    // Create user
    const userId = generateId()
    const now = new Date()
    
    const newUser = await db.insert(users).values({
      id: userId,
      username: validatedData.username,
      name: validatedData.name,
      email: validatedData.email || `${validatedData.username}@hitady.mg`,
      emailVerified: false,
      phoneNumber: validatedData.phoneNumber,
      recoveryWord: encryptedRecoveryWord,
      connectionWords: encryptedConnectionWords,
      isVerified: false,
      status: 'offline',
      createdAt: now,
      updatedAt: now
    }).returning()
    
    // Create Neo4j node
    try {
      const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
      const loader = new CypherQueryLoader()
      await loader.run('user', 'create-user', {
        id: userId,
        name: validatedData.name,
        email: validatedData.email || `${validatedData.username}@hitady.mg`,
        username: validatedData.username
      })
    } catch (error) {
      console.error("Erreur lors de la création du noeud Neo4j pour l'utilisateur:", error)
    }
    
    return c.json({
      success: true,
      message: 'Registration successful',
      data: {
        userId: newUser[0].id,
        username: newUser[0].username,
        connectionWords: connectionWords, // Return in plain text ONLY during registration
        recoveryHint: generateRecoveryHint(validatedData.recoveryWord)
      }
    }, 201)
  } catch (error: any) {
    console.error('Registration error:', error)
    return c.json({ error: error.message || 'Registration failed' }, 400)
  }
})

/**
 * Login with username and connection words
 * POST /api/auth/login
 */
router.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = LoginSchema.parse(body)
    
    // Find user by username
    const userResults = await db
      .select()
      .from(users)
      .where(eq(users.username, validatedData.username))
      .limit(1)
    
    if (userResults.length === 0) {
      return c.json({ error: 'Invalid username or connection words' }, 401)
    }
    
    const user = userResults[0]
    
    // Verify connection words
    const isValid = await verifyEncryptedText(
      validatedData.connectionWords,
      user.connectionWords!,
      validatedData.username
    )
    
    if (!isValid) {
      return c.json({ error: 'Invalid username or connection words' }, 401)
    }
    
    // Update user status to online
    await db
      .update(users)
      .set({ 
        status: 'online',
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
    
    // Create session
    const sessionId = generateId()
    const sessionToken = generateId(32)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    
    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      token: sessionToken,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '',
      userAgent: c.req.header('user-agent') || ''
    })
    
    return c.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          isVerified: user.isVerified,
          status: 'online'
        },
        session: {
          token: sessionToken,
          expiresAt
        }
      }
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return c.json({ error: error.message || 'Login failed' }, 401)
  }
})

/**
 * Recover account using recovery word
 * POST /api/auth/recover
 */
router.post('/recover', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = RecoverySchema.parse(body)
    
    // Find user by username
    const userResults = await db
      .select()
      .from(users)
      .where(eq(users.username, validatedData.username))
      .limit(1)
    
    if (userResults.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    const user = userResults[0]
    
    // Verify recovery word
    const isValid = await verifyEncryptedText(
      validatedData.recoveryWord,
      user.recoveryWord!,
      validatedData.username
    )
    
    if (!isValid) {
      return c.json({ error: 'Invalid recovery word' }, 401)
    }
    
    // Generate new connection words
    const newConnectionWords = generatePassphrase(4)
    const encryptedConnectionWords = await encryptText(newConnectionWords, validatedData.username)
    
    // Update user
    await db
      .update(users)
      .set({ 
        connectionWords: encryptedConnectionWords,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
    
    return c.json({
      success: true,
      message: 'Account recovered successfully',
      data: {
        username: user.username,
        connectionWords: newConnectionWords // Return in plain text for user to save
      }
    })
  } catch (error: any) {
    console.error('Recovery error:', error)
    return c.json({ error: error.message || 'Recovery failed' }, 400)
  }
})

/**
 * Logout user
 * POST /api/auth/logout
 */
router.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('authorization')
    if (!authHeader) {
      return c.json({ error: 'No authorization header' }, 401)
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Find session
    const sessionResults = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1)
    
    if (sessionResults.length > 0) {
      const session = sessionResults[0]
      
      // Update user status to offline
      await db
        .update(users)
        .set({ 
          status: 'offline',
          updatedAt: new Date()
        })
        .where(eq(users.id, session.userId))
      
      // Delete session
      await db.delete(sessions).where(eq(sessions.id, session.id))
    }
    
    return c.json({
      success: true,
      message: 'Logout successful'
    })
  } catch (error: any) {
    console.error('Logout error:', error)
    return c.json({ error: error.message || 'Logout failed' }, 400)
  }
})

export default router

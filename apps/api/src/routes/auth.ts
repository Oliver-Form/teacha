import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

// Auth schemas
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  age: z.number().min(0).optional(),
  role: z.enum(['user', 'admin']).optional()
})

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export default async function (fastify: FastifyInstance) {
  // Register new user
  fastify.post('/register', async (request, reply) => {
    try {
      const userData = registerSchema.parse(request.body)
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      
      if (existingUser) {
        reply.status(400)
        return { error: 'User with this email already exists' }
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      
      // Create user
      const newUser = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          role: userData.role || 'user',
        },
        select: {
          id: true,
          name: true,
          email: true,
          age: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      })
      
      // Generate JWT token
      const token = fastify.jwt.sign({ 
        userId: newUser.id,
        email: newUser.email 
      })
      
      reply.status(201)
      return {
        message: 'User registered successfully',
        user: newUser,
        token
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400)
        return { error: 'Validation failed', details: error.errors }
      }
      reply.status(500)
      return { error: 'Failed to register user' }
    }
  })

  // Login user
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body)
      
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email }
      })
      
      if (!user) {
        reply.status(401)
        return { error: 'Invalid email or password' }
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password)
      
      if (!isValidPassword) {
        reply.status(401)
        return { error: 'Invalid email or password' }
      }
      
      // Generate JWT token
      const token = fastify.jwt.sign({ 
        userId: user.id,
        email: user.email 
      })
      
      return {
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          age: user.age,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400)
        return { error: 'Validation failed', details: error.errors }
      }
      reply.status(500)
      return { error: 'Failed to login' }
    }
  })

  // Get current user profile (protected route)
  fastify.get('/me', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify()
      } catch (err) {
        reply.status(401).send({ error: 'Unauthorized' })
      }
    }
  }, async (request, reply) => {
    try {
      const { userId } = request.user as { userId: string; email: string }
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          age: true,
          createdAt: true,
          updatedAt: true
        }
      })
      
      if (!user) {
        reply.status(404)
        return { error: 'User not found' }
      }
      
      return { user }
    } catch (error) {
      reply.status(500)
      return { error: 'Failed to get user profile' }
    }
  })
}

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

// User-related schemas
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  age: z.number().min(0).optional(),
})

const getUserParamsSchema = z.object({
  id: z.string().min(1),
})

export default async function (fastify: FastifyInstance) {
  // Get all users
  fastify.get('/', async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
      })
      return { users }
    } catch (error) {
      reply.status(500)
      return { error: 'Failed to fetch users' }
    }
  })

  // Get user by ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = getUserParamsSchema.parse(request.params)
      
      const user = await prisma.user.findUnique({
        where: { id }
      })
      
      if (!user) {
        reply.status(404)
        return { error: 'User not found' }
      }
      
      return user
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400)
        return { error: 'Invalid user ID', details: error.errors }
      }
      reply.status(500)
      return { error: 'Failed to fetch user' }
    }
  })

  // Create new user
  fastify.post('/', async (request, reply) => {
    try {
      const userData = createUserSchema.parse(request.body)
      
      const newUser = await prisma.user.create({
        data: userData
      })
      
      reply.status(201)
      return newUser
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400)
        return { error: 'Validation failed', details: error.errors }
      }
      // Handle unique constraint violation (email already exists)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        reply.status(400)
        return { error: 'Email already exists' }
      }
      reply.status(500)
      return { error: 'Failed to create user' }
    }
  })

  // Update user
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = getUserParamsSchema.parse(request.params)
      const userData = createUserSchema.partial().parse(request.body)
      
      const updatedUser = await prisma.user.update({
        where: { id },
        data: userData
      })
      
      return updatedUser
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400)
        return { error: 'Validation failed', details: error.errors }
      }
      // Handle user not found
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        reply.status(404)
        return { error: 'User not found' }
      }
      reply.status(500)
      return { error: 'Failed to update user' }
    }
  })

  // Delete user
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = getUserParamsSchema.parse(request.params)
      
      await prisma.user.delete({
        where: { id }
      })
      
      reply.status(204)
      return
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400)
        return { error: 'Invalid user ID', details: error.errors }
      }
      // Handle user not found
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        reply.status(404)
        return { error: 'User not found' }
      }
      reply.status(500)
      return { error: 'Failed to delete user' }
    }
  })
}
// thats kinda 
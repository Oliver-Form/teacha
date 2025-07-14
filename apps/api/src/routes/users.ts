import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole } from '../middleware/auth'

const prisma = new PrismaClient()

// User-related schemas
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  age: z.number().min(0).optional(),
})

const getUserParamsSchema = z.object({
  id: z.string().min(1),
})

export default async function (fastify: FastifyInstance) {
  // Get all users (protected)
  fastify.get('/', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          age: true,
          createdAt: true,
          updatedAt: true
        }
      })
      return { users }
    } catch (error) {
      reply.status(500)
      return { error: 'Failed to fetch users' }
    }
  })

  // Get user by ID (protected)
  fastify.get('/:id', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const { id } = getUserParamsSchema.parse(request.params)
      
      const user = await prisma.user.findUnique({
        where: { id },
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

  // Create new user (admin only - protected)
  fastify.post('/', {
    preHandler: requireRole('admin')
  }, async (request, reply) => {
    try {
      const userData = createUserSchema.parse(request.body)
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      
      const newUser = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword
        },
        select: {
          id: true,
          name: true,
          email: true,
          age: true,
          createdAt: true,
          updatedAt: true
        }
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

  // Update user (protected)
  fastify.put('/:id', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const { id } = getUserParamsSchema.parse(request.params)
      const userData = createUserSchema.partial().parse(request.body)
      
      // If password is being updated, hash it
      const updateData = { ...userData }
      if (userData.password) {
        updateData.password = await bcrypt.hash(userData.password, 10)
      }
      
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          age: true,
          createdAt: true,
          updatedAt: true
        }
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

  // Delete user (admin only - protected)
  fastify.delete('/:id', {
    preHandler: requireRole('admin')
  }, async (request, reply) => {
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
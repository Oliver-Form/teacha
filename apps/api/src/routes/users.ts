import { FastifyInstance } from 'fastify'
import { z } from 'zod'

// User-related schemas
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  age: z.number().min(0).optional(),
})

const getUserParamsSchema = z.object({
  id: z.string().min(1),
})

export async function userRoutes(fastify: FastifyInstance) {
  // Get all users
  fastify.get('/users', async (request, reply) => {
    // This would typically fetch from database
    return {
      users: [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ]
    }
  })

  // Get user by ID
  fastify.get('/users/:id', async (request, reply) => {
    try {
      const { id } = getUserParamsSchema.parse(request.params)
      
      // This would typically fetch from database
      if (id === '1') {
        return { id: '1', name: 'John Doe', email: 'john@example.com' }
      }
      
      reply.status(404)
      return { error: 'User not found' }
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400)
        return { error: 'Invalid user ID', details: error.errors }
      }
      throw error
    }
  })

  // Create new user
  fastify.post('/users', async (request, reply) => {
    try {
      const userData = createUserSchema.parse(request.body)
      
      // This would typically save to database
      const newUser = {
        id: Math.random().toString(36).substr(2, 9),
        ...userData,
        createdAt: new Date().toISOString()
      }
      
      reply.status(201)
      return newUser
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400)
        return { error: 'Validation failed', details: error.errors }
      }
      throw error
    }
  })

  // Update user
  fastify.put('/users/:id', async (request, reply) => {
    try {
      const { id } = getUserParamsSchema.parse(request.params)
      const userData = createUserSchema.partial().parse(request.body)
      
      // This would typically update in database
      return {
        id,
        ...userData,
        updatedAt: new Date().toISOString()
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400)
        return { error: 'Validation failed', details: error.errors }
      }
      throw error
    }
  })

  // Delete user
  fastify.delete('/users/:id', async (request, reply) => {
    try {
      const { id } = getUserParamsSchema.parse(request.params)
      
      // This would typically delete from database
      reply.status(204)
      return
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400)
        return { error: 'Invalid user ID', details: error.errors }
      }
      throw error
    }
  })
}

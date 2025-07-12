import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function (fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    try {
      // Check database connectivity
      await prisma.$queryRaw`SELECT 1`
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: 'connected'
      }
    } catch (error) {
      fastify.log.error('Health check failed:', error)
      reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  // Simple ping endpoint
  fastify.get('/ping', async (request, reply) => {
    return { message: 'pong', timestamp: new Date().toISOString() }
  })
}

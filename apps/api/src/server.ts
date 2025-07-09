import Fastify, { FastifyInstance } from 'fastify'
import { z } from 'zod'
import path from 'path'
import 'dotenv/config'

// Environment configuration schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  HOST: z.string().default('localhost'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
})

// Parse and validate environment variables
const env = envSchema.parse(process.env)

// Create Fastify instance with logging configuration
const fastify: FastifyInstance = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'warn' : 'info',
    // Simple console logging for development
  }
})

// Register CORS plugin (commented out due to version compatibility)
// For Fastify 5.x, you may need to use a different CORS solution
// or downgrade to Fastify 4.x for @fastify/cors compatibility
// fastify.register(require('@fastify/cors'), {
//   origin: env.NODE_ENV === 'production' ? false : true,
// })

// Manual CORS headers for now
fastify.addHook('onRequest', async (request, reply) => {
  if (env.NODE_ENV === 'development') {
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }
})

// Handle preflight requests
fastify.options('*', async (request, reply) => {
  reply.send()
})

// Register JWT plugin
fastify.register(import('@fastify/jwt'), {
  secret: env.JWT_SECRET
})

// Register autoload for routes
fastify.register(import('@fastify/autoload'), {
  dir: path.join(__dirname, 'routes'),
  options: {}
})

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error)
  
  if (error.statusCode) {
    reply.status(error.statusCode).send({
      error: error.message,
      statusCode: error.statusCode
    })
  } else {
    reply.status(500).send({
      error: 'Internal Server Error',
      statusCode: 500
    })
  }
})

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully`)
  try {
    await fastify.close()
    process.exit(0)
  } catch (error) {
    fastify.log.error('Error during shutdown:', error)
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Start server
const start = async () => {
  try {
    await fastify.listen({ 
      port: env.PORT, 
      host: env.HOST 
    })
    
    fastify.log.info(`🚀 Server running at http://${env.HOST}:${env.PORT}`)
    fastify.log.info(`📋 Health check available at http://${env.HOST}:${env.PORT}/health`)
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

// Only start if this file is executed directly
if (require.main === module) {
  start()
}

export default fastify
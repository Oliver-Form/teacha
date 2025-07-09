import { FastifyInstance } from 'fastify'

export default async function (fastify: FastifyInstance) {
  fastify.get('/test-autoload', {
    preHandler: [] // Explicitly no auth
  }, async (request, reply) => {
    return { message: 'Autoload works!' }
  })
}

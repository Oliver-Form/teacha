import { FastifyInstance } from 'fastify'

export default async function (fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    return { message: 'Hello from Fastify API!' }
  })
}

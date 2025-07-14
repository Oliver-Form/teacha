import { FastifyRequest, FastifyReply } from 'fastify'

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized - Valid token required' })
  }
}

export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    // Continue without authentication
  }
}

export function requireRole(role: string) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
      const user = request.user as { userId: string; role: string }
      if (!user || user.role !== role) {
        reply.status(403).send({ error: 'Forbidden: insufficient role' })
      }
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized - Valid token required' })
    }
  }
}

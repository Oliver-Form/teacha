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

export function requireRole(roles: string | string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
      const user = request.user as { userId: string; role: string; tenantId?: string }
      
      if (!user) {
        reply.status(401).send({ error: 'Unauthorized - Valid token required' })
        return
      }
      
      const allowedRoles = Array.isArray(roles) ? roles : [roles]
      if (!allowedRoles.includes(user.role)) {
        reply.status(403).send({ error: 'Forbidden: insufficient role' })
        return
      }
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized - Valid token required' })
    }
  }
}

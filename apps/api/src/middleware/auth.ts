const { FastifyRequest, FastifyReply } = require('fastify');

async function requireAuth(request, reply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized - Valid token required' })
  }
}

async function optionalAuth(request, reply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    // Continue without authentication
  }
}

function requireRole(role) {
  return async function (request, reply) {
    try {
      await request.jwtVerify()
      const user = request.user
      if (!user || user.role !== role) {
        reply.status(403).send({ error: 'Forbidden: insufficient role' })
      }
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized - Valid token required' })
    }
  }
}

module.exports = { requireAuth, optionalAuth, requireRole };

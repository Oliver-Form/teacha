
import Fastify, { FastifyInstance } from 'fastify'
import fastifyJwt from '@fastify/jwt'
import { requireAuth, optionalAuth, requireRole } from '../../src/middleware/auth'

const JWT_SECRET = 'testsecret'

function buildServer(): FastifyInstance {
  const fastify = Fastify()
  fastify.register(fastifyJwt, { secret: JWT_SECRET })

  fastify.get('/protected', { preHandler: requireAuth }, async () => ({ ok: true }))
  fastify.get('/optional', { preHandler: optionalAuth }, async (req) => ({ user: req.user || null }))
  fastify.get('/admin', { preHandler: requireRole('admin') }, async () => ({ admin: true }))

  return fastify
}


describe('Auth Middleware', () => {
  let fastify: FastifyInstance

  beforeAll(async () => {
    fastify = buildServer()
    await fastify.ready()
  })

  afterAll(() => fastify.close())

  it('should allow access with valid JWT (requireAuth)', async () => {
    const token = fastify.jwt.sign({ userId: '1', role: 'user' })
    const res = await fastify.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual({ ok: true })
  })

  it('should block access without JWT (requireAuth)', async () => {
    const res = await fastify.inject({ method: 'GET', url: '/protected' })
    expect(res.statusCode).toBe(401)
  })

  it('should allow access without JWT (optionalAuth)', async () => {
    const res = await fastify.inject({ method: 'GET', url: '/optional' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).user).toBeNull()
  })

  it('should allow access with JWT (optionalAuth)', async () => {
    const token = fastify.jwt.sign({ userId: '2', role: 'user' })
    const res = await fastify.inject({
      method: 'GET',
      url: '/optional',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).user).toBeDefined()
  })

  it('should allow admin access with admin JWT (requireRole)', async () => {
    const token = fastify.jwt.sign({ userId: '3', role: 'admin' })
    const res = await fastify.inject({
      method: 'GET',
      url: '/admin',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual({ admin: true })
  })

  it('should block non-admin access (requireRole)', async () => {
    const token = fastify.jwt.sign({ userId: '4', role: 'user' })
    const res = await fastify.inject({
      method: 'GET',
      url: '/admin',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(403)
  })
})

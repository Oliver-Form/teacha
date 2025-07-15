import Fastify, { FastifyInstance } from 'fastify'
import fastifyJwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import authRoutes from '../../src/routes/auth'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

describe('Auth Routes Integration', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = Fastify()
    await app.register(fastifyJwt, { secret: 'test-secret' })
    await app.register(authRoutes, { prefix: '/auth' })
    await app.ready()
  })

  beforeEach(async () => {
    // Clean database before each test
    await prisma.enrollment.deleteMany()
    await prisma.lesson.deleteMany()
    await prisma.course.deleteMany()
    await prisma.user.deleteMany()
    await prisma.tenant.deleteMany()
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  describe('User Registration', () => {
    let tenant: any

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Test Academy',
          slug: 'test-academy'
        }
      })
    })

    it('should register a new student user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          tenantId: tenant.id
        }
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.message).toBe('User registered successfully')
      expect(body.user.name).toBe('John Doe')
      expect(body.user.email).toBe('john@example.com')
      expect(body.user.role).toBe('STUDENT')
      expect(body.token).toBeDefined()

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: 'john@example.com' }
      })
      expect(user).toBeTruthy()
      expect(user?.tenantId).toBe(tenant.id)
    })

    it('should register a tenant owner', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          password: 'password123',
          role: 'TENANT_OWNER',
          tenantId: tenant.id
        }
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.user.role).toBe('TENANT_OWNER')
    })

    it('should reject duplicate email', async () => {
      // Create first user
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'Existing User',
          email: 'existing@example.com',
          password: 'hashed',
          role: 'STUDENT'
        }
      })

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          name: 'New User',
          email: 'existing@example.com', // Duplicate email
          password: 'password123',
          tenantId: tenant.id
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('User with this email already exists')
    })

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          name: '',
          email: 'invalid-email',
          password: '123', // Too short
          tenantId: tenant.id
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Validation failed')
      expect(body.details).toBeDefined()
    })
  })

  describe('User Login', () => {
    let tenant: any
    let user: any

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Test Academy',
          slug: 'test-academy'
        }
      })

      const hashedPassword = await bcrypt.hash('password123', 10)
      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          role: 'STUDENT'
        }
      })
    })

    it('should login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'password123'
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.message).toBe('Login successful')
      expect(body.user.email).toBe('test@example.com')
      expect(body.user.name).toBe('Test User')
      expect(body.token).toBeDefined()

      // Verify JWT token contains correct data
      const decoded = app.jwt.decode(body.token) as any
      expect(decoded.userId).toBe(user.id)
      expect(decoded.email).toBe('test@example.com')
      expect(decoded.role).toBe('STUDENT')
    })

    it('should reject invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123'
        }
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Invalid email or password')
    })

    it('should reject invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'wrongpassword'
        }
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Invalid email or password')
    })

    it('should validate login fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'invalid-email',
          password: ''
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Validation failed')
    })
  })

  describe('User Profile', () => {
    let tenant: any
    let user: any
    let token: string

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Test Academy',
          slug: 'test-academy'
        }
      })

      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed',
          role: 'INSTRUCTOR'
        }
      })

      token = app.jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role
      })
    })

    it('should get user profile with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.user.name).toBe('Test User')
      expect(body.user.email).toBe('test@example.com')
      expect(body.user.id).toBe(user.id)
      // Password should not be included
      expect(body.user.password).toBeUndefined()
    })

    it('should reject request without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me'
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Unauthorized')
    })

    it('should reject request with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      })

      expect(response.statusCode).toBe(401)
    })

    it('should handle user not found case', async () => {
      // Create token for non-existent user
      const invalidToken = app.jwt.sign({
        userId: 'non-existent-id',
        email: 'test@example.com',
        role: 'STUDENT'
      })

      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${invalidToken}`
        }
      })

      expect(response.statusCode).toBe(404)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('User not found')
    })
  })

  describe('Role-Based Access', () => {
    let tenant: any
    let studentUser: any, instructorUser: any, tenantOwnerUser: any
    let studentToken: string, instructorToken: string, tenantOwnerToken: string

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Test Academy',
          slug: 'test-academy'
        }
      })

      // Create users with different roles
      studentUser = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'Student User',
          email: 'student@example.com',
          password: 'hashed',
          role: 'STUDENT'
        }
      })

      instructorUser = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'Instructor User',
          email: 'instructor@example.com',
          password: 'hashed',
          role: 'INSTRUCTOR'
        }
      })

      tenantOwnerUser = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'Owner User',
          email: 'owner@example.com',
          password: 'hashed',
          role: 'TENANT_OWNER'
        }
      })

      // Generate tokens
      studentToken = app.jwt.sign({
        userId: studentUser.id,
        email: studentUser.email,
        role: studentUser.role
      })

      instructorToken = app.jwt.sign({
        userId: instructorUser.id,
        email: instructorUser.email,
        role: instructorUser.role
      })

      tenantOwnerToken = app.jwt.sign({
        userId: tenantOwnerUser.id,
        email: tenantOwnerUser.email,
        role: tenantOwnerUser.role
      })
    })

    it('should verify different role tokens work correctly', async () => {
      // Test student token
      const studentResponse = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: `Bearer ${studentToken}` }
      })
      expect(studentResponse.statusCode).toBe(200)
      const studentBody = JSON.parse(studentResponse.body)
      expect(studentBody.user.email).toBe('student@example.com')

      // Test instructor token
      const instructorResponse = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: `Bearer ${instructorToken}` }
      })
      expect(instructorResponse.statusCode).toBe(200)
      const instructorBody = JSON.parse(instructorResponse.body)
      expect(instructorBody.user.email).toBe('instructor@example.com')

      // Test tenant owner token
      const ownerResponse = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: `Bearer ${tenantOwnerToken}` }
      })
      expect(ownerResponse.statusCode).toBe(200)
      const ownerBody = JSON.parse(ownerResponse.body)
      expect(ownerBody.user.email).toBe('owner@example.com')
    })
  })
})

import Fastify, { FastifyInstance } from 'fastify'
import fastifyJwt from '@fastify/jwt'
import { test, describe, beforeAll, afterAll, beforeEach, expect } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import tenantRoutes from '../../src/routes/tenants'

const prisma = new PrismaClient()
let app: FastifyInstance

describe('Tenant API Integration Tests', () => {
  beforeAll(async () => {
    app = Fastify()
    await app.register(fastifyJwt, { secret: 'test-secret' })
    await app.register(tenantRoutes, { prefix: '/tenants' })
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up test data before each test using transaction for safety
    await prisma.$transaction([
      prisma.enrollment.deleteMany(),
      prisma.lesson.deleteMany(),
      prisma.course.deleteMany(),
      prisma.user.deleteMany(),
      prisma.tenant.deleteMany()
    ])
  })

  describe('POST /tenants/signup', () => {
    it('should register a new tenant and owner successfully', async () => {
      const signupData = {
        tenantName: 'Test Academy',
        tenantSlug: 'test-academy',
        domain: 'https://test-academy.example.com',
        ownerName: 'John Doe',
        ownerEmail: 'john@testacademy.com',
        password: 'password123',
        plan: 'basic'
      }

      const response = await app.inject({
        method: 'POST',
        url: '/tenants/signup',
        payload: signupData
      })

      expect(response.statusCode).toBe(201)
      const data = JSON.parse(response.body)
      
      expect(data.message).toBe('Tenant registered successfully')
      expect(data.tenant).toMatchObject({
        name: 'Test Academy',
        slug: 'test-academy',
        domain: 'https://test-academy.example.com',
        plan: 'basic'
      })
      expect(data.owner).toMatchObject({
        name: 'John Doe',
        email: 'john@testacademy.com',
        role: 'TENANT_OWNER'
      })
      expect(data.token).toBeDefined()
      expect(data.dashboardUrl).toBe('https://test-academy.teacha.com/dashboard')
      expect(data.publicUrl).toBe('https://test-academy.example.com')

      // Verify data was actually created in database
      const tenant = await prisma.tenant.findUnique({
        where: { slug: 'test-academy' },
        include: { users: true }
      })
      expect(tenant).toBeTruthy()
      expect(tenant?.users).toHaveLength(1)
      expect(tenant?.users[0].role).toBe('TENANT_OWNER')
    })

    it('should reject signup with duplicate slug', async () => {
      // Create existing tenant
      await prisma.tenant.create({
        data: {
          name: 'Existing Academy',
          slug: 'test-academy'
        }
      })

      const signupData = {
        tenantName: 'New Academy',
        tenantSlug: 'test-academy',
        ownerName: 'Jane Doe',
        ownerEmail: 'jane@newacademy.com',
        password: 'password123'
      }

      const response = await app.inject({
        method: 'POST',
        url: '/tenants/signup',
        payload: signupData
      })

      expect(response.statusCode).toBe(400)
      const data = JSON.parse(response.body)
      expect(data.error).toBe('Slug is already taken. Please choose a different one.')
    })

    it('should reject signup with duplicate email', async () => {
      // Create existing user
      const existingTenant = await prisma.tenant.create({
        data: { name: 'Existing', slug: 'existing' }
      })
      
      await prisma.user.create({
        data: {
          tenantId: existingTenant.id,
          name: 'Existing User',
          email: 'john@testacademy.com',
          password: 'hashedpassword',
          role: 'STUDENT'
        }
      })

      const signupData = {
        tenantName: 'Test Academy',
        tenantSlug: 'test-academy',
        ownerName: 'John Doe',
        ownerEmail: 'john@testacademy.com',
        password: 'password123'
      }

      const response = await app.inject({
        method: 'POST',
        url: '/tenants/signup',
        payload: signupData
      })

      expect(response.statusCode).toBe(400)
      const data = JSON.parse(response.body)
      expect(data.error).toBe('Email is already registered. Please use a different email.')
    })

    it('should validate required fields', async () => {
      const signupData = {
        tenantName: '',
        tenantSlug: 'ab', // too short
        ownerEmail: 'invalid-email',
        password: '123' // too short
      }

      const response = await app.inject({
        method: 'POST',
        url: '/tenants/signup',
        payload: signupData
      })

      expect(response.statusCode).toBe(400)
      const data = JSON.parse(response.body)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
    })
  })

  describe('POST /tenants/check-slug', () => {
    it('should return available for unused slug', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tenants/check-slug',
        payload: { slug: 'available-slug' }
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data).toMatchObject({
        available: true,
        slug: 'available-slug',
        suggestion: null
      })
    })

    it('should return unavailable for existing slug with suggestion', async () => {
      // Create existing tenant
      await prisma.tenant.create({
        data: {
          name: 'Existing Academy',
          slug: 'taken-slug'
        }
      })

      const response = await app.inject({
        method: 'POST',
        url: '/tenants/check-slug',
        payload: { slug: 'taken-slug' }
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data.available).toBe(false)
      expect(data.slug).toBe('taken-slug')
      expect(data.suggestion).toMatch(/^taken-slug-\d+$/)
    })

    it('should validate slug format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tenants/check-slug',
        payload: { slug: 'AB' } // invalid format
      })

      expect(response.statusCode).toBe(400)
      const data = JSON.parse(response.body)
      expect(data.error).toBe('Invalid slug format')
    })
  })

  describe('GET /tenants/current', () => {
    let tenantId: string
    let token: string

    beforeEach(async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Academy',
          slug: 'test-academy'
        }
      })
      tenantId = tenant.id

      const owner = await prisma.user.create({
        data: {
          tenantId,
          name: 'Owner',
          email: 'owner@test.com',
          password: 'hashedpassword',
          role: 'TENANT_OWNER'
        }
      })

      token = app.jwt.sign({
        userId: owner.id,
        email: owner.email,
        role: 'TENANT_OWNER',
        tenantId
      })
    })

    it('should return tenant info for authenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/tenants/current',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data.tenant).toMatchObject({
        name: 'Test Academy',
        slug: 'test-academy'
      })
      expect(data.stats).toMatchObject({
        totalUsers: 1,
        totalCourses: 0,
        totalStudents: 0,
        publishedCourses: 0
      })
    })

    it('should reject unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/tenants/current'
      })

      expect(response.statusCode).toBe(401)
      const data = JSON.parse(response.body)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('PUT /tenants/current', () => {
    let tenantId: string
    let ownerToken: string
    let studentToken: string

    beforeEach(async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Academy',
          slug: 'test-academy'
        }
      })
      tenantId = tenant.id

      const owner = await prisma.user.create({
        data: {
          tenantId,
          name: 'Owner',
          email: 'owner@test.com',
          password: 'hashedpassword',
          role: 'TENANT_OWNER'
        }
      })

      const student = await prisma.user.create({
        data: {
          tenantId,
          name: 'Student',
          email: 'student@test.com',
          password: 'hashedpassword',
          role: 'STUDENT'
        }
      })

      ownerToken = app.jwt.sign({
        userId: owner.id,
        email: owner.email,
        role: 'TENANT_OWNER',
        tenantId
      })

      studentToken = app.jwt.sign({
        userId: student.id,
        email: student.email,
        role: 'STUDENT',
        tenantId
      })
    })

    it('should allow tenant owner to update tenant settings', async () => {
      const updateData = {
        name: 'Updated Academy',
        settings: {
          branding: {
            primaryColor: '#FF0000'
          },
          features: {
            customDomain: true
          }
        }
      }

      const response = await app.inject({
        method: 'PUT',
        url: '/tenants/current',
        headers: {
          authorization: `Bearer ${ownerToken}`
        },
        payload: updateData
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data.message).toBe('Tenant updated successfully')
      expect(data.tenant.name).toBe('Updated Academy')
      expect(data.tenant.settings.branding.primaryColor).toBe('#FF0000')
    })

    it('should reject updates from non-owner users', async () => {
      const updateData = {
        name: 'Hacked Academy'
      }

      const response = await app.inject({
        method: 'PUT',
        url: '/tenants/current',
        headers: {
          authorization: `Bearer ${studentToken}`
        },
        payload: updateData
      })

      expect(response.statusCode).toBe(403)
      const data = JSON.parse(response.body)
      expect(data.error).toBe('Insufficient permissions')
    })

    it('should reject unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/tenants/current',
        payload: { name: 'Test' }
      })

      expect(response.statusCode).toBe(401)
      const data = JSON.parse(response.body)
      expect(data.error).toBe('Unauthorized')
    })
  })
})

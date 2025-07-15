import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Tenant registration schema
const tenantRegisterSchema = z.object({
  // Tenant details
  tenantName: z.string().min(1, 'Business name is required'),
  tenantSlug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  domain: z.string().url().optional(),
  
  // Owner user details
  ownerName: z.string().min(1, 'Name is required'),
  ownerEmail: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  
  // Plan selection
  plan: z.enum(['free', 'basic', 'pro']).default('free')
})

const tenantUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().url().optional(),
  settings: z.object({
    branding: z.object({
      primaryColor: z.string().optional(),
      logo: z.string().url().optional(),
      favicon: z.string().url().optional()
    }).optional(),
    features: z.object({
      customDomain: z.boolean().optional(),
      analytics: z.boolean().optional(),
      affiliates: z.boolean().optional()
    }).optional(),
    payment: z.object({
      stripePublishableKey: z.string().optional(),
      currency: z.string().default('USD').optional()
    }).optional()
  }).optional()
})

export default async function (fastify: FastifyInstance) {
  // Register new tenant and owner
  fastify.post('/signup', async (request, reply) => {
    try {
      const data = tenantRegisterSchema.parse(request.body)
      
      // Check if slug is available
      const existingTenant = await prisma.tenant.findUnique({
        where: { slug: data.tenantSlug }
      })
      
      if (existingTenant) {
        reply.status(400)
        return { error: 'Slug is already taken. Please choose a different one.' }
      }
      
      // Check if email is already used
      const existingUser = await prisma.user.findUnique({
        where: { email: data.ownerEmail }
      })
      
      if (existingUser) {
        reply.status(400)
        return { error: 'Email is already registered. Please use a different email.' }
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12)
      
      // Create tenant and owner in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name: data.tenantName,
            slug: data.tenantSlug,
            domain: data.domain,
            plan: data.plan,
            settings: JSON.stringify({
              branding: {
                primaryColor: '#3B82F6',
                logo: null,
                favicon: null
              },
              features: {
                customDomain: data.plan !== 'free',
                analytics: true,
                affiliates: data.plan === 'pro'
              },
              payment: {
                currency: 'USD'
              }
            })
          }
        })
        
        // Create tenant owner
        const owner = await tx.user.create({
          data: {
            tenantId: tenant.id,
            name: data.ownerName,
            email: data.ownerEmail,
            password: hashedPassword,
            role: 'TENANT_OWNER'
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        })
        
        return { tenant, owner }
      })
      
      // Generate JWT token
      const token = fastify.jwt.sign({
        userId: result.owner.id,
        email: result.owner.email,
        role: result.owner.role
      } as any)
      
      reply.status(201)
      return {
        message: 'Tenant registered successfully',
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          domain: result.tenant.domain,
          plan: result.tenant.plan
        },
        owner: result.owner,
        token,
        dashboardUrl: `https://${result.tenant.slug}.teacha.com/dashboard`,
        publicUrl: result.tenant.domain || `https://${result.tenant.slug}.teacha.com`
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400)
        return { error: 'Validation failed', details: error.errors }
      }
      
      fastify.log.error(error)
      reply.status(500)
      return { error: 'Failed to register tenant' }
    }
  })
  
  // Check if slug is available
  fastify.post('/check-slug', async (request, reply) => {
    try {
      const { slug } = z.object({
        slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/)
      }).parse(request.body)
      
      const existingTenant = await prisma.tenant.findUnique({
        where: { slug }
      })
      
      return {
        available: !existingTenant,
        slug,
        suggestion: existingTenant ? `${slug}-${Math.floor(Math.random() * 1000)}` : null
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400)
        return { error: 'Invalid slug format', details: error.errors }
      }
      
      reply.status(500)
      return { error: 'Failed to check slug availability' }
    }
  })
  
  // Get current tenant info (requires auth)
  fastify.get('/current', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify()
      } catch (err) {
        reply.status(401).send({ error: 'Unauthorized' })
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user as { userId: string; tenantId?: string; role: string }
      
      let tenantId = user.tenantId
      
      // If tenantId is not in JWT, fetch it from database
      if (!tenantId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { tenantId: true }
        })
        
        if (!dbUser?.tenantId) {
          reply.status(400)
          return { error: 'User is not associated with a tenant' }
        }
        
        tenantId = dbUser.tenantId
      }
      
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true
            }
          },
          courses: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              price: true,
              _count: {
                select: {
                  lessons: true,
                  enrollments: true
                }
              }
            }
          }
        }
      })
      
      if (!tenant) {
        reply.status(404)
        return { error: 'Tenant not found' }
      }
      
      return {
        tenant: {
          ...tenant,
          settings: JSON.parse(tenant.settings)
        },
        stats: {
          totalUsers: tenant.users.length,
          totalCourses: tenant.courses.length,
          totalStudents: tenant.users.filter(u => u.role === 'STUDENT').length,
          publishedCourses: tenant.courses.filter(c => c.status === 'PUBLISHED').length
        }
      }
    } catch (error) {
      fastify.log.error(error)
      reply.status(500)
      return { error: 'Failed to get tenant info' }
    }
  })
  
  // Update tenant settings (requires TENANT_OWNER or ADMIN role)
  fastify.put('/current', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify()
        const user = request.user as { role: string }
        if (!['TENANT_OWNER', 'ADMIN'].includes(user.role)) {
          reply.status(403).send({ error: 'Insufficient permissions' })
        }
      } catch (err) {
        reply.status(401).send({ error: 'Unauthorized' })
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user as { userId: string; tenantId?: string; role: string }
      const updates = tenantUpdateSchema.parse(request.body)
      
      let tenantId = user.tenantId
      
      // If tenantId is not in JWT, fetch it from database
      if (!tenantId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { tenantId: true }
        })
        
        if (!dbUser?.tenantId) {
          reply.status(400)
          return { error: 'User is not associated with a tenant' }
        }
        
        tenantId = dbUser.tenantId
      }
      
      // Prepare update data
      const updateData: any = {}
      if (updates.name) updateData.name = updates.name
      if (updates.domain !== undefined) updateData.domain = updates.domain
      
      if (updates.settings) {
        // Get current settings
        const currentTenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { settings: true }
        })
        
        const currentSettings = JSON.parse(currentTenant?.settings || '{}')
        const newSettings = {
          ...currentSettings,
          ...updates.settings,
          branding: { ...currentSettings.branding, ...updates.settings.branding },
          features: { ...currentSettings.features, ...updates.settings.features },
          payment: { ...currentSettings.payment, ...updates.settings.payment }
        }
        
        updateData.settings = JSON.stringify(newSettings)
      }
      
      const updatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: updateData
      })
      
      return {
        message: 'Tenant updated successfully',
        tenant: {
          ...updatedTenant,
          settings: JSON.parse(updatedTenant.settings)
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400)
        return { error: 'Validation failed', details: error.errors }
      }
      
      fastify.log.error(error)
      reply.status(500)
      return { error: 'Failed to update tenant' }
    }
  })
}

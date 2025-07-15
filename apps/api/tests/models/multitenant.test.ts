import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Multi-Tenant Database', () => {
  beforeEach(async () => {
    // Clean database before each test
    await prisma.enrollment.deleteMany()
    await prisma.lesson.deleteMany()
    await prisma.course.deleteMany()
    await prisma.user.deleteMany()
    await prisma.tenant.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Tenant Management', () => {
    it('should create a tenant with all fields', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Academy',
          slug: 'test-academy',
          domain: 'test.example.com',
          plan: 'pro',
          status: 'active',
          settings: JSON.stringify({
            branding: { primaryColor: '#007bff' },
            features: { analytics: true }
          })
        }
      })

      expect(tenant).toMatchObject({
        name: 'Test Academy',
        slug: 'test-academy',
        domain: 'test.example.com',
        plan: 'pro',
        status: 'active'
      })
      expect(tenant.id).toBeDefined()
      expect(tenant.createdAt).toBeDefined()
      expect(JSON.parse(tenant.settings)).toEqual({
        branding: { primaryColor: '#007bff' },
        features: { analytics: true }
      })
    })

    it('should enforce unique slug constraint', async () => {
      await prisma.tenant.create({
        data: {
          name: 'First Academy',
          slug: 'academy'
        }
      })

      await expect(
        prisma.tenant.create({
          data: {
            name: 'Second Academy',
            slug: 'academy' // Duplicate slug
          }
        })
      ).rejects.toThrow()
    })

    it('should enforce unique domain constraint', async () => {
      await prisma.tenant.create({
        data: {
          name: 'First Academy',
          slug: 'first',
          domain: 'academy.com'
        }
      })

      await expect(
        prisma.tenant.create({
          data: {
            name: 'Second Academy',
            slug: 'second',
            domain: 'academy.com' // Duplicate domain
          }
        })
      ).rejects.toThrow()
    })

    it('should allow null domains', async () => {
      const tenant1 = await prisma.tenant.create({
        data: {
          name: 'First Academy',
          slug: 'first'
        }
      })

      const tenant2 = await prisma.tenant.create({
        data: {
          name: 'Second Academy',
          slug: 'second'
        }
      })

      expect(tenant1.domain).toBeNull()
      expect(tenant2.domain).toBeNull()
    })
  })

  describe('User Management', () => {
    let tenant: any

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Test Academy',
          slug: 'test'
        }
      })
    })

    it('should create users with different roles', async () => {
      const tenantOwner = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'Owner User',
          email: 'owner@test.com',
          password: 'hashed',
          role: 'TENANT_OWNER'
        }
      })

      const instructor = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'Instructor User',
          email: 'instructor@test.com',
          password: 'hashed',
          role: 'INSTRUCTOR'
        }
      })

      const student = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'Student User',
          email: 'student@test.com',
          password: 'hashed',
          role: 'STUDENT'
        }
      })

      expect(tenantOwner.role).toBe('TENANT_OWNER')
      expect(instructor.role).toBe('INSTRUCTOR')
      expect(student.role).toBe('STUDENT')
    })

    it('should enforce tenant relationship', async () => {
      const user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed'
        }
      })

      const userWithTenant = await prisma.user.findUnique({
        where: { id: user.id },
        include: { tenant: true }
      })

      expect(userWithTenant?.tenant.name).toBe('Test Academy')
    })

    it('should enforce unique email constraint', async () => {
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'First User',
          email: 'test@example.com',
          password: 'hashed'
        }
      })

      await expect(
        prisma.user.create({
          data: {
            tenantId: tenant.id,
            name: 'Second User',
            email: 'test@example.com', // Duplicate email
            password: 'hashed'
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('Course Management', () => {
    let tenant1: any, tenant2: any

    beforeEach(async () => {
      tenant1 = await prisma.tenant.create({
        data: { name: 'Tenant 1', slug: 'tenant1' }
      })
      tenant2 = await prisma.tenant.create({
        data: { name: 'Tenant 2', slug: 'tenant2' }
      })
    })

    it('should create course with lessons', async () => {
      const course = await prisma.course.create({
        data: {
          tenantId: tenant1.id,
          title: 'Web Development',
          description: 'Learn web development',
          slug: 'web-dev',
          price: 299.99,
          status: 'PUBLISHED'
        }
      })

      const lesson = await prisma.lesson.create({
        data: {
          courseId: course.id,
          title: 'Introduction',
          description: 'Course introduction',
          content: '<p>Welcome to the course</p>',
          order: 1,
          duration: 30
        }
      })

      expect(course.title).toBe('Web Development')
      expect(parseFloat(course.price?.toString() || '0')).toBe(299.99)
      expect(lesson.title).toBe('Introduction')
      expect(lesson.order).toBe(1)
    })

    it('should enforce unique course slug within tenant', async () => {
      await prisma.course.create({
        data: {
          tenantId: tenant1.id,
          title: 'Course 1',
          slug: 'web-dev'
        }
      })

      await expect(
        prisma.course.create({
          data: {
            tenantId: tenant1.id, // Same tenant
            title: 'Course 2',
            slug: 'web-dev' // Duplicate slug
          }
        })
      ).rejects.toThrow()
    })

    it('should allow same course slug in different tenants', async () => {
      const course1 = await prisma.course.create({
        data: {
          tenantId: tenant1.id,
          title: 'Course 1',
          slug: 'web-dev'
        }
      })

      const course2 = await prisma.course.create({
        data: {
          tenantId: tenant2.id, // Different tenant
          title: 'Course 2',
          slug: 'web-dev' // Same slug, different tenant
        }
      })

      expect(course1.slug).toBe('web-dev')
      expect(course2.slug).toBe('web-dev')
      expect(course1.tenantId).not.toBe(course2.tenantId)
    })

    it('should support different course statuses', async () => {
      const draftCourse = await prisma.course.create({
        data: {
          tenantId: tenant1.id,
          title: 'Draft Course',
          slug: 'draft',
          status: 'DRAFT'
        }
      })

      const publishedCourse = await prisma.course.create({
        data: {
          tenantId: tenant1.id,
          title: 'Published Course',
          slug: 'published',
          status: 'PUBLISHED'
        }
      })

      const archivedCourse = await prisma.course.create({
        data: {
          tenantId: tenant1.id,
          title: 'Archived Course',
          slug: 'archived',
          status: 'ARCHIVED'
        }
      })

      expect(draftCourse.status).toBe('DRAFT')
      expect(publishedCourse.status).toBe('PUBLISHED')
      expect(archivedCourse.status).toBe('ARCHIVED')
    })
  })

  describe('Enrollment Management', () => {
    let tenant: any, user: any, course: any

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: { name: 'Test Academy', slug: 'test' }
      })

      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'Student',
          email: 'student@test.com',
          password: 'hashed',
          role: 'STUDENT'
        }
      })

      course = await prisma.course.create({
        data: {
          tenantId: tenant.id,
          title: 'Test Course',
          slug: 'test-course'
        }
      })
    })

    it('should create enrollment with progress tracking', async () => {
      const enrollment = await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: course.id,
          progress: 25
        }
      })

      expect(enrollment.progress).toBe(25)
      expect(enrollment.enrolledAt).toBeDefined()
      expect(enrollment.completedAt).toBeNull()
    })

    it('should enforce unique enrollment per user-course pair', async () => {
      await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: course.id
        }
      })

      await expect(
        prisma.enrollment.create({
          data: {
            userId: user.id,
            courseId: course.id // Duplicate enrollment
          }
        })
      ).rejects.toThrow()
    })

    it('should support course completion', async () => {
      const enrollment = await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: course.id,
          progress: 100,
          completedAt: new Date()
        }
      })

      expect(enrollment.progress).toBe(100)
      expect(enrollment.completedAt).toBeDefined()
    })

    it('should fetch enrollment with user and course details', async () => {
      await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: course.id,
          progress: 50
        }
      })

      const enrollmentWithDetails = await prisma.enrollment.findFirst({
        where: {
          userId: user.id,
          courseId: course.id
        },
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true, description: true } }
        }
      })

      expect(enrollmentWithDetails?.user.name).toBe('Student')
      expect(enrollmentWithDetails?.course.title).toBe('Test Course')
      expect(enrollmentWithDetails?.progress).toBe(50)
    })
  })

  describe('Tenant Isolation', () => {
    let tenant1: any, tenant2: any

    beforeEach(async () => {
      tenant1 = await prisma.tenant.create({
        data: { name: 'Tenant 1', slug: 'tenant1' }
      })
      tenant2 = await prisma.tenant.create({
        data: { name: 'Tenant 2', slug: 'tenant2' }
      })

      // Create users for each tenant
      await prisma.user.create({
        data: {
          tenantId: tenant1.id,
          name: 'User 1',
          email: 'user1@tenant1.com',
          password: 'hashed'
        }
      })

      await prisma.user.create({
        data: {
          tenantId: tenant2.id,
          name: 'User 2',
          email: 'user2@tenant2.com',
          password: 'hashed'
        }
      })

      // Create courses for each tenant
      await prisma.course.create({
        data: {
          tenantId: tenant1.id,
          title: 'Course 1',
          slug: 'course1'
        }
      })

      await prisma.course.create({
        data: {
          tenantId: tenant2.id,
          title: 'Course 2',
          slug: 'course2'
        }
      })
    })

    it('should isolate users by tenant', async () => {
      const tenant1Users = await prisma.user.findMany({
        where: { tenantId: tenant1.id }
      })

      const tenant2Users = await prisma.user.findMany({
        where: { tenantId: tenant2.id }
      })

      expect(tenant1Users).toHaveLength(1)
      expect(tenant2Users).toHaveLength(1)
      expect(tenant1Users[0].name).toBe('User 1')
      expect(tenant2Users[0].name).toBe('User 2')
    })

    it('should isolate courses by tenant', async () => {
      const tenant1Courses = await prisma.course.findMany({
        where: { tenantId: tenant1.id }
      })

      const tenant2Courses = await prisma.course.findMany({
        where: { tenantId: tenant2.id }
      })

      expect(tenant1Courses).toHaveLength(1)
      expect(tenant2Courses).toHaveLength(1)
      expect(tenant1Courses[0].title).toBe('Course 1')
      expect(tenant2Courses[0].title).toBe('Course 2')
    })

    it('should fetch complete tenant data with relations', async () => {
      const tenantWithData = await prisma.tenant.findUnique({
        where: { id: tenant1.id },
        include: {
          users: { select: { name: true, role: true } },
          courses: { 
            select: { 
              title: true, 
              status: true,
              _count: { select: { lessons: true, enrollments: true } }
            } 
          }
        }
      })

      expect(tenantWithData?.users).toHaveLength(1)
      expect(tenantWithData?.courses).toHaveLength(1)
      expect(tenantWithData?.users[0].name).toBe('User 1')
      expect(tenantWithData?.courses[0].title).toBe('Course 1')
    })
  })
})

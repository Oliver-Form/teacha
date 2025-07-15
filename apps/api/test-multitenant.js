#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testMultiTenantSchema() {
  console.log('🚀 Testing Multi-Tenant Database Schema...\n')

  try {
    // 1. Create a tenant
    console.log('1. Creating tenant...')
    const tenant = await prisma.tenant.create({
      data: {
        name: 'John Doe Academy',
        slug: 'johndoe',
        domain: 'courses.johndoe.com',
        plan: 'pro',
        settings: JSON.stringify({
          branding: {
            primaryColor: '#007bff',
            logo: 'https://example.com/logo.png'
          },
          features: {
            analytics: true,
            customDomain: true
          }
        })
      }
    })
    console.log('✅ Tenant created:', tenant.name, `(${tenant.slug})`)

    // 2. Create tenant owner
    console.log('\n2. Creating tenant owner...')
    const tenantOwner = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: 'John Doe',
        email: 'john@johndoe.com',
        password: 'hashedpassword123',
        role: 'TENANT_OWNER'
      }
    })
    console.log('✅ Tenant owner created:', tenantOwner.name, `(${tenantOwner.role})`)

    // 3. Create an instructor
    console.log('\n3. Creating instructor...')
    const instructor = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: 'Jane Smith',
        email: 'jane@johndoe.com',
        password: 'hashedpassword123',
        role: 'INSTRUCTOR'
      }
    })
    console.log('✅ Instructor created:', instructor.name, `(${instructor.role})`)

    // 4. Create a course
    console.log('\n4. Creating course...')
    const course = await prisma.course.create({
      data: {
        tenantId: tenant.id,
        title: 'Complete Web Development Masterclass',
        description: 'Learn HTML, CSS, JavaScript, React, and Node.js from scratch',
        slug: 'web-dev-masterclass',
        price: 299.99,
        status: 'PUBLISHED'
      }
    })
    console.log('✅ Course created:', course.title, `($${course.price})`)

    // 5. Create lessons
    console.log('\n5. Creating lessons...')
    const lessons = await Promise.all([
      prisma.lesson.create({
        data: {
          courseId: course.id,
          title: 'Introduction to HTML',
          description: 'Learn the basics of HTML markup',
          content: '<h1>Welcome to HTML</h1><p>This is your first lesson...</p>',
          order: 1,
          duration: 45
        }
      }),
      prisma.lesson.create({
        data: {
          courseId: course.id,
          title: 'CSS Fundamentals',
          description: 'Style your websites with CSS',
          content: '<h1>CSS Basics</h1><p>Learn how to style HTML elements...</p>',
          videoUrl: 'https://videos.johndoe.com/css-fundamentals.mp4',
          order: 2,
          duration: 60
        }
      }),
      prisma.lesson.create({
        data: {
          courseId: course.id,
          title: 'JavaScript Essentials',
          description: 'Add interactivity with JavaScript',
          content: '<h1>JavaScript</h1><p>Learn programming fundamentals...</p>',
          videoUrl: 'https://videos.johndoe.com/javascript-essentials.mp4',
          order: 3,
          duration: 90
        }
      })
    ])
    console.log('✅ Created', lessons.length, 'lessons')

    // 6. Create students
    console.log('\n6. Creating students...')
    const students = await Promise.all([
      prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'Alice Johnson',
          email: 'alice@example.com',
          password: 'hashedpassword123',
          role: 'STUDENT'
        }
      }),
      prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'Bob Wilson',
          email: 'bob@example.com',
          password: 'hashedpassword123',
          role: 'STUDENT'
        }
      })
    ])
    console.log('✅ Created', students.length, 'students')

    // 7. Enroll students in course
    console.log('\n7. Enrolling students...')
    const enrollments = await Promise.all([
      prisma.enrollment.create({
        data: {
          userId: students[0].id,
          courseId: course.id,
          progress: 33
        }
      }),
      prisma.enrollment.create({
        data: {
          userId: students[1].id,
          courseId: course.id,
          progress: 67
        }
      })
    ])
    console.log('✅ Created', enrollments.length, 'enrollments')

    // 8. Test tenant isolation - create second tenant
    console.log('\n8. Testing tenant isolation...')
    const tenant2 = await prisma.tenant.create({
      data: {
        name: 'Sarah\'s Courses',
        slug: 'sarah',
        plan: 'basic'
      }
    })

    const user2 = await prisma.user.create({
      data: {
        tenantId: tenant2.id,
        name: 'Sarah Connor',
        email: 'sarah@sarahcourses.com',
        password: 'hashedpassword123',
        role: 'TENANT_OWNER'
      }
    })
    console.log('✅ Second tenant created:', tenant2.name)

    // 9. Query tenant-specific data
    console.log('\n9. Testing tenant-specific queries...')
    
    // Get all users for tenant 1
    const tenant1Users = await prisma.user.findMany({
      where: { tenantId: tenant.id },
      select: { name: true, role: true }
    })
    console.log(`✅ Tenant 1 (${tenant.name}) has ${tenant1Users.length} users:`)
    tenant1Users.forEach(user => console.log(`   - ${user.name} (${user.role})`))

    // Get all courses for tenant 1
    const tenant1Courses = await prisma.course.findMany({
      where: { tenantId: tenant.id },
      include: {
        lessons: true,
        enrollments: {
          include: { user: { select: { name: true } } }
        }
      }
    })
    console.log(`✅ Tenant 1 has ${tenant1Courses.length} courses:`)
    tenant1Courses.forEach(course => {
      console.log(`   - ${course.title} (${course.lessons.length} lessons, ${course.enrollments.length} students)`)
    })

    // Get all users for tenant 2 (should be just 1)
    const tenant2Users = await prisma.user.findMany({
      where: { tenantId: tenant2.id },
      select: { name: true, role: true }
    })
    console.log(`✅ Tenant 2 (${tenant2.name}) has ${tenant2Users.length} users:`)
    tenant2Users.forEach(user => console.log(`   - ${user.name} (${user.role})`))

    // 10. Test unique constraints
    console.log('\n10. Testing unique constraints...')
    
    // Test tenant slug uniqueness
    try {
      await prisma.tenant.create({
        data: {
          name: 'Duplicate Slug Test',
          slug: 'johndoe', // This should fail
          plan: 'free'
        }
      })
      console.log('❌ ERROR: Duplicate slug was allowed!')
    } catch (error) {
      console.log('✅ Tenant slug uniqueness enforced')
    }

    // Test course slug uniqueness within tenant
    try {
      await prisma.course.create({
        data: {
          tenantId: tenant.id,
          title: 'Another Course',
          slug: 'web-dev-masterclass', // This should fail within same tenant
          price: 199.99
        }
      })
      console.log('❌ ERROR: Duplicate course slug was allowed within tenant!')
    } catch (error) {
      console.log('✅ Course slug uniqueness within tenant enforced')
    }

    // But same slug should work in different tenant
    const course2 = await prisma.course.create({
      data: {
        tenantId: tenant2.id,
        title: 'Sarah\'s Web Course',
        slug: 'web-dev-masterclass', // This should work in different tenant
        price: 199.99
      }
    })
    console.log('✅ Same course slug allowed in different tenant:', course2.title)

    console.log('\n🎉 Multi-tenant database schema test completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   - ${await prisma.tenant.count()} tenants`)
    console.log(`   - ${await prisma.user.count()} users`)
    console.log(`   - ${await prisma.course.count()} courses`)
    console.log(`   - ${await prisma.lesson.count()} lessons`)
    console.log(`   - ${await prisma.enrollment.count()} enrollments`)

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

testMultiTenantSchema()

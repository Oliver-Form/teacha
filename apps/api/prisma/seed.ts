import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Delete all existing data
  await prisma.user.deleteMany()

  // Create sample users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 25,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        age: 35,
      },
    }),
  ])

  console.log('Seeded users:', users)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

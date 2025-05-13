// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Hash the test password once
  const passwordHash = await bcrypt.hash('nello1234', 10);

  // Upsert roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });

  const studentRole = await prisma.role.upsert({
    where: { name: 'student' },
    update: {},
    create: { name: 'student' },
  });

  // Prepare 10 users: 2 admins + 8 students
  const users = [
    // Admin users
    {
      username: 'provost',
      email: 'provost@example.com',
      password: passwordHash,
      firstName: 'Admin',
      middleName: 'Super',
      lastName: 'One',
      roleId: adminRole.id,
    },
    {
      username: 'secretary',
      email: 'secretary@example.com',
      password: passwordHash,
      firstName: 'Admin',
      middleName: 'Exec',
      lastName: 'Two',
      roleId: adminRole.id,
    },
    // Student users
    ...Array.from({ length: 8 }).map((_, i) => ({
      username: `KSHIM/HIM/200${i + 1}`,
      email: `student${i + 1}@example.com`,
      password: passwordHash,
      firstName: `Student${i + 1}`,
      middleName: '',
      lastName: `Test${i + 1}`,
      roleId: studentRole.id,
    })),
  ];

  // Bulk create users; skip duplicates if re-running
  await prisma.user.createMany({
    data: users,
    skipDuplicates: true,
  });

  console.log('✅ Seed data created successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

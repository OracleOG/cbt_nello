// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Roles
  console.log('Creating roles...');
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
  
  // 2. Seed Users
  console.log('Creating users...');
  // Hash the test password once for efficiency
  const passwordHash = await bcrypt.hash('nello1234', 10);

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

  // 3. Seed Sessions and Semesters
  console.log('Creating sessions and semesters...');
  const [spring2025, fall2025] = await Promise.all([
    prisma.session.upsert({
      where: { code: 'SP2025' },
      update: {},
      create: { code: 'SP2025', name: 'Spring 2025' },
    }),
    prisma.session.upsert({
      where: { code: 'FA2025' },
      update: {},
      create: { code: 'FA2025', name: 'Fall 2025' },
    }),
  ]);

  const [sem1, sem2] = await Promise.all([
    prisma.semester.upsert({
      where: { code: 'SEM1' },
      update: {},
      create: { code: 'SEM1', name: 'Semester 1', sessionId: spring2025.id },
    }),
    prisma.semester.upsert({
      where: { code: 'SEM2' },
      update: {},
      create: { code: 'SEM2', name: 'Semester 2', sessionId: spring2025.id },
    }),
  ]);



  // 4. Seed a Test (Course Exam)

  const provost = await prisma.user.findUnique({
    where: { username: 'provost' },
  });
  
  console.log('Creating test...');
  const test = await prisma.test.create({
    data: {
      title: 'Management 101',
      durationMins: 60,
      availableFrom: new Date('2025-06-01T08:00:00Z'),
      availableTo: new Date('2025-06-01T10:00:00Z'),
      sessionId: spring2025.id,
      semesterId: sem1.id,
    }
  });

  // 5. Seed Questions & Options
  console.log('Creating questions and options...');
  const questionsData = [
    {
      text: 'The following are the concept of organization except,',
      options: [
        { label: 'a', text: 'Static concept.' },
        { label: 'b', text: 'Dynamic concept.' },
        { label: 'c', text: 'Informed concept.' },
      ],
      correct: 'c',
    },
    {
      text: 'Below are the characteristics of organization except,',
      options: [
        { label: 'a', text: 'Division of work.' },
        { label: 'b', text: 'Co-ordination.' },
        { label: 'c', text: 'Common objectives.' },
        { label: 'd', text: 'Division of ability.' },
      ],
      correct: 'd',
    },
    {
      text: '___________is the management function that follows after planning, it involves the assignment of tasks.',
      options: [
        { label: 'a', text: 'Organization.' },
        { label: 'b', text: 'Staffing.' },
        { label: 'c', text: 'Motivation.' },
        { label: 'd', text: 'Management.' },
      ],
      correct: 'b',
    },
    // Additional questions
    {
      text: 'Flexibility & navigational change are the principle of___________',
      options: [
        { label: 'a', text: 'Organization.' },
        { label: 'b', text: 'Primary care.' },
        { label: 'c', text: 'Staffing.' },
        { label: 'd', text: 'Planning.' },
      ],
      correct: 'd',
    },
    {
      text: '_________is the process the in which organization\'s leaders define their vision for the future and identify their organization\'s goals',
      options: [
        { label: 'a', text: 'Strategic planning.' },
        { label: 'b', text: 'Tactical planning' },
        { label: 'c', text: 'Operational planning.' },
        { label: 'd', text: 'One time plan.' },
      ],
      correct: 'a',
    },
    {
      text: 'Identification, prioritization, development and implementations are steps involve in______ planning.',
      options: [
        { label: 'a', text: 'Tactical planning.' },
        { label: 'b', text: 'Operational planning.' },
        { label: 'c', text: 'Strategic planning.' },
        { label: 'd', text: 'One time planning.' },
      ],
      correct: 'c',
    },
    {
      text: 'The following are the key actions in planning except.',
      options: [
        { label: 'a', text: 'Identify the problem.' },
        { label: 'b', text: 'Set SMART goal & objectives.' },
        { label: 'c', text: 'Determine indications.' },
        { label: 'd', text: 'Identify and collaborate with key stakeholders.' },
      ],
      correct: 'd',
    },
    {
      text: 'Adapting to current trends and meeting patients\' needs is the importance of____________',
      options: [
        { label: 'a', text: 'Health care planning.' },
        { label: 'b', text: 'Health planning.' },
        { label: 'c', text: 'Primary health care financing.' },
      ],
      correct: 'a',
    },
    {
      text: '___________ is the combination of characteristics and qualities that form an individual\'s distinctive identity.',
      options: [
        { label: 'a', text: 'Personality.' },
        { label: 'b', text: 'Interpersonally.' },
        { label: 'c', text: 'Self-esteem.' },
        { label: 'd', text: 'Self-satisfaction.' },
      ],
      correct: 'a',
    },
    {
      text: 'The following are the theories of personality except',
      options: [
        { label: 'a', text: 'Psychoanalytic theory' },
        { label: 'b', text: 'Behaviorist theory' },
        { label: 'c', text: 'Humanistic theory' },
        { label: 'd', text: 'Psychological theory.' },
      ],
      correct: 'd',
    },
    {
      text: '___________theory was developed by Sigmund Freud.',
      options: [
        { label: 'a', text: 'Trait perspective theory' },
        { label: 'b', text: 'Behaviorist theory' },
        { label: 'c', text: 'Psychoanalytic personality theory.' },
      ],
      correct: 'c',
    },
    {
      text: 'The following are the components of personality by Freud except',
      options: [
        { label: 'a', text: 'Instincts that drive behavior such as sex hunger & thirst.' },
        { label: 'b', text: 'Unconscious thought process.' },
        { label: 'c', text: 'Child hood event.' },
        { label: 'd', text: 'Human mentality.' },
      ],
      correct: 'd',
    },
    {
      text: '__________controls the instinctual urges of a person',
      options: [
        { label: 'a', text: 'Ego.' },
        { label: 'b', text: 'Id' },
        { label: 'c', text: 'Super Ego' },
        { label: 'd', text: 'None of the above' },
      ],
      correct: 'b',
    },
  ];

  console.log(`Adding ${questionsData.length} questions to test "${test.title}"...`);
  let questionCount = 0;
  
  for (const q of questionsData) {
    const question = await prisma.question.create({
      data: {
        text: q.text,
        difficulty: 1,
        test: { connect: { id: test.id } },
        createdBy: { connect: { id: provost.id } },
      }
    });
    
    await Promise.all(q.options.map(opt =>
      prisma.option.create({
        data: {
          label: opt.label,
          text: opt.text,
          isCorrect: opt.label === q.correct,
          questionId: question.id,
        }
      })
    ));
    
    questionCount++;
  }

  console.log('✅ Database seeding completed successfully!');
  console.log(`Created: ${users.length} users, 2 roles, 2 sessions, 2 semesters, 1 test, ${questionCount} questions`);
}

main()
  .catch(e => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// prisma/seed.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // 1. Seed Sessions and Semesters
  const [session_2024, session_2025 ] = await Promise.all([
    prisma.session.upsert({
      where: { code: '24/25' },
      update: {},
      create: { code: '24/25', name: '2024/2025' },
    }),
    prisma.session.upsert({
      where: { code: '25/26' },
      update: {},
      create: { code: '25/26', name: '2025/2026' },
    }),
  ])

  const [sem1, sem2] = await Promise.all([
    prisma.semester.upsert({
      where: { code: 'SEM1' },
      update: {},
      create: { code: 'SEM1', name: 'Semester 1', sessionId: session_2025.id },
    }),
    prisma.semester.upsert({
      where: { code: 'SEM2' },
      update: {},
      create: { code: 'SEM2', name: 'Semester 2', sessionId: session_2025.id },
    }),
  ])

  // 2. Seed a Test (Course Exam)
  const test = await prisma.test.create({
    data: {
      title: 'Management 101',
      durationMins: 60,
      availableFrom: new Date('2025-06-01T08:00:00Z'),
      availableTo: new Date('2025-06-01T10:00:00Z'),
      sessionId: session_2025.id,
      semesterId: sem1.id,
    }
  })

  // 3. Seed Questions & Options from provided CSV template
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
  ]

  for (const q of questionsData) {
    const question = await prisma.question.create({
      data: {
        text: q.text,
        correct: q.correct,
        difficulty: 1,
        test: { connect: { id: test.id } },
      }
    })
    await Promise.all(q.options.map(opt =>
      prisma.option.create({
        data: {
          label: opt.label,
          text: opt.text,
          questionId: question.id,
        }
      })
    ))
  }

  console.log('Seed complete: Sessions, Semesters, Test, Questions, Options')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

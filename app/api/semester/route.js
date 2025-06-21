// app/api/semesters/route.js
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    const where = sessionId
      ? { where: { sessionId: Number(sessionId) } }
      : {}

    // Lazy load prisma to avoid build-time connections
    const { default: prisma } = await import('@/lib/prisma');

    const semesters = await prisma.semester.findMany({
      select: { id: true, code: true, name: true, sessionId: true },
      ...where,
      orderBy: { code: 'asc' },
    })

    return NextResponse.json(semesters)
  } catch (err) {
    console.error('Error fetching semesters:', err)
    return NextResponse.json({ error: 'Unable to fetch semesters' }, { status: 500 })
  }
}

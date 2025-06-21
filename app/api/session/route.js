// app/api/sessions/route.js
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Lazy load prisma to avoid build-time connections
    const { default: prisma } = await import('@/lib/prisma');

    const sessions = await prisma.Session.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    })
    return NextResponse.json(sessions)
  } catch (err) {
    console.error('Error fetching sessions:', err)
    return NextResponse.json({ error: 'Unable to fetch sessions', details: err.message }, { status: 500 })
  }
}

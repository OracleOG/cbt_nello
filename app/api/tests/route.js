// app/api/tests/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const semesterId = searchParams.get('semesterId');

    if (!sessionId || !semesterId) {
      return NextResponse.json(
        { error: 'Both sessionId and semesterId are required' },
        { status: 400 }
      );
    }

    // Lazy load prisma to avoid build-time connections
    const { default: prisma } = await import('@/lib/prisma');

    const tests = await prisma.test.findMany({
      where: {
        sessionId: Number(sessionId),
        semesterId: Number(semesterId)
      },
      include: {
        _count: {
          select: { questions: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(tests);
  } catch (error) {
    console.error('Tests fetch error:', error);
    return NextResponse.json(
      { error: `Failed to fetch tests: ${error.message}`, details: error.message }, 
      { status: 500 }
    );
  }
}
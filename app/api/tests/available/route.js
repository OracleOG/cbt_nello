import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getSession(request);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lazy load prisma to avoid build-time connections
    const { default: prisma } = await import('@/lib/prisma');

    const tests = await prisma.test.findMany({
      where: { status: 'ENABLED' },
      select: {
        id: true,
        title: true,
        durationMins: true,
        _count: {
          select: { takers: true }
        }
      }
    });

    return NextResponse.json(tests);
  } catch (error) {
    console.error('Available tests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tests' },
      { status: 500 }
    );
  }
}
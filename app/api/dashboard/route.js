import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getSession(request);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'ADMIN') {
      const [tests, stats] = await Promise.all([
        prisma.test.findMany({
          include: {
            _count: {
              select: { takers: true }
            }
          }
        }),
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as totalTests,
            SUM(CASE WHEN status = 'ENABLED' THEN 1 ELSE 0 END) as activeTests,
            (SELECT COUNT(*) FROM "TestTaker") as studentsTaken
          FROM "Test"
        `
      ]);

      return NextResponse.json({ tests, stats: stats[0] });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
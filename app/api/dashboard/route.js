import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request) {
  const session = await getSession(request);
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
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

      return new Response(JSON.stringify({ tests, stats: stats[0] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to load dashboard data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
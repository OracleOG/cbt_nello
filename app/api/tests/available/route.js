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
    

    return new Response(JSON.stringify(tests), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch tests' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
import { NextResponse } from 'next/server';
import { getSession } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testId } = params;

    // Lazy load prisma to avoid build-time connections
    const { default: prisma } = await import('@/lib/prisma');

    const attempts = await prisma.testTaker.findMany({
      where: { testId: Number(testId) },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        Answer: true
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    return NextResponse.json(attempts);
  } catch (error) {
    console.error('Error fetching attempts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attempts' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from "@/lib/auth";

export async function POST(request, { params }) {
  const session = await getSession(request);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { testId } = params;
  const { userId } = await request.json();

  try {
    // Delete all answers first
    await prisma.answer.deleteMany({
      where: {
        userId,
        question: {
          testId: Number(testId)
        }
      }
    });

    // Then delete the test attempt
    await prisma.testTaker.deleteMany({
      where: {
        userId,
        testId: Number(testId)
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting attempt:', error);
    return NextResponse.json(
      { error: 'Failed to reset attempt' },
      { status: 500 }
    );
  }
}
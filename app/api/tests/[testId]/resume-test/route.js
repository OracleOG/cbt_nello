// app/api/tests/[testId]/resume-test/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testId } = await params;
    const numericTestId = Number(testId);
    
    if (!numericTestId || isNaN(numericTestId)) {
      return NextResponse.json(
        { error: 'Invalid Test ID' },
        { status: 400 }
      );
    }

    const attempt = await prisma.testTaker.findFirst({
      where: {
        userId: session.user.id,
        testId: numericTestId,
        completedAt: null
      },
      select: {
        id: true,
        timeRemaining: true,
        answers: true,
        startedAt: true
      }
    });

    if (!attempt) {
      return NextResponse.json(
        { error: 'No active attempt found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      attemptId: attempt.id,
      timeRemaining: attempt.timeRemaining,
      answers: attempt.answers,
      startedAt: attempt.startedAt
    });

  } catch (error) {
    console.error('Resume test error:', error);
    return NextResponse.json(
      { error: 'Failed to resume test' },
      { status: 500 }
    );
  }
}
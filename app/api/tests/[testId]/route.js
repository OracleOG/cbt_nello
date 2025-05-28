// app/api/tests/[testId]/route.js
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
        { error: 'Invalid Test ID format' },
        { status: 400 }
      );
    }

    const test = await prisma.test.findUnique({
      where: { 
        id: numericTestId,
        status: 'ENABLED' // Only fetch enabled tests
      },
      select: {
        id: true,
        title: true,
        durationMins: true,
        status: true,
        session: {
          select: {
            id: true,
            name: true
          }
        },
        semester: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            questions: true,
            takers: true
          }
        }
      }
    });

    if (!test) {
      return NextResponse.json(
        { error: 'Test not found or not available' },
        { status: 404 }
      );
    }

    return NextResponse.json({ test });

  } catch (error) {
    console.error('Test fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch test details',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
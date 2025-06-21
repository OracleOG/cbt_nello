// app/api/tests/[testId]/status/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { testId } = await params;
    const { status } = await request.json();

    if (!testId || isNaN(Number(testId))) {
      return NextResponse.json(
        { error: 'Invalid test ID' },
        { status: 400 }
      );
    }

    if (!status || !['ENABLED', 'DISABLED'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be either ENABLED or DISABLED' },
        { status: 400 }
      );
    }

    const updatedTest = await prisma.test.update({
      where: { id: Number(testId) },
      data: { status }
    });

    return NextResponse.json(updatedTest);
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update test status' },
      { status: 500 }
    );
  }
}
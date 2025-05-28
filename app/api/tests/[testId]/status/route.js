// app/api/tests/[testId]/status/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { testId } = params;
    const { status } = await request.json();

    const updatedTest = await prisma.test.update({
      where: { id: Number(testId) },
      data: { status }
    });

    return NextResponse.json(updatedTest);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update test status' },
      { status: 500 }
    );
  }
}
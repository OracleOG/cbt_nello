// app/api/tests/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const semesterId = searchParams.get('semesterId');

    if (!sessionId || !semesterId) {
      return NextResponse.json(
        { error: 'Both sessionId and semesterId are required' },
        { status: 400 }
      );
    }

    const tests = await prisma.test.findMany({
      where: {
        sessionId: Number(sessionId),
        semesterId: Number(semesterId)
      },
      include: {
        _count: {
          select: { questions: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(tests);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch tests' },
      { status: 500 }
    );
  }
}
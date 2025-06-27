import { NextResponse } from 'next/server';
import { getSession } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    // Verify admin session
    const session = await getSession(request);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' }, 
        { status: 401 }
      );
    }

    // Get testId from params
    const { testId } = params;
    console.log('testId', testId);
    if (!testId || isNaN(Number(testId))) {
      console.log('Invalid test ID');
      return NextResponse.json(
        { error: 'Invalid test ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const userId = body.userId;
    console.log('userId', body);
    
  
    // Lazy load prisma
    const { default: prisma } = await import('@/lib/prisma');

    // Verify test exists
    const testExists = await prisma.test.findUnique({
      where: { id: Number(testId) }
    });
    if (!testExists) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }

    // Verify user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!userExists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete answers first
    await prisma.answer.deleteMany({
      where: {
        userId: userId,
        question: {
          testId: Number(testId)
        }
      }
    });

    // Then delete test attempt
    await prisma.testTaker.deleteMany({
      where: {
        userId: userId,
        testId: Number(testId)
      }
    });

    return NextResponse.json({ 
      success: true,
      message: `Test attempt reset for user ${userId}`
    });

  } catch (error) {
    console.error('Reset attempt error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
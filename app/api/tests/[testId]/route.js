// app/api/tests/[testId]/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

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

    // Lazy load prisma to avoid build-time connections
    const { default: prisma } = await import('@/lib/prisma');

    let test;
    if (session.user.role === 'admin') {
      test = await prisma.test.findUnique({
        where: { id: numericTestId },
        select: {
          id: true,
          title: true,
          durationMins: true,
          status: true,
          session: { select: { id: true, name: true } },
          semester: { select: { id: true, name: true } },
          _count: { select: { questions: true, takers: true } }
        }
      });
    } else {
      test = await prisma.test.findUnique({
        where: { id: numericTestId, status: 'ENABLED' },
        select: {
          id: true,
          title: true,
          durationMins: true,
          status: true,
          session: { select: { id: true, name: true } },
          semester: { select: { id: true, name: true } },
          _count: { select: { questions: true, takers: true } }
        }
      });
    }

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

export async function PUT(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { testId } = await params;
    const numericTestId = Number(testId);

    if (!numericTestId || isNaN(numericTestId)) {
      return NextResponse.json(
        { error: 'Invalid Test ID format' },
        { status: 400 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { title, durationMins, questions } = body;

    // Validate required fields
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required and must be a string' },
        { status: 400 }
      );
    }

    if (!durationMins || isNaN(Number(durationMins)) || Number(durationMins) <= 0) {
      return NextResponse.json(
        { error: 'Duration must be a positive number' },
        { status: 400 }
      );
    }

    // Lazy load prisma to avoid build-time connections
    const { default: prisma } = await import('@/lib/prisma');

    // Check if test exists
    const existingTest = await prisma.test.findUnique({
      where: { id: numericTestId }
    });

    if (!existingTest) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }

    // Update test details
    const updatedTest = await prisma.test.update({
      where: { id: numericTestId },
      data: {
        title: title.trim(),
        durationMins: Number(durationMins)
      },
      select: {
        id: true,
        title: true,
        durationMins: true,
        status: true
      }
    });

    // Update questions if provided
    if (questions && Array.isArray(questions)) {
      // Delete existing questions and options
      await prisma.option.deleteMany({
        where: {
          question: {
            testId: numericTestId
          }
        }
      });

      await prisma.question.deleteMany({
        where: { testId: numericTestId }
      });

      // Create new questions and options
      for (const question of questions) {
        if (question.text && question.options && Array.isArray(question.options)) {
          const newQuestion = await prisma.question.create({
            data: {
              text: question.text,
              test: { connect: { id: numericTestId } }
            }
          });

          for (const option of question.options) {
            if (option.text) {
              await prisma.option.create({
                data: {
                  text: option.text,
                  isCorrect: option.isCorrect || false,
                  question: { connect: { id: newQuestion.id } }
                }
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      test: updatedTest,
      message: 'Test updated successfully'
    });

  } catch (error) {
    console.error('Test update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update test',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
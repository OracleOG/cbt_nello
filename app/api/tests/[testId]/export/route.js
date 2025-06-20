import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import Papa from 'papaparse';
import { getSession } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { testId } = await params;
    
    // validate testId is a number
    if (isNaN(testId)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }


    // Get test details
    const test = await prisma.test.findUnique({
      where: { id: Number(testId) },
      include: {
        questions: true,
        _count: {
          select: { questions: true }
        }
      }
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Get all attempts for this test
    const testTakers = await prisma.testTaker.findMany({
      where: { testId: Number(testId) },
      include: {
        user: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
            username: true // Using username as student ID
          }
        },
        Answer: {
          include: {
            question: true,
            option: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    let sn = 1;
    // Calculate scores and prepare data for CSV
    const results = testTakers.map(taker => {
      const correctAnswers = taker.Answer.filter(
        answer => answer.isCorrect
      ).length;
      const score = test.questions.length > 0 
        ? (correctAnswers / test.questions.length) * 100
        : 0;

      return {
        'S/N': sn++,
        'Student Name': `${taker.user.firstName} ${taker.user.middleName ? taker.user.middleName + ' ' : ''}${taker.user.lastName}`,
        'Student ID': taker.user.username,
        'Email': taker.user.email,
        'Course Name': test.title,
        'Total Questions': test.questions.length,
        'Answered Questions': taker.Answer.length,
        'Correct Answers': correctAnswers,
        'Score (%)': score.toFixed(2),
        'Start Time': taker.startedAt ? new Date(taker.startedAt).toLocaleString() : 'Not Started',
        'End Time': taker.completedAt ? new Date(taker.completedAt).toLocaleString() : 'Not Completed',
        'Status': taker.completedAt ? 'COMPLETED' : taker.startedAt ? 'IN_PROGRESS' : 'REGISTERED'
      };
    });

    // Convert to CSV
    const csv = Papa.unparse(results, {
      header: true,
      delimiter: ','
    });

    // Set headers for CSV download
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="test-${testId}-results.csv"`);

    return new NextResponse(csv, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Error exporting test results:', error);
    return NextResponse.json(
      { error: 'Failed to export test results', details: error.message },
      { status: 500 }
    );
  }
}
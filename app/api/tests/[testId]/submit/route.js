// app/api/tests/[testId]/submit/route.js
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const { testId } = await params;
    const { attemptId, answers } = await request.json();
    
    if (!testId || isNaN(Number(testId))) {
      return NextResponse.json(
        { error: "Invalid test ID" },
        { status: 400 }
      );
    }

    if (!attemptId || isNaN(Number(attemptId))) {
      return NextResponse.json(
        { error: "Missing or invalid attempt ID" },
        { status: 400 }
      );
    }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { error: "Answers must be provided as an object" },
        { status: 400 }
      );
    }

    // Lazy load prisma to avoid build-time connections
    const { default: prisma } = await import("@/lib/prisma");

    // Calculate score (example - modify based on your logic)
    const questions = await prisma.question.findMany({
      where: { testId: Number(testId) },
      include: { options: true }
    });

    let score = 0;
    const answerRecords = [];

    Object.entries(answers).forEach(([questionId, optionId]) => {
      const question = questions.find(q => q.id === Number(questionId));
      if (question) {
        const correctOption = question.options.find(o => o.isCorrect);
        if (correctOption && correctOption.id === Number(optionId)) {
          score += 1;
        }
        answerRecords.push({
          questionId: Number(questionId),
          optionId: Number(optionId),
          isCorrect: correctOption?.id === Number(optionId)
        });
      }
    });

    // Update test attempt
    await prisma.$transaction([
      prisma.testTaker.update({
        where: { id: Number(attemptId) },
        data: {
          score,
          completedAt: new Date(),
          answers: answerRecords // Store as JSON if needed
        }
      }),
      ...answerRecords.map(answer => 
        prisma.answer.create({
          data: {
            question: { connect: { id: answer.questionId } },
            option: { connect: { id: answer.optionId } },
            testTaker: { connect: { id: Number(attemptId) } },
            user: { connect: { id: session.user.id } },
            isCorrect: answer.isCorrect
          }
        })
      )
    ]);

    return NextResponse.json({ 
      success: true,
      score,
      totalQuestions: questions.length
    });

  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { 
        error: "Failed to submit test",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
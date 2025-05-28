// app/api/tests/[testId]/submit/route.js
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    
    if (!attemptId || !answers) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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
        where: { id: attemptId },
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
            testTaker: { connect: { id: attemptId } },
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
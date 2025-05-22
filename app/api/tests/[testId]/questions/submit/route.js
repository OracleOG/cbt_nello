// app/api/tests/[testId]/submit/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function POST(request, props) {
  const params = await props.params;
  try {
    const { testId } = params;
    const session = await getServerSession(authOptions, request);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, answers } = await request.json();
    
    // Record test attempt
    const testAttempt = await prisma.testTaker.create({
      data: {
        user: { connect: { id: userId } },
        test: { connect: { id: Number(testId) } },
        score: 0, // Calculate score if needed
        completedAt: new Date()
      }
    });

    // Record answers (simplified - you might want to calculate score here)
    await prisma.$transaction(
      Object.entries(answers).map(([questionId, optionId]) => 
        prisma.answer.create({
          data: {
            question: { connect: { id: Number(questionId) } },
            option: { connect: { id: Number(optionId) } },
            testTaker: { connect: { id: testAttempt.id } },
            user: { connect: { id: userId } }
          }
        })
      )
    );

    return NextResponse.json({ 
      success: true,
      attemptId: testAttempt.id
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to submit test" },
      { status: 500 }
    );
  }
}
// app/api/tests/[testId]/questions/route.js
import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import prisma from "@/lib/prisma";
import { shuffleWithSeed } from "@/lib/shuffle";

export async function GET(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const testId = Number(params.testId);
    
    const test = await prisma.test.findUnique({
      where: { 
        id: testId,
        status: "ENABLED"
      },
      include: {
        questions: {
          select: {
            id: true,
            text: true,
            options: {
              select: {
                id: true,
                text: true,
                isCorrect: true
              }
            }
          }
        }
      }
    });

    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    // Deterministic shuffle
    const seed = `${session.user.id}-${testId}`;
    const shuffledQuestions = shuffleWithSeed(test.questions, seed);

    return NextResponse.json({
      questions: shuffledQuestions.map(question => ({
        ...question,
        options: shuffleWithSeed(question.options, seed + question.id)
      }))
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch questions", details: error.message },
      { status: 500 }
    );
  }
}
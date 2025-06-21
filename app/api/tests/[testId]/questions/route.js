// app/api/tests/[testId]/questions/route.js
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { shuffleWithSeed } from "@/lib/shuffle";

export async function GET(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const { testId } = await params;
    const numTestId = Number(testId);
    
    if (!numTestId || isNaN(numTestId)) {
      return NextResponse.json(
        { error: "Valid Test ID is required" },
        { status: 400 }
      );
    }

    // Lazy load prisma to avoid build-time connections
    const { default: prisma } = await import("@/lib/prisma");

    // Fetch test with questions and their options
    const test = await prisma.test.findUnique({
      where: { 
        id: numTestId,
        status: "ENABLED"
      },
      include: {
        questions: {
          include: {  // Changed from 'select' to 'include' for more reliable relation loading
            options: true
          },
          where: {    // Only include questions that have options
            options: {
              some: {}
            }
          }
        }
      }
    });

    if (!test) {
      return NextResponse.json(
        { error: "Test not found or not enabled" },
        { status: 404 }
      );
    }

    if (!test.questions?.length) {
      return NextResponse.json(
        { error: "No questions with options available for this test" },
        { status: 404 }
      );
    }

    // Add validation before shuffling
    const validQuestions = test.questions.filter(q => 
      q?.id && q?.text && Array.isArray(q?.options)
    );

    if (!validQuestions.length) {
      return NextResponse.json(
        { error: "No valid questions available" },
        { status: 404 }
      );
    }

    // Deterministic shuffle
    const seed = `${session.user.id}-${numTestId}`;
    const shuffledQuestions = shuffleWithSeed(validQuestions, seed);

    return NextResponse.json({
      questions: shuffledQuestions.map(question => ({
        id: question.id,
        text: question.text,
        options: shuffleWithSeed(question.options, seed + question.id)
      }))
    });

  } catch (error) {
    console.error("Questions fetch error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch questions",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
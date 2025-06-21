// app/api/tests/[testId]/init/route.js
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { testId } = await params;
    if (!testId) {
      return NextResponse.json(
        { error: "Test ID is required", message: `test Id = ${testId}` },
        { status: 400 }
      );
    }

    // Lazy load prisma to avoid build-time connections
    const { default: prisma } = await import("@/lib/prisma");

    // Check for an existing attempt
    const existingAttempt = await prisma.testTaker.findFirst({
      where: {
        userId: session.user.id,
        testId: Number(testId)
      }
    });

    if (existingAttempt && existingAttempt.completedAt) {
      return NextResponse.json({ error: "Test already completed" }, { status: 403 });
    }
    if (existingAttempt) {
      return NextResponse.json({
        resumed: true,
        attemptId: existingAttempt.id,
        timeRemaining: existingAttempt.timeRemaining,
        answers: existingAttempt.answers
      });
    }

    // Get the test data
    const test = await prisma.test.findUnique({
      where: { id: Number(testId) },
      select: { durationMins: true }
    });
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Use upsert to create a new attempt
    const newAttempt = await prisma.testTaker.upsert({
      where: {
        userId_testId: { userId: session.user.id, testId: Number(testId) }
      },
      update: {},
      create: {
        startedAt: new Date(),
        answers: {},
        timeRemaining: test.durationMins,
        user: { connect: { id: session.user.id } },
        test: { connect: { id: Number(testId) } }
      }
    });

    return NextResponse.json({
      resumed: false,
      attemptId: newAttempt.id,
      startedAt: newAttempt.startedAt
    });
  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json(
      { error: `Failed to initialize test \n ${error.message}`, details: error.message },
      { status: 500 }
    );
  }
}
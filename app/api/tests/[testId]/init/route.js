// app/api/tests/[testId]/init/route.js
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const {testId} = await params;
    //testId = Number(testId);
    if (!testId) {
      return NextResponse.json({ error: "Test ID is required", message: `test Id = ${testId}` }, { status: 400 });
    }
    
    // Check existing attempt
    const existingAttempt = await prisma.testTaker.findFirst({
      where: {
        userId: session.user.id,
        testId: Number(testId),
        
      }
    });

    // If an existing attempt is found, but has already been completed
    if (existingAttempt && existingAttempt.completedAt) {
      return NextResponse.json({ error: "Test already completed" }, { status: 403 });
    }
    // If an existing attempt is found and is still in progress, return it

    if (existingAttempt) {
      return NextResponse.json({
        resumed: true,
        attemptId: existingAttempt.id,
        timeRemaining: existingAttempt.timeRemaining,
        answers: existingAttempt.answers
      });
    }

    // Create new attempt
    // Get the test data to access duration
    const test = await prisma.test.findUnique({
      where: { id: Number(testId) },
      select: { durationMins: true }
    });
    
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }
    
    const newAttempt = await prisma.testTaker.create({
      data: {
      startedAt: new Date(),
      answers: {},
      timeRemaining: test.durationMins, // Set from test's duration
      user: { connect: { id: session.user.id } },
      test: { connect: { id: Number(testId) } }
      }
    });

    return NextResponse.json({
      resumed: false,
      attemptId: newAttempt.id,
      startedAt: newAttempt.startedAt,
    });

  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json(
      { error: `Failed to initialize test \n ${error.message}`, details: error.message },
      { status: 500 }
    );
  }
}
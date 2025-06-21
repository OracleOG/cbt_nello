// app/api/tests/[testId]/save/route.js
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { testId } = params;
    const { attemptId, answers, timeRemaining } = await request.json();
    
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

    if (timeRemaining !== undefined && (isNaN(Number(timeRemaining)) || Number(timeRemaining) < 0)) {
      return NextResponse.json(
        { error: "Invalid time remaining value" },
        { status: 400 }
      );
    }

    const updated = await prisma.testTaker.update({
      where: {
        id: Number(attemptId),
        userId: session.user.id,
        completedAt: null
      },
      data: {
        answers: answers || {},
        timeRemaining: timeRemaining !== undefined ? Number(timeRemaining) : 0
      }
    });

    return NextResponse.json({ success: true, data: updated });

  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json(
      { 
        error: "Failed to save progress",
        details: error.message 
      },
      { status: 500 }
    );
  }
}
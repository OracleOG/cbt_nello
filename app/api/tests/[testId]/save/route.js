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

    const { attemptId, answers, timeRemaining } = await request.json();
    
    if (!attemptId) {
      return NextResponse.json(
        { error: "Missing attempt ID" },
        { status: 400 }
      );
    }

    const updated = await prisma.testTaker.update({
      where: {
        id: attemptId,
        userId: session.user.id,
        completedAt: null
      },
      data: {
        answers: answers || {},
        timeRemaining: timeRemaining || 0
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
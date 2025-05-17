// app/api/create-bulk-test/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    // 1. Authentication & Authorization
    const session = await getServerSession(authOptions, request);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 2. Parse and validate request body
    const { 
      title,
      durationMins,
      availableFrom,
      availableTo,
      sessionId,
      semesterId,
      questions
    } = await request.json();

    // Validate required fields
    if (!title || !durationMins || !sessionId || !semesterId) {
      return NextResponse.json(
        { error: "Missing required fields (title, durationMins, sessionId, semesterId)" },
        { status: 400 }
      );
    }

    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { error: "Questions must be an array" },
        { status: 400 }
      );
    }

    // 3. Create test record first
    const test = await prisma.test.create({
      data: {
        title,
        durationMins: Number(durationMins),
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableTo: availableTo ? new Date(availableTo) : null,
        session: { connect: { id: Number(sessionId) } },
        semester: { connect: { id: Number(semesterId) } },
        createdBy: { connect: { id: session.user.id } }
      },
      select: { id: true }
    });

    // 4. Create questions and options in transaction
    const questionResults = await prisma.$transaction(
      questions.map(q => {
        // Validate question structure
        if (!q.text || !Array.isArray(q.options) || q.options.length < 2) {
          throw new Error(`Invalid question format: ${JSON.stringify(q)}`);
        }

        return prisma.question.create({
          data: {
            text: q.text,
            test: { connect: { id: test.id } },
            createdBy: { connect: { id: session.user.id } },
            options: {
              create: q.options.map(opt => ({
                label: opt.label,
                text: opt.text,
                isCorrect: Boolean(opt.isCorrect)
              }))
            }
          }
        });
      })
    );

    return NextResponse.json({
      message: "Test and questions created successfully",
      testId: test.id,
      createdQuestions: questionResults.length
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating test:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create test" },
      { status: 500 }
    );
  }
}
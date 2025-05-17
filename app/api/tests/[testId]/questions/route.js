import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { getApiRouteSession } from "@/lib/next-auth-utils";


export async function GET(request, context) {
  try {
    const testId = await context.params.testId; // Removed 'await' from params

    const session = await getServerSession(authOptions)
    
    
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch test with questions
    const test = await prisma.test.findUnique({
      where: { id: Number(testId) },
      include: {
        questions: {
          select: {
            id: true,
            text: true,
            options: {
              select: {
                id: true,
                label: true,
                text: true,
                isCorrect: true
              }
            }
          }
        }
      }
    });

    if (!test) {
      return new NextResponse(
        JSON.stringify({ error: "Test not found" }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Simple shuffle - for better randomization consider a proper algorithm
    const shuffledQuestions = [...test.questions].sort(() => Math.random() - 0.5);

    return new NextResponse(
      JSON.stringify({
        testId: test.id,
        durationMins: 5,//test.durationMins,
        questions: shuffledQuestions
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("Error fetching test questions:", error);
    return new NextResponse(
      JSON.stringify({ 
        error: "Failed to fetch test questions",
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
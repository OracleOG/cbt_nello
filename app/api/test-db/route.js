import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Lazy load prisma to avoid build-time connections
    const { default: prisma } = await import('@/lib/prisma');
    
    // Test database connection
    const userCount = await prisma.user.count();
    
    // Get a sample user (without password)
    const sampleUser = await prisma.user.findFirst({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      userCount,
      sampleUser,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
} 
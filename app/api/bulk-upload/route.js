import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request) {
    try {
        const { users } = await request.json();

        if (!Array.isArray(users) || users.length === 0) {
            return NextResponse.json(
                { error: "Users array is required and must not be empty" },
                { status: 400 }
            );
        }

        // Lazy load prisma to avoid build-time connections
        const { default: prisma } = await import("@/lib/prisma");

        const studentRole = await prisma.role.findFirst({
            where: { name: 'student' },
        });

        const adminRole = await prisma.role.findFirst({
            where: { name: 'admin' },
        });

        if (!studentRole || !adminRole) {
            return NextResponse.json(
                { error: "Required roles not found in database" },
                { status: 500 }
            );
        }

        const hashedUsers = await Promise.all(
            users.map(async (user) => ({
                ...user,
                password: await bcrypt.hash(user.password, 10),
                roleId: user.role === 'admin' ? adminRole.id : studentRole.id,
            }))
        );

        const createdUsers = await prisma.user.createMany({
            data: hashedUsers,
        });

        return NextResponse.json({ 
            message: "Users created successfully", 
            createdUsers 
        });
    } catch (error) {
        console.error("Bulk upload error:", error);
        return NextResponse.json(
            { error: "Failed to create users" },
            { status: 500 }
        );
    }
}


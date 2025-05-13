import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request) {
    const { users } = await request.json();

    const studentRole = await prisma.role.findFirst({
        where: { name: 'student' },
    })

    const adminRole = await prisma.role.findFirst({
        where: { name: 'admin' },
    })

    const hashedUsers = await Promise.all(
        users.map(async (user) => ({
            ...user,
            password: await bcrypt.hash(user.password, 10),
            roleId: user.role === 'admin' ? adminRole.id : studentRole.id,
        }))
    )

    const createdUsers = await prisma.user.createMany({
        data: hashedUsers,
    });

    return NextResponse.json({ message: "Users created successfully", createdUsers }); 
}


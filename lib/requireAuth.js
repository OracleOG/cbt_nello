import  { NextResponse } from "next/server";
import { getSession } from "./auth";

export async function requireAuth(handler, {role}={}) {
    return async (req, res) => {
        const session = await getSession(req)
        if (!session) {
            return NextResponse.redirect('/auth/login', {message: "You are not Authenticated yet"});
        }
        if (role && session.user.role !== role) {
            return NextResponse.redirect('/auth/login', {message: "You are Forbidden from accessing this page"});
        }

        req.session = session;
        return handler(req, res);
    }
}

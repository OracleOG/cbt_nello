// lib/auth.js
import { getToken } from "next-auth/jwt";

export async function getSession(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    return token ? { user: token } : null;
  } catch (error) {
    console.error("Middleware auth error:", error);
    return null;
  }
}

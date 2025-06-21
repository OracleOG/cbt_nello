import NextAuth from "next-auth";

// Dynamic auth options to prevent build-time database connections
const getAuthOptions = () => {
  return {
    providers: [
      {
        id: "credentials",
        name: "Credentials",
        type: "credentials",
        credentials: {
          username: { label: "username", type: "text" },
          password: { label: "password", type: "password" },
        },
        async authorize(credentials) {
          // Skip during build time
          if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
            return null;
          }

          try {
            const { default: prisma } = await import("@/lib/prisma");
            const bcrypt = await import("bcryptjs");
            
            const user = await prisma.user.findUnique({
              where: { username: credentials.username },
              include: { role: true }
            });

            if (!user) return null;

            const valid = await bcrypt.compare(credentials.password, user.password);
            if (!valid) return null;

            return {
              id: user.id,
              username: user.username,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role.name,
              roleId: user.roleId
            };
          } catch (error) {
            console.error("Auth error:", error);
            return null;
          }
        },
      },
    ],
    pages: {
      signIn: "/signin",
    },
    session: {
      strategy: "jwt",
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.username = user.username;
          token.role = user.role;
          token.roleId = user.roleId;
          token.firstName = user.firstName;
          token.lastName = user.lastName;
        }
        return token;
      },
      async session({ session, token }) {
        if (token) {
          session.user.id = token.id;
          session.user.username = token.username;
          session.user.role = token.role;
          session.user.roleId = token.roleId;
          session.user.firstName = token.firstName;
          session.user.lastName = token.lastName;
        }
        return session;
      },
    },
    secret: process.env.NEXTAUTH_SECRET,
  };
};

const handler = NextAuth(getAuthOptions());

export { handler as GET, handler as POST };

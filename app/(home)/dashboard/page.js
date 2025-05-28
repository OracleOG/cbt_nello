'use client';

import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  console.log("Session data:", session);

  if (status === "loading") return <p>Loading...</p>;

  if (!session) {
    return <p>Access forbidden. Please log in.</p>;  // fallback, just in case
  }
  const handleLogOut = () => {
    signOut({ callbackUrl: '/auth/login' });

    }
  return (
    <>
    <div>
      <h1>Welcome {session.user?.firstName}</h1>
    </div>
    <div>

    </div>
    <button onClick={handleLogOut}>
        logout
    </button>
    </>
  );
}
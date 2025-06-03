'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import AdminDashboard from './AdminDashboard';
import StudentDashboard from './StudentDashboard';


export default function Dashboard() {
  const { data: session, status } = useSession();
  const [tests, setTests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();
        
        if (session?.user?.role === 'ADMIN') {
          setTests(data.tests);
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      loadData();
    }
  }, [status, session]);

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return <div>Please login to access dashboard</div>;

  return (
    <div className="dashboard-container">
      <h1>Welcome, {session?.user?.firstName}</h1>
      
      {session?.user?.role === 'ADMIN' ? (
        <AdminDashboard tests={tests} stats={stats} loading={loading} />
      ) : (
        <StudentDashboard />
      )}
    </div>
  );
}

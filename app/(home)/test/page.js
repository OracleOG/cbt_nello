// app/test/page.js
'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TestManagement() {
  const { data: session } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    sessionId: '',
    semesterId: ''
  });
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    if (session === undefined) {
      // Session is still loading
      setIsLoadingSession(true);
    } else {
      // Session is loaded
      setIsLoadingSession(false);
      
      if (session?.user?.role !== 'admin') {
        router.push('/unauthorized');
      }
    }
  }, [session, router]);
  

  
  // Fetch sessions
  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/session');
        if (!res.ok) throw new Error('Failed to fetch sessions');
        setSessions(await res.json());
      } catch (err) {
        console.error('Error fetching sessions:', err);
      }
    }
    fetchSessions();
  }, []);

  // Fetch semesters when session changes
  useEffect(() => {
    async function fetchSemesters() {
      if (!filters.sessionId) {
        setSemesters([]);
        return;
      }
      try {
        const res = await fetch(`/api/semester?sessionId=${filters.sessionId}`);
        if (!res.ok) throw new Error('Failed to fetch semesters');
        setSemesters(await res.json());
      } catch (err) {
        console.error('Error fetching semesters:', err);
      }
    }
    fetchSemesters();
  }, [filters.sessionId]);

  // Fetch tests when filters change
  useEffect(() => {
    async function fetchTests() {
      if (!filters.sessionId || !filters.semesterId) {
        setTests([]);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(
          `/api/tests?sessionId=${filters.sessionId}&semesterId=${filters.semesterId}`
        );
        if (!res.ok) throw new Error('Failed to fetch tests');
        setTests(await res.json());
      } catch (err) {
        console.error('Error fetching tests:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTests();
  }, [filters.sessionId, filters.semesterId]);

  if (isLoadingSession) {
    return <div>Loading...</div>;
  }

  const toggleTestStatus = async (testId, currentStatus) => {
    try {
      const res = await fetch(`/api/tests/${testId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: currentStatus === 'ENABLED' ? 'DISABLED' : 'ENABLED'
        })
      });
      if (!res.ok) throw new Error('Failed to update test status');

      const updatedTest = await res.json();
      
      // Update local state
      setTests(tests.map(test => 
        test.id === testId 
          ? { ...test, status: updatedTest.status }
          : test
      ));
    } catch (err) {
      console.error('Error toggling test status:', err);
    }
  };

  return (
    <div className="container">
      <h1>Test Management</h1>
      
      <div className="filter-section">
        <div className="filter-row">
          <div>
            <label>Session</label>
            <select
              value={filters.sessionId}
              onChange={(e) => setFilters({
                ...filters,
                sessionId: e.target.value,
                semesterId: ''
              })}
            >
              <option value="">Select Session</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label>Semester</label>
            <select
              value={filters.semesterId}
              onChange={(e) => setFilters({
                ...filters,
                semesterId: e.target.value
              })}
              disabled={!filters.sessionId}
            >
              <option value="">Select Semester</option>
              {semesters.map(semester => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="test-list">
        {loading ? (
          <div className="loading">Loading tests...</div>
        ) : tests.length === 0 ? (
          <div className="empty-state">
            {filters.sessionId && filters.semesterId 
              ? 'No tests found for selected filters' 
              : 'Please select a session and semester'}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Duration</th>
                <th>Questions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(test => (
                <tr key={test.id}>
                  <td>{test.title}</td>
                  <td>{test.durationMins} mins</td>
                  <td>{test._count.questions}</td>
                  <td>
                    <span className={`status ${test.status.toLowerCase()}`}>
                      {test.status}
                    </span>
                  </td>
                  <td className="actions">
                    <Link 
                      href={`/test/edit/${test.id}`}
                      className="edit-btn"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => toggleTestStatus(test.id, test.status)}
                      className={`toggle-btn ${test.status.toLowerCase()}`}
                    >
                      {test.status === 'ENABLED' ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .filter-section {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .filter-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .test-list {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        th, td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        
        th {
          background: #f9f9f9;
          font-weight: 600;
        }
        
        .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }
        
        .status.enabled {
          background: #e6f7ee;
          color: #10b981;
        }
        
        .status.disabled {
          background: #fff1f1;
          color: #ef4444;
        }
        
        .actions {
          display: flex;
          gap: 10px;
        }
        
        .edit-btn, .toggle-btn {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          border: none;
        }
        
        .edit-btn {
          background: #3b82f6;
          color: white;
          text-decoration: none;
        }
        
        .toggle-btn.enabled {
          background: #ef4444;
          color: white;
        }
        
        .toggle-btn.disabled {
          background: #10b981;
          color: white;
        }
        
        .loading, .empty-state {
          padding: 20px;
          text-align: center;
          color: #666;
        }
      `}</style>
    </div>
  );
}
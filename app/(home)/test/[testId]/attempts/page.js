'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function TestAttemptsPage() {
  const { testId } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) return;
    if (session.user.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }

    const fetchAttempts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tests/${testId}/attempts`);
        if (!res.ok) throw new Error('Failed to fetch attempts');
        const data = await res.json();
        setAttempts(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttempts();
  }, [testId, session, router]);

  const handleResetAttempt = async () => {
    if (!selectedUser) return;
    
    try {
      setIsResetting(true);
      setError(null);
      
      const response = await fetch(`/api/tests/${testId}/attempts/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset attempt');
      }

      // Refresh attempts list
      const updatedResponse = await fetch(`/api/tests/${testId}/attempts`);
      if (!updatedResponse.ok) throw new Error('Failed to refresh attempts');
      setAttempts(await updatedResponse.json());
      
      setSelectedUser(null);
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) return <div className="loading">Loading attempts...</div>;

  return (
    <div className="container">
      <div className="header">
        <h1>Test Attempts Management</h1>
        <Link href="/tests" className="back-link">
          ← Back to Tests
        </Link>
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      <div className="attempts-list">
        <h2>Test Attempts</h2>
        
        {attempts.length === 0 ? (
          <p>No attempts found for this test</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Completed</th>
                  <th>Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map(attempt => (
                  <tr 
                    key={attempt.id} 
                    className={selectedUser?.id === attempt.user.id ? 'selected' : ''}
                  >
                    <td>
                      {attempt.user.firstName} {attempt.user.lastName}
                      <br />
                      <small>{attempt.user.email}</small>
                    </td>
                    <td>
                      <span className={`status ${attempt.completedAt ? 'completed' : 'in-progress'}`}>
                        {attempt.completedAt ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                    <td>{new Date(attempt.startedAt).toLocaleString()}</td>
                    <td>{attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : '-'}</td>
                    <td>{attempt.score ? `${attempt.score}%` : '-'}</td>
                    <td>
                      <button
                        onClick={() => setSelectedUser(attempt.user)}
                        disabled={isResetting}
                        className={`select-btn ${selectedUser?.id === attempt.user.id ? 'selected' : ''}`}
                      >
                        {selectedUser?.id === attempt.user.id ? 'Selected' : 'Select'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="reset-section">
          <h3>Reset Attempt for {selectedUser.firstName} {selectedUser.lastName}</h3>
          <p className="warning-text">
            Warning: This will permanently delete all records of this user's attempt.
          </p>
          <button
            onClick={handleResetAttempt}
            disabled={isResetting}
            className="reset-btn"
          >
            {isResetting ? 'Processing...' : 'Confirm Reset'}
          </button>
          <button
            onClick={() => setSelectedUser(null)}
            disabled={isResetting}
            className="cancel-btn"
          >
            Cancel
          </button>
        </div>
      )}

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        
        .loading {
          padding: 2rem;
          text-align: center;
        }
        
        .error-message {
          color: #ef4444;
          background: #fee2e2;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .attempts-list {
          background: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 2rem;
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        
        th, td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        
        tr.selected {
          background-color: #eff6ff;
        }
        
        .status {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .status.completed {
          background: #dcfce7;
          color: #166534;
        }
        
        .status.in-progress {
          background: #fef9c3;
          color: #854d0e;
        }
        
        .select-btn {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .select-btn:hover {
          background: #2563eb;
        }
        
        .select-btn.selected {
          background: #1d4ed8;
        }
        
        .select-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }
        
        .reset-section {
          background: #fff1f2;
          border: 1px solid #ffe4e6;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-top: 2rem;
        }
        
        .warning-text {
          color: #b91c1c;
          margin: 1rem 0;
        }
        
        .reset-btn {
          padding: 0.75rem 1.5rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          margin-right: 1rem;
          transition: background 0.2s;
        }
        
        .reset-btn:hover {
          background: #dc2626;
        }
        
        .reset-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }
        
        .cancel-btn {
          padding: 0.75rem 1.5rem;
          background: #e5e7eb;
          color: #4b5563;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .cancel-btn:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}
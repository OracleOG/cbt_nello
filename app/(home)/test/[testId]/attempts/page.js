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
                  <th className="student-column">Student</th>
                  <th className="status-column">Status</th>
                  <th className="date-column">Started</th>
                  <th className="date-column">Completed</th>
                  <th className="score-column">Score</th>
                  <th className="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map(attempt => (
                  <tr 
                    key={attempt.id} 
                    className={selectedUser?.id === attempt.user.id ? 'selected' : ''}
                  >
                    <td className="student-column">
                      <div className="student-info">
                        <span className="student-name">
                          {attempt.user.firstName} {attempt.user.lastName}
                        </span>
                        <span className="student-email">{attempt.user.email}</span>
                      </div>
                    </td>
                    <td className="status-column">
                      <span className={`status ${attempt.completedAt ? 'completed' : 'in-progress'}`}>
                        {attempt.completedAt ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                    <td className="date-column">
                      {new Date(attempt.startedAt).toLocaleDateString()}
                      <br />
                      {new Date(attempt.startedAt).toLocaleTimeString()}
                    </td>
                    <td className="date-column">
                      {attempt.completedAt ? (
                        <>
                          {new Date(attempt.completedAt).toLocaleDateString()}
                          <br />
                          {new Date(attempt.completedAt).toLocaleTimeString()}
                        </>
                      ) : '-'}
                    </td>
                    <td className="score-column">
                      {attempt.score ? `${attempt.score}%` : '-'}
                    </td>
                    <td className="actions-column">
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
          <div className="reset-buttons">
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
        </div>
      )}

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem;
        }
        
        .header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .header h1 {
          font-size: 1.5rem;
          margin: 0;
        }
        
        .back-link {
          color: #3b82f6;
          text-decoration: none;
          font-size: 0.9rem;
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
          font-size: 0.9rem;
        }
        
        .attempts-list {
          background: white;
          border-radius: 0.5rem;
          padding: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 1.5rem;
        }
        
        .attempts-list h2 {
          font-size: 1.2rem;
          margin-top: 0;
          margin-bottom: 1rem;
        }
        
        .table-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
          min-width: 600px;
        }
        
        th, td {
          padding: 0.5rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
          font-size: 0.85rem;
        }
        
        th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        
        .student-info {
          display: flex;
          flex-direction: column;
        }
        
        .student-name {
          font-weight: 500;
        }
        
        .student-email {
          font-size: 0.75rem;
          color: #6b7280;
        }
        
        .status {
          display: inline-block;
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.7rem;
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
          padding: 0.4rem 0.8rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 0.8rem;
          white-space: nowrap;
        }
        
        .reset-section {
          background: #fff1f2;
          border: 1px solid #ffe4e6;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-top: 1.5rem;
        }
        
        .reset-section h3 {
          font-size: 1.1rem;
          margin-top: 0;
        }
        
        .warning-text {
          color: #b91c1c;
          margin: 0.5rem 0;
          font-size: 0.9rem;
        }
        
        .reset-buttons {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        
        .reset-btn, .cancel-btn {
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
        }
        
        .reset-btn {
          background: #ef4444;
          color: white;
        }
        
        .cancel-btn {
          background: #e5e7eb;
          color: #4b7280;
        }
        
        @media (max-width: 768px) {
          .container {
            padding: 0.5rem;
          }
          
          .header {
            margin-bottom: 1rem;
          }
          
          .attempts-list {
            padding: 0.75rem;
          }
          
          th, td {
            padding: 0.4rem;
            font-size: 0.8rem;
          }
          
          .student-info {
            min-width: 120px;
          }
          
          .date-column {
            min-width: 80px;
          }
          
          .reset-section {
            padding: 0.75rem;
          }
        }
        
        @media (max-width: 480px) {
          .header h1 {
            font-size: 1.3rem;
          }
          
          .attempts-list h2 {
            font-size: 1.1rem;
          }
          
          th, td {
            padding: 0.3rem;
            font-size: 0.75rem;
          }
          
          .status {
            font-size: 0.65rem;
            padding: 0.15rem 0.3rem;
          }
          
          .select-btn {
            padding: 0.3rem 0.6rem;
            font-size: 0.7rem;
          }
          
          .reset-buttons {
            flex-direction: column;
          }
          
          .reset-btn, .cancel-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
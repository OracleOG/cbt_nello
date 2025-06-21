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

  useEffect(() => {
    if (!session || session.user.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }

    const fetchAttempts = async () => {
      try {
        const res = await fetch(`/api/tests/${testId}/attempts`);
        if (!res.ok) throw new Error('Failed to fetch attempts');
        const data = await res.json();
        setAttempts(data);
      } catch (error) {
        console.error('Error fetching attempts:', error);
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
      const res = await fetch(`/api/tests/${testId}/attempts/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id })
      });

      if (!res.ok) throw new Error('Failed to reset attempt');
      
      // Refresh the attempts list
      const updated = await fetch(`/api/tests/${testId}/attempts`);
      setAttempts(await updated.json());
      setSelectedUser(null);
      alert('Attempt reset successfully');
    } catch (error) {
      console.error('Error resetting attempt:', error);
      alert('Failed to reset attempt');
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) return <div>Loading attempts...</div>;

  return (
    <div className="container">
      <div className="header">
        <h1>Test Attempts Management</h1>
        <Link href={`/test`} className="back-link">
          ← Back to Tests
        </Link>
      </div>

      <div className="attempts-list">
        <h2>Users who have attempted this test</h2>
        
        {attempts.length === 0 ? (
          <p>No attempts found for this test</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Started At</th>
                <th>Completed At</th>
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
                  <td>{attempt.score ? `${attempt.score.toFixed(2)}%` : '-'}</td>
                  <td>
                    <button
                      onClick={() => setSelectedUser(attempt.user)}
                      disabled={isResetting}
                      className="select-btn"
                    >
                      {selectedUser?.id === attempt.user.id ? 'Selected' : 'Select'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedUser && (
        <div className="reset-section">
          <h3>Reset Attempt for {selectedUser.firstName} {selectedUser.lastName}</h3>
          <p>
            This will delete all records of this user's attempt and allow them to take the test again.
            Only use this if the user had technical issues during their attempt.
          </p>
          <button
            onClick={handleResetAttempt}
            disabled={isResetting}
            className="reset-btn"
          >
            {isResetting ? 'Resetting...' : 'Confirm Reset Attempt'}
          </button>
        </div>
      )}

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        
        .back-link {
          color: #3b82f6;
          text-decoration: none;
        }
        
        .attempts-list {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
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
        
        tr.selected {
          background-color: #f0f7ff;
        }
        
        .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }
        
        .status.completed {
          background: #e6f7ee;
          color: #10b981;
        }
        
        .status.in-progress {
          background: #fff3bf;
          color: #e67700;
        }
        
        .select-btn {
          padding: 6px 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .select-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .reset-section {
          background: #fff8f8;
          border: 1px solid #ffebee;
          border-radius: 8px;
          padding: 20px;
        }
        
        .reset-btn {
          padding: 10px 20px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 15px;
        }
        
        .reset-btn:hover {
          background: #dc2626;
        }
        
        .reset-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
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
  const [isExporting, setIsExporting] = useState(false);

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
  const handleExportResults = async (testId) => {
    try {
      setIsExporting(true);
      
      // Create a hidden iframe for the download
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Set the iframe src to trigger download
      iframe.src = `/api/tests/${testId}/export`;
      
      // Cleanup after a delay
      setTimeout(() => {
        document.body.removeChild(iframe);
        setIsExporting(false);
      }, 5000);
      
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Failed to export results. Please try again.');
      setIsExporting(false);
    }
  };
  //const xhandleExportResults = async (testId) => {
  //  try {
  //    setIsExporting(true);
  //    const response = await fetch(`/api/tests/${testId}/export`);
  //    
  //    if (!response.ok) {
  //      throw new Error('Failed to export results');
  //    }
//
  //    // Get the blob from the response
  //    const blob = await response.blob();
  //    
  //    // Create a download link
  //    const url = window.URL.createObjectURL(blob);
  //    const a = document.createElement('a');
  //    a.href = url;
  //    a.download = `test-${testId}-results.csv`;
  //    document.body.appendChild(a);
  //    a.click();
  //    
  //    // Cleanup
  //    window.URL.revokeObjectURL(url);
  //    document.body.removeChild(a);
  //  } catch (error) {
  //    console.error('Error exporting results:', error);
  //    alert('Failed to export results. Please try again.');
  //  } finally {
  //    setIsExporting(false);
  //  }
  //};

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
                    <button
                      onClick={() => handleExportResults(test.id)}
                      className="export-btn"
                      disabled={isExporting}
                    >
                      {isExporting ? 'Exporting...' : 'Export Results'}
                    </button>
                    <Link
                      href={`/test/${test.id}/attempts`}
                      className="attempts-btn"
                    >
                      View Attempts
                    </Link>
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
        :global(body.dark) .test-list {
          background: #18181b;
          color: #f3f4f6;
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
        :global(body.dark) th, :global(body.dark) td {
          color: #f3f4f6;
          border-bottom: 1px solid #27272a;
        }
        
        th {
          background: #f9f9f9;
          font-weight: 600;
        }
        :global(body.dark) th {
          background: #23232a;
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
        :global(body.dark) .status.enabled {
          background: #134e3a;
          color: #6ee7b7;
        }
        
        .status.disabled {
          background: #fff1f1;
          color: #ef4444;
        }
        :global(body.dark) .status.disabled {
          background: #3f1d1d;
          color: #fca5a5;
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
        :global(body.dark) .edit-btn {
          background: #2563eb;
          color: #e0e7ef;
        }
        
        .toggle-btn.enabled {
          background: #ef4444;
          color: white;
        }
        :global(body.dark) .toggle-btn.enabled {
          background: #991b1b;
          color: #fee2e2;
        }
        
        .toggle-btn.disabled {
          background: #10b981;
          color: white;
        }
        :global(body.dark) .toggle-btn.disabled {
          background: #065f46;
          color: #bbf7d0;
        }
        
        .loading, .empty-state {
          padding: 20px;
          text-align: center;
          color: #666;
        }
        :global(body.dark) .loading, :global(body.dark) .empty-state {
          color: #d1d5db;
        }
        
        .export-btn {
          padding: 6px 12px;
          background-color: #27ae60;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-left: 8px;
          transition: background-color 0.2s;
        }
        :global(body.dark) .export-btn {
          background-color: #166534;
          color: #e0e7ef;
        }

        .export-btn:hover {
          background-color: #219a52;
        }

        .export-btn:disabled {
          background-color: #95a5a6;
          cursor: not-allowed;
        }
        .attempts-btn {
          padding: 6px 12px;
          background-color: #8b5cf6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-left: 8px;
          text-decoration: none;
          display: inline-block;
        }
        :global(body.dark) .attempts-btn {
          background-color: #6d28d9;
          color: #e0e7ef;
        }

        .attempts-btn:hover {
          background-color: #7c3aed;
        }
      `}</style>
    </div>
  );
}
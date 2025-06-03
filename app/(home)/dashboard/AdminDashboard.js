'use client';


export default function AdminDashboard({ tests, stats, loading }) {
    const toggleTestStatus = async (testId, currentStatus) => {
      try {
        const res = await fetch(`/api/tests/${testId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: currentStatus === 'ENABLED' ? 'DISABLED' : 'ENABLED' })
        });
        
        if (res.ok) {
          window.location.reload(); // Refresh to update the list
        }
      } catch (error) {
        console.error('Error toggling test status:', error);
      }
    };
  
    const downloadScores = async (testId, format) => {
      window.open(`/api/tests/${testId}/scores?format=${format}`, '_blank');
    };
  
    if (loading) return <div>Loading dashboard data...</div>;
  
    return (
      <div className="admin-dashboard">
        <div className="stats-card">
          <h3>Exam Statistics</h3>
          <p>Total Tests: {stats?.totalTests}</p>
          <p>Active Tests: {stats?.activeTests}</p>
          <p>Students Taken: {stats?.studentsTaken}</p>
        </div>
  
        <div className="tests-list">
          <h2>Enabled Tests</h2>
          <table>
            <thead>
              <tr>
                <th>Test Title</th>
                <th>Duration</th>
                <th>Participants</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.filter(t => t.status === 'ENABLED').map(test => (
                <tr key={test.id}>
                  <td>{test.title}</td>
                  <td>{test.durationMins} mins</td>
                  <td>{test._count.takers}</td>
                  <td className="actions">
                    <button 
                      onClick={() => toggleTestStatus(test.id, test.status)}
                      className="disable-btn"
                    >
                      Disable
                    </button>
                    <button 
                      onClick={() => downloadScores(test.id, 'csv')}
                      className="download-btn"
                    >
                      Download CSV
                    </button>
                    <button 
                      onClick={() => downloadScores(test.id, 'pdf')}
                      className="download-btn"
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  
'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StudentDashboard() {
    const [availableTests, setAvailableTests] = useState([]);
    const [selectedTest, setSelectedTest] = useState('');
  
    useEffect(() => {
      async function fetchTests() {
        const res = await fetch('/api/tests/available');
        const data = await res.json();
        console.log('Available tests:', data);
        setAvailableTests(data);
      }
      fetchTests();
    }, []);
  
    return (
      <div className="student-dashboard">
        <h2>Available Tests</h2>
        <div className="test-selector">
          <select 
            value={selectedTest} 
            onChange={(e) => setSelectedTest(e.target.value)}
          >
            <option value="">Select a test</option>
            {availableTests.map(test => (
              <option key={test.id} value={test.id}>
                {test.title} ({test.durationMins} mins)
              </option>
            ))}
          </select>
          
          <Link 
            href={`/test/${selectedTest}`} 
            className={`start-btn ${!selectedTest ? 'disabled' : ''}`}
          >
            Start Examination
          </Link>
        </div>
      </div>
    );
  }
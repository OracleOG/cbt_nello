// app/test/edit/[testId]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function EditTest() {
  const { testId } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Check admin status
  useEffect(() => {
    if (session?.user.role !== 'ADMIN') {
      router.push('/unauthorized');
    }
  }, [session, router]);

  // Fetch test data
  useEffect(() => {
    async function fetchTest() {
      try {
        const [testRes, questionsRes] = await Promise.all([
          fetch(`/api/tests/${testId}`),
          fetch(`/api/tests/${testId}/questions`)
        ]);
        
        if (!testRes.ok || !questionsRes.ok) {
          throw new Error('Failed to fetch test data');
        }
        
        setTest(await testRes.json());
        setQuestions(await questionsRes.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTest();
  }, [testId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/tests/${testId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: test.title,
          durationMins: test.durationMins,
          questions
        })
      });
      
      if (!res.ok) throw new Error('Failed to save test');
      router.push('/test?success=true');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading test...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!test) return <div>Test not found</div>;

  return (
    <div className="edit-container">
      <h1>Edit Test: {test.title}</h1>
      
      <div className="test-details">
        <div>
          <label>Test Title</label>
          <input
            value={test.title}
            onChange={(e) => setTest({...test, title: e.target.value})}
          />
        </div>
        
        <div>
          <label>Duration (minutes)</label>
          <input
            type="number"
            value={test.durationMins}
            onChange={(e) => setTest({...test, durationMins: e.target.value})}
            min="1"
          />
        </div>
      </div>
      
      <div className="questions-section">
        <h2>Questions</h2>
        
        <div className="question-list">
          {questions.map((q, qIndex) => (
            <div key={q.id} className="question-card">
              <textarea
                value={q.text}
                onChange={(e) => {
                  const newQuestions = [...questions];
                  newQuestions[qIndex].text = e.target.value;
                  setQuestions(newQuestions);
                }}
              />
              
              <div className="options">
                {q.options.map((opt, oIndex) => (
                  <div key={opt.id} className="option">
                    <input
                      type="radio"
                      checked={opt.isCorrect}
                      onChange={() => {
                        const newQuestions = [...questions];
                        newQuestions[qIndex].options.forEach(o => o.isCorrect = false);
                        newQuestions[qIndex].options[oIndex].isCorrect = true;
                        setQuestions(newQuestions);
                      }}
                    />
                    <input
                      value={opt.text}
                      onChange={(e) => {
                        const newQuestions = [...questions];
                        newQuestions[qIndex].options[oIndex].text = e.target.value;
                        setQuestions(newQuestions);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="actions">
        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {error && <div className="error">{error}</div>}
      </div>

      <style jsx>{`
        .edit-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .test-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        input[type="text"], 
        input[type="number"],
        textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        textarea {
          min-height: 80px;
          margin-bottom: 15px;
        }
        
        .question-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .option {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .actions {
          margin-top: 30px;
          text-align: right;
        }
        
        button {
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .error {
          color: #ef4444;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
}
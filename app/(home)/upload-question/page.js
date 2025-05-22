'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function TestCreator() {
  const { data: session } = useSession();
  const [testDetails, setTestDetails] = useState({
    title: '',
    durationMins: 60,
    availableFrom: '',
    availableTo: '',
    sessionId: '',
    semesterId: ''
  });
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    file: '',
    test: '',
    questions: []
  });
  const [sessions, setSessions] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingSemesters, setLoadingSemesters] = useState(false);

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoadingSessions(true);
        const res = await fetch('/api/session');
        if (!res.ok) throw new Error('Failed to fetch sessions');
        const data = await res.json();
        setSessions(data);
      } catch (err) {
        console.error('Error fetching sessions:', err);
      } finally {
        setLoadingSessions(false);
      }
    }
    
    fetchSessions();
  }, []);

  useEffect(() => {
    async function fetchSemesters() {
      if (!testDetails.sessionId) {
        setSemesters([]);
        return;
      }
      
      try {
        setLoadingSemesters(true);
        const res = await fetch(`/api/semester?sessionId=${testDetails.sessionId}`);
        if (!res.ok) throw new Error('Failed to fetch semesters');
        const data = await res.json();
        setSemesters(data);
        
        if (data.length > 0 && !testDetails.semesterId) {
          setTestDetails(prev => ({...prev, semesterId: data[0].id.toString()}));
        } else if (data.length === 0) {
          setTestDetails(prev => ({...prev, semesterId: ''}));
        }
      } catch (err) {
        console.error('Error fetching semesters:', err);
      } finally {
        setLoadingSemesters(false);
      }
    }
    
    fetchSemesters();
  }, [testDetails.sessionId]);

  useEffect(() => {
    document.body.classList.add('ready');
  }, []);

  async function parseQuestions(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim());
    const questions = [];
    let current = null;
    const questionErrors = [];

    lines.forEach((line, index) => {
      try {
        if (/^\d+[\.\)]/.test(line)) {
          if (current) questions.push(current);
          current = {
            text: line.replace(/^\d+[\.\)]\s*/, ''),
            options: [],
            correct: '',
            lineNumber: index + 1
          };
          return;
        }

        const optMatch = line.match(/^([a-z])[\.\)]\s*(.+)/i);
        if (optMatch && current) {
          current.options.push({
            label: optMatch[1].toUpperCase(),
            text: optMatch[2].trim()
          });
          return;
        }

        const keyMatch = line.match(/^key\s*[:\-\.]?\s*\(?\s*([a-z])\s*\)?$/i);
        if (keyMatch && current) {
          const answer = keyMatch[1].toUpperCase();
          const validOption = current.options.some(opt => opt.label === answer);
          
          if (!validOption) {
            throw new Error(`Key (${answer}) doesn't match any options (Available: ${current.options.map(o => o.label).join(', ')})`);
          }
          
          current.correct = answer;
          return;
        }

        if (line && !current) {
          throw new Error('Text found before first question');
        }
      } catch (err) {
        questionErrors.push({
          line: index + 1,
          text: line,
          message: err.message
        });
      }
    });

    if (current) questions.push(current);
    
    questions.forEach((q, i) => {
      if (!q.text) {
        questionErrors.push({
          line: q.lineNumber,
          message: `Question ${i + 1} has no text`
        });
      }
      if (q.options.length < 2) {
        questionErrors.push({
          line: q.lineNumber,
          message: `Question ${i + 1} needs at least 2 options`
        });
      }
      if (!q.correct) {
        questionErrors.push({
          line: q.lineNumber,
          message: `Question ${i + 1} is missing correct answer key`
        });
      }
    });

    setErrors(prev => ({ ...prev, questions: questionErrors }));
    return questionErrors.length ? null : questions;
  }

  const handleFileUpload = async (e) => {
    try {
      setErrors({ file: '', test: '', questions: [] });
      const file = e.target.files[0];
      if (!file) return;

      const text = await readFile(file);
      const parsed = await parseQuestions(text);

      if (!parsed) {
        throw new Error('File contains errors (see details below)');
      }

      setQuestions(parsed);
    } catch (err) {
      setErrors(prev => ({ ...prev, file: err.message }));
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      text: '',
      options: [{ label: 'A', text: '' }, { label: 'B', text: '' }],
      correct: ''
    }]);
  };

  const deleteQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const addOption = (qIndex) => {
    const newQuestions = [...questions];
    const nextLabel = String.fromCharCode(
      65 + newQuestions[qIndex].options.length
    );
    newQuestions[qIndex].options.push({ label: nextLabel, text: '' });
    setQuestions(newQuestions);
  };

  const deleteOption = (qIndex, oIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options = newQuestions[qIndex].options.filter(
      (_, i) => i !== oIndex
    );
    
    if (newQuestions[qIndex].correct === newQuestions[qIndex].options[oIndex]?.label) {
      newQuestions[qIndex].correct = '';
    }
    
    setQuestions(newQuestions);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const testErrors = {};
      if (!testDetails.title) testErrors.title = 'Required';
      if (!testDetails.durationMins || testDetails.durationMins < 1) testErrors.durationMins = 'Invalid duration';
      if (!testDetails.sessionId) testErrors.sessionId = 'Required';
      if (!testDetails.semesterId) testErrors.semesterId = 'Required';
      
      if (Object.keys(testErrors).length) {
        setErrors(prev => ({ ...prev, test: 'Please fix test details', ...testErrors }));
        return;
      }

      const testRes = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: testDetails.title,
          durationMins: Number(testDetails.durationMins),
          availableFrom: testDetails.availableFrom || null,
          availableTo: testDetails.availableTo || null,
          sessionId: Number(testDetails.sessionId),
          semesterId: Number(testDetails.semesterId),
          createdById: session.user.id
        })
      });

      if (!testRes.ok) throw new Error('Failed to create test');
      const { id: testId } = await testRes.json();

      const questionsRes = await fetch('/api/bulk-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId,
          questions: questions.map(q => ({
            text: q.text,
            options: q.options.map(opt => ({
              label: opt.label,
              text: opt.text,
              isCorrect: opt.label === q.correct
            }))
          }))
        })
      });

      if (!questionsRes.ok) throw new Error('Failed to create questions');
      
      alert('Test created successfully!');
      setTestDetails({
        title: '',
        durationMins: 60,
        availableFrom: '',
        availableTo: '',
        sessionId: '',
        semesterId: ''
      });
      setQuestions([]);
    } catch (err) {
      setErrors(prev => ({ ...prev, test: err.message }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Create New Test</h1>
      
      <div className="test-details">
        <h2>Test Information</h2>
        <div className="form-grid">
          <div>
            <label>Test Title*</label>
            <input
              value={testDetails.title}
              onChange={(e) => setTestDetails({...testDetails, title: e.target.value})}
              placeholder="Intro to Management Midterm"
            />
            {errors.title && <span className="error">{errors.title}</span>}
          </div>
          
          <div>
            <label>Duration (minutes)*</label>
            <input
              type="number"
              value={testDetails.durationMins}
              onChange={(e) => setTestDetails({...testDetails, durationMins: e.target.value})}
              min="1"
            />
            {errors.durationMins && <span className="error">{errors.durationMins}</span>}
          </div>
          
          <div>
            <label>Available From</label>
            <input
              type="datetime-local"
              value={testDetails.availableFrom}
              onChange={(e) => setTestDetails({...testDetails, availableFrom: e.target.value})}
            />
          </div>
          
          <div>
            <label>Available To</label>
            <input
              type="datetime-local"
              value={testDetails.availableTo}
              onChange={(e) => setTestDetails({...testDetails, availableTo: e.target.value})}
            />
          </div>
          
          <div>
            <label>Session*</label>
            <select
              value={testDetails.sessionId}
              onChange={(e) => setTestDetails({...testDetails, sessionId: e.target.value, semesterId: ''})}
              disabled={loadingSessions}
            >
              <option value="">Select a Session</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
            {loadingSessions && <span className="loading">Loading sessions...</span>}
            {errors.sessionId && <span className="error">{errors.sessionId}</span>}
          </div>
          
          <div>
            <label>Semester*</label>
            <select
              value={testDetails.semesterId}
              onChange={(e) => setTestDetails({...testDetails, semesterId: e.target.value})}
              disabled={loadingSemesters || !testDetails.sessionId}
            >
              <option value="">Select a Semester</option>
              {semesters.map(semester => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </select>
            {loadingSemesters && <span className="loading">Loading semesters...</span>}
            {errors.semesterId && <span className="error">{errors.semesterId}</span>}
          </div>
        </div>
      </div>
      
      <div className="questions-section">
        <h2>
          Questions 
          <button onClick={addQuestion} className="add-btn">
            + Add Question
          </button>
        </h2>
        
        <div className="file-upload">
          <input 
            type="file" 
            accept=".txt" 
            onChange={handleFileUpload}
            disabled={loading}
          />
          {errors.file && <div className="error">{errors.file}</div>}
        </div>
        
        {errors.questions.length > 0 && (
          <div className="parsing-errors">
            <h3>File Parsing Errors:</h3>
            <ul>
              {errors.questions.map((err, i) => (
                <li key={i}>
                  <strong>Line {err.line}:</strong> {err.message}
                  {err.text && ` (Found: "${err.text}")`}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="question-list">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="question-card">
              <div className="question-header">
                <h3>Question {qIndex + 1}</h3>
                <button 
                  onClick={() => deleteQuestion(qIndex)}
                  className="delete-btn"
                >
                  Delete
                </button>
              </div>
              
              <textarea
                value={q.text}
                onChange={(e) => {
                  const newQuestions = [...questions];
                  newQuestions[qIndex].text = e.target.value;
                  setQuestions(newQuestions);
                }}
                placeholder="Enter question text"
              />
              
              <div className="options-list">
                <h4>Options:</h4>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="option-row">
                    <label>{opt.label}:</label>
                    <input
                      value={opt.text}
                      onChange={(e) => {
                        const newQuestions = [...questions];
                        newQuestions[qIndex].options[oIndex].text = e.target.value;
                        setQuestions(newQuestions);
                      }}
                      placeholder={`Option ${opt.label}`}
                    />
                    <button
                      onClick={() => deleteOption(qIndex, oIndex)}
                      disabled={q.options.length <= 2}
                      className="delete-option-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => addOption(qIndex)}
                  className="add-option-btn"
                >
                  + Add Option
                </button>
              </div>
              
              <div className="correct-answer">
                <label>Correct Answer:</label>
                <select
                  value={q.correct}
                  onChange={(e) => {
                    const newQuestions = [...questions];
                    newQuestions[qIndex].correct = e.target.value;
                    setQuestions(newQuestions);
                  }}
                >
                  <option value="">Select correct answer</option>
                  {q.options.map(opt => (
                    <option key={opt.label} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="actions">
        <button 
          onClick={handleSubmit}
          disabled={loading || questions.length === 0}
          className="submit-btn"
        >
          {loading ? 'Saving...' : 'Create Test'}
        </button>
        {errors.test && <div className="error">{errors.test}</div>}
      </div>

      <style jsx>{`
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .test-details {
          background:rgb(18, 11, 43);
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        
        .questions-section {
          margin-top: 30px;
        }
        
        .question-list {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .question-card {
          border: 1px solid #ddd;
          padding: 20px;
          border-radius: 8px;
          background: white;
        }
        
        .question-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        textarea {
          width: 100%;
          min-height: 80px;
          padding: 10px;
          margin-bottom: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .options-list {
          margin: 15px 0;
        }
        
        .option-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .option-row input {
          flex: 1;
          padding: 8px;
        }
        
        .correct-answer {
          margin-top: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .correct-answer select {
          padding: 8px;
        }
        
        .add-btn, .add-option-btn {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .delete-btn, .delete-option-btn {
          background: #f44336;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .delete-option-btn {
          padding: 2px 6px;
        }
        
        .submit-btn {
          background: #2196F3;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        
        .submit-btn:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
        
        .error {
          color: #f44336;
          margin-top: 5px;
          font-size: 14px;
        }
        
        .parsing-errors {
          background: rgb(18, 11, 43);
          padding: 15px;
          border-radius: 4px;
          margin: 15px 0;
        }
        
        .parsing-errors ul {
          margin: 10px 0 0 20px;
        }
        .question-card {
          background:rgb(18, 11, 43);
        }
        .loading {
          color: #666;
          font-size: 14px;
          font-style: italic;
          margin-left: 10px;
        }
        select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: white;
        }
        select:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

async function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
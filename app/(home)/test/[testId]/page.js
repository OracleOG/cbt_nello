// app/tests/[testId]/page.jsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TestTimer from './TestTimer';
import QuestionGrid from './QuestionGrid';
import styles from './TestPage.module.css';

export default function TestPage({ params }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { testId } = params;
  
  const [testData, setTestData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!session) return;

    const fetchTest = async () => {
      try {
        const res = await fetch(`/api/tests/${testId}/questions`);
        if (!res.ok) throw new Error('Failed to fetch test');
        const data = await res.json();
        
        setTestData(data);
        console.log(testData)
        setTimeRemaining(data.durationMins * 60);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchTest();
  }, [testId, session]);

  useEffect(() => {
    if (timeRemaining <= 0 && testData) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, testData]);

  const handleAnswerSelect = (questionId, optionId) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleQuestionNavigation = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleSubmit = async () => {
    if (submitted) return;
    
    try {
      const res = await fetch(`/api/tests/${testId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          answers
        })
      });

      if (!res.ok) throw new Error('Submission failed');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className={styles.loading}>Loading test...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (submitted) return (
    <div className={styles.submitted}>
      <h2>Test Submitted Successfully!</h2>
      <p>Your answers have been recorded.</p>
      <button onClick={() => router.push('/dashboard')}>Return to Dashboard</button>
    </div>
  );

  const currentQuestion = testData.questions[currentQuestionIndex];
  const totalQuestions = testData.questions.length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Test: {testData.title}</h1>
        <TestTimer 
          timeRemaining={timeRemaining} 
          durationMins={testData.durationMins} 
        />
      </header>

      <main className={styles.main}>
        <div className={styles.questionContainer}>
          <div className={styles.questionHeader}>
            <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          </div>
          
          <div className={styles.questionText}>
            {currentQuestion.text}
          </div>

          <div className={styles.options}>
            {currentQuestion.options.map(option => (
              <div 
                key={option.id}
                className={`${styles.option} ${
                  answers[currentQuestion.id] === option.id ? styles.selected : ''
                }`}
                onClick={() => handleAnswerSelect(currentQuestion.id, option.id)}
              >
                <span className={styles.optionLabel}>{option.label}.</span>
                <span>{option.text}</span>
              </div>
            ))}
          </div>

          <div className={styles.navigation}>
            <button 
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </button>
            <button 
              onClick={() => setCurrentQuestionIndex(prev => 
                Math.min(totalQuestions - 1, prev + 1)
              )}
              disabled={currentQuestionIndex === totalQuestions - 1}
            >
              Next
            </button>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <QuestionGrid
          totalQuestions={totalQuestions}
          currentIndex={currentQuestionIndex}
          answeredQuestions={Object.keys(answers)}
          onNavigate={handleQuestionNavigation}
        />
        <button 
          onClick={handleSubmit}
          className={styles.submitButton}
        >
          Submit Test
        </button>
      </footer>
    </div>
  );
}
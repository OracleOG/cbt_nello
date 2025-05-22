'use client';
import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TestTimer from './TestTimer';
import QuestionGrid from './QuestionGrid';
import styles from './TestPage.module.css';

export default function TestPage({ params }) {
  const { testId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const workerRef = useRef(null);
  
  const [state, setState] = useState({
    loading: true,
    error: '',
    submitted: false,
    attemptId: null,
    answers: {},
    timeRemaining: 0,
    questions: [],
    currentIndex: 0
  });

  // Initialize exam
  useEffect(() => {
    if (!session) return;

    const initializeExam = async () => {
      try {
        // 1. Check localStorage fallback
        const savedState = localStorage.getItem(`test-${testId}`);
        if (savedState) {
          const { answers, timeRemaining, attemptId, timestamp } = JSON.parse(savedState);
          if (Date.now() - timestamp < 300000) { // 5m validity
            setState(prev => ({
              ...prev,
              answers,
              timeRemaining,
              attemptId
            }));
          }
        }

        // 2. Initialize with server
        const initRes = await fetch(`/api/tests/${testId}/init`, { method: 'POST' });
        const initData = await initRes.json();
        
        if (initData.error) throw new Error(initData.error);

        // 3. Load questions
        const questionsRes = await fetch(`/api/tests/${testId}/questions`);
        const { questions } = await questionsRes.json();

        setState(prev => ({
          ...prev,
          ...initData,
          questions,
          loading: false
        }));

        // 4. Start timer
        workerRef.current = new Worker(new URL('../../../../public/workers/timer.worker.js', import.meta.url));
        workerRef.current.postMessage({ 
          action: 'start', 
          duration: initData.timeRemaining 
        });

        workerRef.current.onmessage = (e) => {
          if (e.data.action === 'timeout') handleSubmit();
          else setState(prev => ({ ...prev, timeRemaining: e.data.remaining }));
        };

      } catch (err) {
        setState(prev => ({
          ...prev,
          error: err.message,
          loading: false
        }));
      }
    };

    initializeExam();

    return () => workerRef.current?.terminate();
  }, [session, testId]);

  // Auto-save mechanism
  useEffect(() => {
    const saveProgress = async () => {
      try {
        await fetch(`/api/tests/${testId}/save`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId: state.attemptId,
            answers: state.answers,
            timeRemaining: state.timeRemaining
          })
        });
      } catch (error) {
        localStorage.setItem(`test-${testId}`, JSON.stringify({
          answers: state.answers,
          timeRemaining: state.timeRemaining,
          attemptId: state.attemptId,
          timestamp: Date.now()
        }));
      }
    };

    const interval = setInterval(saveProgress, 30000);
    const beforeUnload = () => saveProgress();
    window.addEventListener('beforeunload', beforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [state.answers, state.timeRemaining, state.attemptId, testId]);

  const handleAnswerSelect = (questionId, optionId) => {
    setState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: optionId
      }
    }));
  };

  const handleQuestionNavigation = (index) => {
    setState(prev => ({ ...prev, currentIndex: index }));
  };

  const handleSubmit = async () => {
    if (state.submitted) return;
    
    try {
      const res = await fetch(`/api/tests/${testId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: state.attemptId,
          answers: state.answers
        })
      });

      if (!res.ok) throw new Error('Submission failed');
      
      setState(prev => ({
        ...prev,
        submitted: true
      }));
      localStorage.removeItem(`test-${testId}`);
      
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err.message
      }));
    }
  };

  if (state.loading) return <div className={styles.loading}>Loading test...</div>;
  if (state.error) return <div className={styles.error}>{state.error}</div>;
  if (state.submitted) return (
    <div className={styles.submitted}>
      <h2>Test Submitted Successfully!</h2>
      <p>Your answers have been recorded.</p>
      <button onClick={() => router.push('/dashboard')}>Return to Dashboard</button>
    </div>
  );

  const currentQuestion = state.questions[state.currentIndex];
  const totalQuestions = state.questions.length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Test: {currentQuestion.test?.title}</h1>
        <TestTimer 
          timeRemaining={state.timeRemaining} 
          durationMins={currentQuestion.test?.durationMins} 
        />
      </header>

      <main className={styles.main}>
        <div className={styles.questionContainer}>
          <div className={styles.questionHeader}>
            <span>Question {state.currentIndex + 1} of {totalQuestions}</span>
          </div>
          
          <div className={styles.questionText}>
            {currentQuestion.text}
          </div>

          <div className={styles.options}>
            {currentQuestion.options.map((option, idx) => (
              <div 
                key={option.id}
                className={`${styles.option} ${
                  state.answers[currentQuestion.id] === option.id ? styles.selected : ''
                }`}
                onClick={() => handleAnswerSelect(currentQuestion.id, option.id)}
              >
                <span className={styles.optionLabel}>
                  {String.fromCharCode(65 + idx)}.
                </span>
                <span>{option.text}</span>
              </div>
            ))}
          </div>

          <div className={styles.navigation}>
            <button 
              onClick={() => setState(prev => ({ 
                ...prev, 
                currentIndex: Math.max(0, prev.currentIndex - 1) 
              }))}
              disabled={state.currentIndex === 0}
            >
              Previous
            </button>
            <button 
              onClick={() => setState(prev => ({ 
                ...prev, 
                currentIndex: Math.min(totalQuestions - 1, prev.currentIndex + 1) 
              }))}
              disabled={state.currentIndex === totalQuestions - 1}
            >
              Next
            </button>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <QuestionGrid
          questions={state.questions}
          currentIndex={state.currentIndex}
          answeredQuestionIds={Object.keys(state.answers)}
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
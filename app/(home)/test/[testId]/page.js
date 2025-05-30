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
    currentIndex: 0,
    testDetails: null // Added to store test metadata separately
  });

  const loadQuestions = async () => {
    try {
      const questionsRes = await fetch(`/api/tests/${testId}/questions`);
      
      if (!questionsRes.ok) {
        const errorData = await questionsRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load questions');
      }

      const { questions } = await questionsRes.json();
      return questions;
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err.message,
        loading: false
      }));
      return []; // Return empty array as fallback
    }
  };


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

        // 3. Load questions and test details
        const [questions, testRes] = await Promise.all([
          loadQuestions(),
          fetch(`/api/tests/${testId}`)
        ]);
        
        const { test } = await testRes.json();

        setState(prev => ({
          ...prev,
          ...initData,
          questions,
          testDetails: test, // Store test details separately
          loading: false
        }));

        // 4. Start timer only if we have valid time remaining
        if (initData.timeRemaining > 0) {
          workerRef.current = new Worker(new URL('../../../../public/workers/timer.worker.js', import.meta.url));
          workerRef.current.postMessage({ 
            action: 'start', 
            duration: initData.timeRemaining 
          });

          workerRef.current.onmessage = (e) => {
            if (e.data.action === 'timeout') handleSubmit();
            else setState(prev => ({ ...prev, timeRemaining: e.data.remaining }));
          };
        }

      } catch (err) {
        localStorage.setItem(`test-${testId}`, JSON.stringify({
          answers: state.answers,
          timeRemaining: state.timeRemaining,
          attemptId: state.attemptId,
          timestamp: Date.now()
        }));
      }
    };

    initializeExam();

    return () => workerRef.current?.terminate();
  }, [session, testId]);


  // Auto-save mechanism
  // In TestPage component
useEffect(() => {
  const saveProgress = async () => {
    if (Object.keys(state.answers).length === 0) return;
    
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
      console.error("Auto-save failed:", error);
    }
  };

  // Save when answers change (debounced)
  const debounceTimer = setTimeout(() => {
    saveProgress();
  }, 5000); // 5 second debounce

  // Periodic save every 15 minutes
  const interval = setInterval(saveProgress, 15 * 60 * 1000);
  
  const beforeUnload = () => {
    saveProgress();
    // Small delay to allow save to complete
    return new Promise(resolve => setTimeout(resolve, 500));
  };

  window.addEventListener('beforeunload', beforeUnload);

  return () => {
    clearTimeout(debounceTimer);
    clearInterval(interval);
    window.removeEventListener('beforeunload', beforeUnload);
  };
  }, [state.answers, testId]); // Only run when answers change

  
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

  // Safely handle questions
  if (!state.questions.length) {
    return <div className={styles.error}>No questions available for this test</div>;
  }

  const currentQuestion = state.questions[state.currentIndex];
  const totalQuestions = state.questions.length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        {/* Use testDetails instead of currentQuestion.test */}
        <h1>Test: {state.testDetails?.title || 'Untitled Test'}</h1>
        <TestTimer 
          timeRemaining={state.timeRemaining} 
          durationMins={state.testDetails?.durationMins} 
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
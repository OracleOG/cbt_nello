'use client';
import { useEffect, useState, useRef, use } from 'react';
import { redirect, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TestTimer from './TestTimer';
import QuestionGrid from './QuestionGrid';
import styles from './TestPage.module.css';

export default function TestPage({ params }) {
  const { testId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const debounceRef = useRef();
  
  const [state, setState] = useState({
    loading: true,
    error: '',
    submitted: false,
    attemptId: null,
    answers: {},
    startTime: null,
    questions: [],
    currentIndex: 0,
    testDetails: null
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
      return [];
    }
  };

  const calculateElapsedTime = (startTime) => {
    return Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  };
  
  const syncTimeFromServer = async () => {
    try {
      const res = await fetch(`/api/tests/${testId}/resume-test`);
      if (res.ok) {
        const { startedAt } = await res.json();
        setState(prev => ({ ...prev, startTime: startedAt }));
      }
    } catch (err) {
      console.error('Server sync failed');
      const savedState = localStorage.getItem(`test-${testId}-${session.user.id}`);
      if (savedState) {
        const { startTime } = JSON.parse(savedState);
        setState(prev => ({ ...prev, startTime }));
      }
    }
  };
  
  const debouncedSaveToLocalStorage = () => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const saveData = {
        answers: state.answers,
        startTime: state.startTime,
        attemptId: state.attemptId,
        currentIndex: state.currentIndex,
        timestamp: Date.now()
      };
      localStorage.setItem(`test-${testId}-${session.user.id}`, JSON.stringify(saveData));
    }, 1000);
  };
  
  useEffect(() => {
    if (!session) return;

    const initializeExam = async () => {
      try {
        const savedState = localStorage.getItem(`test-${testId}-${session.user.id}`);
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          if (Date.now() - parsedState.timestamp < 300000) {
            setState(prev => ({
              ...prev,
              answers: parsedState.answers,
              startTime: parsedState.startTime,
              attemptId: parsedState.attemptId,
              currentIndex: parsedState.currentIndex || 0,
              loading: false
            }));
            return;
          }
        }

        const [initRes, questionsRes, testRes] = await Promise.all([
          fetch(`/api/tests/${testId}/init`, { method: 'POST' }),
          fetch(`/api/tests/${testId}/questions`),
          fetch(`/api/tests/${testId}`)
        ]);

        const [initData, questionsData, testData] = await Promise.all([
          initRes.json(),
          questionsRes.json(),
          testRes.json()
        ]);

        if (initData.error) throw new Error(initData.error);
        if (questionsData.error) throw new Error(questionsData.error);
        if (testData.error) throw new Error(testData.error);

        setState(prev => ({
          ...prev,
          ...initData,
          questions: questionsData.questions || [],
          testDetails: testData.test,
          startTime: initData.startedAt || new Date().toISOString(),
          loading: false
        }));

      } catch (err) {
        console.error("Initialization error:", err);
        setState(prev => ({
          ...prev,
          error: err.message,
          loading: false
        }));
      }
    };

    initializeExam();

    return () => {
      clearTimeout(debounceRef.current);
    };
  }, [session, testId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (state.loading) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Loading timed out. Please refresh the page.'
        }));
      }
    }, 30000);

    return () => clearTimeout(timeout);
  }, [state.loading]);

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

    const debounceTimer = setTimeout(() => {
      saveProgress();
    }, 5000);

    const interval = setInterval(saveProgress, 15 * 60 * 1000);
    
    const beforeUnload = () => {
      saveProgress();
      return new Promise(resolve => setTimeout(resolve, 500));
    };

    window.addEventListener('beforeunload', beforeUnload);

    return () => {
      clearTimeout(debounceTimer);
      clearInterval(interval);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [state.answers, testId, state.attemptId, state.timeRemaining]);

  const handleAnswerSelect = (questionId, optionId) => {
    setState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: optionId
      }
    }));
    debouncedSaveToLocalStorage();
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
      localStorage.removeItem(`test-${testId}-${session.user.id}`);
      
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

  if (!state.questions.length) {
    return <div className={styles.error}>No questions available for this test</div>;
  }

  const currentQuestion = state.questions[state.currentIndex];
  const totalQuestions = state.questions.length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Test: {state.testDetails?.title || 'Untitled Test'}</h1>
        <TestTimer 
          startTime={state.startTime}
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
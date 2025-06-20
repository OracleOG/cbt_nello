'use client';
import { useEffect, useState, useRef, use } from 'react';
import { redirect, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TestTimer from './TestTimer';
import QuestionGrid from './QuestionGrid';
import styles from './TestPage.module.css';

export default function TestPage({ params }) {
  const { testId } = params;
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
        // Try loading saved exam state from localStorage
        const savedStateRaw = localStorage.getItem(`test-${testId}-${session.user.id}`);
        const savedState = savedStateRaw ? JSON.parse(savedStateRaw) : null;

        // Fetch the latest exam data in parallel
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

        // Merge saved values (if present and recent) with server data.
        // If we have a valid saved state, use its startTime, answers, attemptId and currentIndex.
        const newStartTime =
          savedState && Date.now() - savedState.timestamp < 300000
            ? savedState.startTime
            : initData.startedAt || new Date().toISOString();

        const newAttemptId =
          savedState && Date.now() - savedState.timestamp < 300000
            ? savedState.attemptId
            : initData.attemptId;

        const newAnswers =
          savedState && Date.now() - savedState.timestamp < 300000
            ? savedState.answers
            : {};

        const newCurrentIndex =
          savedState && Date.now() - savedState.timestamp < 300000
            ? savedState.currentIndex
            : 0;

        const newState = {
          ...initData,
          questions: questionsData.questions || [],
          testDetails: testData.test,
          startTime: newStartTime,
          answers: newAnswers,
          attemptId: newAttemptId,
          currentIndex: newCurrentIndex,
          loading: false
        };

        setState(newState);

        // Persist all relevant state to localStorage, including questions if desired.
        localStorage.setItem(
          `test-${testId}-${session.user.id}`,
          JSON.stringify({
            answers: newState.answers,
            startTime: newState.startTime,
            attemptId: newState.attemptId,
            currentIndex: newState.currentIndex,
            timestamp: Date.now(),
            // Optionally also store questions if they rarely change:
            questions: newState.questions 
          })
        );
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
    if (state.submitted || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    handleSubmit();
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Handle option selection (a-z for options)
      if (/^[a-z]$/.test(e.key)) {
        const currentQuestion = state.questions[state.currentIndex];
        if (currentQuestion) {
          const optionIndex = e.key.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
          const option = currentQuestion.options[optionIndex];
          if (option) {
            handleAnswerSelect(currentQuestion.id, option.id);
          }
        }
      }

      // Handle navigation
      switch (e.key) {
        case 'ArrowLeft':
          setState(prev => ({
            ...prev,
            currentIndex: Math.max(0, prev.currentIndex - 1)
          }));
          break;
        case 'ArrowRight':
          setState(prev => ({
            ...prev,
            currentIndex: Math.min(state.questions.length - 1, prev.currentIndex + 1)
          }));
          break;
        case 'Enter':
          if (e.target.tagName !== 'BUTTON') {
            handleSubmit();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [state.currentIndex, state.questions, handleAnswerSelect]);

  if (state.loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Loading test...</p>
    </div>
  );
  
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
      {showConfirmDialog && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Confirm Submission</h3>
            <p>Are you sure you want to submit your test? This action cannot be undone.</p>
            <div className={styles.modalActions}>
              <button 
                onClick={() => setShowConfirmDialog(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowConfirmDialog(false);
                  handleSubmit();
                }}
                className={styles.confirmButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <h1>{state.testDetails?.title}</h1>
        <TestTimer 
          startTime={state.startTime} 
          durationMins={state.testDetails?.durationMins}
          onTimeUp={handleTimeUp}
        />
      </div>
      
      <div className={styles.content}>
        <div className={styles.questionSection}>
          {state.questions[state.currentIndex] && (
            <div className={styles.question}>
              <h3>Question {state.currentIndex + 1}</h3>
              <p>{state.questions[state.currentIndex].text}</p>
              <div className={styles.options}>
                {state.questions[state.currentIndex].options.map(option => (
                  <label key={option.id} className={styles.option}>
                    <input
                      type="radio"
                      name={`question-${state.questions[state.currentIndex].id}`}
                      checked={state.answers[state.questions[state.currentIndex].id] === option.id}
                      onChange={() => handleAnswerSelect(state.questions[state.currentIndex].id, option.id)}
                    />
                    {option.text}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className={styles.navigation}>
            <button 
              onClick={() => setState(prev => ({ 
                ...prev, 
                currentIndex: Math.max(0, prev.currentIndex - 1) 
              }))}
              disabled={state.currentIndex === 0}
              className={styles.navButton}
            >
              <span className="material-icons">chevron_left</span>
              Previous
            </button>
            <button 
              onClick={() => setState(prev => ({ 
                ...prev, 
                currentIndex: Math.min(totalQuestions - 1, prev.currentIndex + 1) 
              }))}
              disabled={state.currentIndex === totalQuestions - 1}
              className={styles.navButton}
            >
              Next
              <span className="material-icons">chevron_right</span>
            </button>
          </div>
        </div>
        
        <QuestionGrid
          questions={state.questions}
          answers={state.answers}
          currentIndex={state.currentIndex}
          onNavigate={handleQuestionNavigation}
        />
      </div>

      <div className={styles.footer}>
        <button 
          onClick={() => setShowConfirmDialog(true)}
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Test'}
        </button>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

  const saveToLocalStorageImmediately = (newIndex = null) => {
    const saveData = {
      answers: state.answers,
      startTime: state.startTime,
      attemptId: state.attemptId,
      currentIndex: newIndex !== null ? newIndex : state.currentIndex,
      timestamp: Date.now()
    };
    localStorage.setItem(`test-${testId}-${session.user.id}`, JSON.stringify(saveData));
  };
  
  useEffect(() => {
    if (!session) return;

    const initializeExam = async () => {
      try {
        // Load saved state from localStorage first
        const savedStateRaw = localStorage.getItem(`test-${testId}-${session.user.id}`);
        const savedState = savedStateRaw ? JSON.parse(savedStateRaw) : null;
        
        // Check if saved state is recent (within 24 hours)
        const isRecentState = savedState && (Date.now() - savedState.timestamp) < 24 * 60 * 60 * 1000;

        // Fetch exam data from server
        const [attemptRes, questionsRes, testRes] = await Promise.all([
          fetch(`/api/tests/${testId}/attempts`, { method: 'POST' }),
          fetch(`/api/tests/${testId}/questions`),
          fetch(`/api/tests/${testId}`)
        ]);

        const [attemptData, questionsData, testData] = await Promise.all([
          attemptRes.json(),
          questionsRes.json(),
          testRes.json()
        ]);

        if (attemptData.error) throw new Error(attemptData.error);
        if (questionsData.error) throw new Error(questionsData.error);
        if (testData.error) throw new Error(testData.error);

        // Get server-side saved answers from the attempt data
        const serverAnswers = attemptData.answers || {};
        const serverStartTime = attemptData.startedAt;
        const serverAttemptId = attemptData.attemptId;

        // Determine which data to use based on priority:
        // 1. Recent localStorage data (most recent user interaction)
        // 2. Server-side data (persisted answers)
        // 3. Fresh start (new attempt)
        
        const newStartTime = isRecentState 
          ? savedState.startTime 
          : (serverStartTime || new Date().toISOString());
        
        const newAttemptId = isRecentState 
          ? savedState.attemptId 
          : serverAttemptId;
        
        // Merge answers: localStorage takes precedence if recent, otherwise use server data
        const newAnswers = isRecentState 
          ? { ...serverAnswers, ...savedState.answers } // Server data as base, localStorage overrides
          : serverAnswers;
        
        const newCurrentIndex = isRecentState ? savedState.currentIndex : 0;

        const newState = {
          questions: questionsData.questions || [],
          testDetails: testData.test,
          startTime: newStartTime,
          answers: newAnswers,
          attemptId: newAttemptId,
          currentIndex: newCurrentIndex,
          loading: false
        };

        setState(newState);

        // Update localStorage with merged state
        localStorage.setItem(
          `test-${testId}-${session.user.id}`,
          JSON.stringify({
            answers: newState.answers,
            startTime: newState.startTime,
            attemptId: newState.attemptId,
            currentIndex: newState.currentIndex,
            timestamp: Date.now()
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
      if (Object.keys(state.answers).length === 0 || !state.attemptId) return;
      
      try {
        await fetch(`/api/tests/${testId}/attempts/${state.attemptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
    // Save current index immediately when navigating
    saveToLocalStorageImmediately(index);
  };

  const handleSubmit = async () => {
    if (state.submitted || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/tests/${testId}/attempts/${state.attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          setState(prev => {
            const newIndex = Math.max(0, prev.currentIndex - 1);
            saveToLocalStorageImmediately(newIndex);
            return { ...prev, currentIndex: newIndex };
          });
          break;
        case 'ArrowRight':
          setState(prev => {
            const newIndex = Math.min(state.questions.length - 1, prev.currentIndex + 1);
            saveToLocalStorageImmediately(newIndex);
            return { ...prev, currentIndex: newIndex };
          });
          break;
        case 'Enter':
          setShowConfirmDialog(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [state.currentIndex, state.questions, state.answers, state.startTime, state.attemptId, testId, session?.user?.id]);

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
              onClick={() => {
                setState(prev => {
                  const newIndex = Math.max(0, prev.currentIndex - 1);
                  saveToLocalStorageImmediately(newIndex);
                  return { ...prev, currentIndex: newIndex };
                });
              }}
              disabled={state.currentIndex === 0}
              className={styles.navButton}
            >
              <span className="material-icons">chevron_left</span>
              Previous
            </button>
            <button 
              onClick={() => {
                setState(prev => {
                  const newIndex = Math.min(totalQuestions - 1, prev.currentIndex + 1);
                  saveToLocalStorageImmediately(newIndex);
                  return { ...prev, currentIndex: newIndex };
                });
              }}
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
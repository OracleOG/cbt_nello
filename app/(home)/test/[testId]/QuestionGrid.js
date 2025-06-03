// components/QuestionGrid.jsx
'use client';
import { useEffect, useState } from 'react';
import styles from './QuestionGrid.module.css';

export default function QuestionGrid({ 
  questions, 
  currentIndex, 
  answeredQuestionIds, 
  onNavigate 
}) {
  const [normalizedQuestions, setNormalizedQuestions] = useState([]);

  useEffect(() => {
    // Ensure questions have stable IDs and handle undefined cases
    setNormalizedQuestions(
      questions.map(q => ({
        id: q?.id?.toString() || Math.random().toString(36).substring(2, 9),
        text: q?.text || 'Unknown question'
      }))
    );
  }, [questions]);

  return (
    <div className={styles.gridContainer}>
      <h3 className={styles.gridTitle}>Question Navigation</h3>
      <div className={styles.grid}>
        {normalizedQuestions.map((question, index) => {
          const isCurrent = index === currentIndex;
          const isAnswered = answeredQuestionIds.includes(question.id);
          
         

          return (
            <button
              key={question.id}
              className={`
                ${styles.gridItem}
                ${isCurrent ? styles.current : ''}
                ${isAnswered ? styles.answered : styles.unanswered}
              `}
              onClick={() => {
                console.log('Navigating to:', index);
                onNavigate(index);
              }}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
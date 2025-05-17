// components/QuestionGrid.jsx
'use client';
import styles from './QuestionGrid.module.css';

export default function QuestionGrid({ 
  totalQuestions, 
  currentIndex, 
  answeredQuestions, 
  onNavigate 
}) {
  return (
    <div className={styles.gridContainer}>
      <h3 className={styles.gridTitle}>Question Navigation</h3>
      <div className={styles.grid}>
        {Array.from({ length: totalQuestions }).map((_, index) => {
          const isAnswered = answeredQuestions.includes(index.toString());
          const isCurrent = index === currentIndex;
          console.log('answerdQuestions', answeredQuestions, index)
          
          return (
            <button
              key={index}
              className={`${styles.gridItem} ${
                isCurrent ? styles.current : ''
              } ${
                isAnswered ? styles.answered : styles.unanswered
              }`}
              onClick={() => onNavigate(index)}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Question ${index + 1} ${
                isAnswered ? 'answered' : 'unanswered'
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
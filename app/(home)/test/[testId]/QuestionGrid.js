// components/QuestionGrid.jsx
'use client';
import styles from './QuestionGrid.module.css';

export default function QuestionGrid({ 
  questions, 
  currentIndex, 
  answeredQuestionIds, 
  onNavigate 
}) {
  return (
    <div className={styles.gridContainer}>
    <h3 className={styles.gridTitle}>Question Navigation</h3>
    <div className={styles.grid}>
      {questions.map((question, index) => (
        <button
          key={question.id}
          className={`${styles.gridItem} ${
            index === currentIndex ? styles.current : ''
          } ${
            answeredQuestionIds.includes(question.id) ? styles.answered : styles.unanswered
          }`}
          onClick={() => onNavigate(index)}
        >
          {index + 1}
        </button>
      ))}
    </div>
  </div>
);
}
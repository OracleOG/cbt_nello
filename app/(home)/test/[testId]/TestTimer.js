'use client';
import { useEffect, useState } from 'react';
import styles from './TestTimer.module.css';

export default function TestTimer({ timeRemaining, durationMins }) {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [timeState, setTimeState] = useState('normal');

  useEffect(() => {
    setMinutes(Math.floor(timeRemaining / 60));
    setSeconds(timeRemaining % 60);
    
    // Set warning/critical states
    if (timeRemaining <= durationMins * 60 * 0.2) { // 20% remaining
      setTimeState('critical');
    } else if (timeRemaining <= durationMins * 60 * 0.5) { // 50% remaining
      setTimeState('warning');
    } else {
      setTimeState('normal');
    }
  }, [timeRemaining, durationMins]);

  const progressPercentage = (timeRemaining / (durationMins * 60)) * 100;

  return (
    <div className={`${styles.timerContainer} ${styles[timeState]}`}>
      <div className={styles.timeRemaining}>
        Time Remaining: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
      </div>
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
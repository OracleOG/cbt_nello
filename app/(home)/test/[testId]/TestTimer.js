// components/TestTimer.jsx
'use client';
import { useEffect, useState } from 'react';
import styles from './TestTimer.module.css'

export default function TestTimer({ startTime, durationMins }) {
  const [displayTime, setDisplayTime] = useState('0:00');
  const [percentComplete, setPercentComplete] = useState(0);

  useEffect(() => {
    if (!startTime || !durationMins) return;

    const updateTimer = () => {
      const totalSeconds = durationMins * 60;
      const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsed);

      // Update display
      const mins = Math.floor(remaining / 60);
      const secs = Math.floor(remaining % 60);
      setDisplayTime(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      
      // Update progress
      setPercentComplete((elapsed / totalSeconds) * 100);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, durationMins]);

  return (
    <div className={styles.timerContainer}>
      <div className={styles.timerText}>{displayTime}</div>
      <div className={styles.timerBar}>
        <div 
          className={styles.timerProgress}
          style={{ width: `${Math.min(100, percentComplete)}%` }}
        />
      </div>
    </div>
  );
}
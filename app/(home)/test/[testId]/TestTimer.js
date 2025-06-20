// components/TestTimer.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import styles from './TestTimer.module.css'

export default function TestTimer({ startTime, durationMins, onTimeUp }) {
  const [displayTime, setDisplayTime] = useState('0:00');
  const [percentComplete, setPercentComplete] = useState(0);
  const [isTabVisible, setIsTabVisible] = useState(true);

  const updateTimer = useCallback(() => {
    if (!startTime || !durationMins) return;

    const totalSeconds = durationMins * 60;
    const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    const remaining = Math.max(0, totalSeconds - elapsed);

    // Update display
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    setDisplayTime(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    
    // Update progress
    setPercentComplete((elapsed / totalSeconds) * 100);

    // Auto-submit when time is up
    if (remaining <= 0) {
      onTimeUp();
    }
  }, [startTime, durationMins, onTimeUp]);

  useEffect(() => {
    // Handle tab visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabVisible(false);
      } else {
        setIsTabVisible(true);
        // Reset timer when tab becomes visible again
        updateTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateTimer]);

  useEffect(() => {
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [updateTimer]);

  return (
    <div className={styles.timerContainer}>
      <div className={styles.timerText}>
        {displayTime}
        {!isTabVisible && <span className={styles.warning}> (Tab Inactive)</span>}
      </div>
      <div className={styles.timerBar}>
        <div 
          className={styles.timerProgress}
          style={{ width: `${Math.min(100, percentComplete)}%` }}
        />
      </div>
    </div>
  );
}
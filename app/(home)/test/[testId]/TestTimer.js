// components/TestTimer.jsx
'use client';
import { useEffect, useState } from 'react';
import './TestTimer.module.css'

export default function TestTimer({ timeRemaining, durationMins }) {
  const [displayTime, setDisplayTime] = useState('0:00');
  const [percentComplete, setPercentComplete] = useState(0);

  useEffect(() => {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    setDisplayTime(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    
    if (durationMins) {
      const totalSeconds = durationMins * 60;
      setPercentComplete(((totalSeconds - timeRemaining) / totalSeconds) * 100);
    }
  }, [timeRemaining, durationMins]);

  return (
    <div className="timer-container">
      <div className="timer-text">{displayTime}</div>
      <div className="timer-bar">
        <div 
          className="timer-progress" 
          style={{ width: `${percentComplete}%` }}
        />
      </div>
    </div>
  );
}
// Timer Worker
let timerInterval;

self.onmessage = function(e) {
  const { action, duration } = e.data;
  
  if (action === 'start') {
    let remaining = duration;
    
    timerInterval = setInterval(() => {
      remaining -= 1;
      self.postMessage({ 
        action: 'tick', 
        remaining,
        formatted: formatTime(remaining)
      });
      
      if (remaining <= 0) {
        clearInterval(timerInterval);
        self.postMessage({ action: 'timeout' });
      }
    }, 1000);
  } else if (action === 'stop') {
    clearInterval(timerInterval);
  }
};

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
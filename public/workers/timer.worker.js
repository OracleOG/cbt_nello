// public/workers/timer.worker.js
let timer;
let startTime;
let duration;

self.onmessage = function(e) {
  if (e.data.action === 'start') {
    startTime = e.data.startTime || Date.now();
    duration = e.data.duration * 1000; // Convert to ms
    
    // Clear any existing timer
    if (timer) clearTimeout(timer);
    
    tick();
  } else if (e.data.action === 'stop') {
    clearTimeout(timer);
    self.postMessage({ action: 'stopped' });
  }
};

function tick() {
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, duration - elapsed);
  
  self.postMessage({
    action: 'tick',
    remaining: Math.floor(remaining / 1000) // Convert back to seconds
  });

  if (remaining > 0) {
    timer = setTimeout(tick, 1000);
  } else {
    self.postMessage({ action: 'timeout' });
  }
}
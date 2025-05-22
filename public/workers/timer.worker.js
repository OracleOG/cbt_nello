// public/workers/timer.worker.js
let timer;
self.onmessage = function(e) {
  switch(e.data.action) {
    case 'start':
      clearInterval(timer);
      let remaining = e.data.duration;
      timer = setInterval(() => {
        remaining--;
        self.postMessage({ remaining });
        if (remaining <= 0) {
          clearInterval(timer);
          self.postMessage({ action: 'timeout' });
        }
      }, 1000);
      break;
    case 'stop':
      clearInterval(timer);
      break;
  }
};
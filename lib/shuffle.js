// lib/shuffle.js
export function shuffleWithSeed(array, seed) {
    // Add input validation
    if (!Array.isArray(array)) return [];
    if (array.some(item => item === undefined || item === null)) {
      console.warn('Shuffle array contains undefined/null values');
      return array.filter(item => item !== undefined && item !== null);
    }
  
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(getSeededRandom(seed + i) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  function getSeededRandom(seed) {
    if (typeof seed !== 'number') seed = 0; // Fallback for invalid seeds
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }
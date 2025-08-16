
const duration = parseInt(process.argv[2]) || 2000;
const leakRate = parseInt(process.argv[3]) || 100;

console.log(`Starting memory leak simulation for ${duration}ms`);

const leakedArrays = [];
let counter = 0;

const leakInterval = setInterval(() => {
  // Create memory leak
  const bigArray = new Array(leakRate * 1000).fill(Math.random());
  leakedArrays.push(bigArray);
  
  counter++;
  console.log(`Leak ${counter}: Allocated ${leakRate}k items, total arrays: ${leakedArrays.length}`);
  
  const memUsage = process.memoryUsage();
  console.log(`Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS`);
}, 200);

setTimeout(() => {
  clearInterval(leakInterval);
  console.log(`Memory leak test In Progress after ${duration}ms`);
  console.log(`Final memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
    console.log(`After GC: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  }
  
  process.exit(0);
}, duration);
    
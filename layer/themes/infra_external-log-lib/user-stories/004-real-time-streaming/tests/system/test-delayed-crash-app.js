
const delay = parseInt(process.argv[2]) || 1000;
const logCount = parseInt(process.argv[3]) || 5;

console.log(`Starting app that will crash after ${delay}ms and ${logCount} logs`);

let counter = 0;
const interval = setInterval(() => {
  counter++;
  console.log(`Log entry ${counter}: Still running at ${new Date().toISOString()}`);
  
  if (counter >= logCount) {
    clearInterval(interval);
    console.error(`FATAL: About to crash after ${counter} log entries`);
    console.error(`Stack trace will follow...`);
    
    // Simulate different types of crashes
    if (process.argv[4] === 'throw') {
      throw new Error('Intentional crash via throw');
    } else if (process.argv[4] === 'reference') {
      const obj = null;
      console.log(obj.nonexistent.property); // Reference error
    } else if (process.argv[4] === 'range') {
      const arr = [1, 2, 3];
      for (let i = 0; i < 1000000; i++) {
        arr[i] = i; // Range/memory error
      }
    } else {
      // Default: syntax-like error
      eval('invalid javascript syntax here');
    }
  }
}, delay / logCount);

process.on('uncaughtException', (error) => {
  console.error(`UNCAUGHT EXCEPTION: ${error.message}`);
  console.error(`Stack: ${error.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`UNHANDLED REJECTION at ${promise}: ${reason}`);
  process.exit(1);
});
    
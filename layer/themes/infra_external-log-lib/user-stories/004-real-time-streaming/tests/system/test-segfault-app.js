
console.log('Starting segfault simulation app');

const crashType = process.argv[2] || 'stack';
const delay = parseInt(process.argv[3]) || 500;

console.log(`Will simulate ${crashType} crash after ${delay}ms`);

setTimeout(() => {
  console.log('Preparing to simulate crash...');
  
  if (crashType === 'stack') {
    // Stack overflow
    function recursiveFunction() {
      console.log('Recursion depth increasing...');
      return recursiveFunction();
    }
    recursiveFunction();
  } else if (crashType === 'memory') {
    // Memory exhaustion
    const arrays = [];
    while (true) {
      arrays.push(new Array(1000000).fill('x'));
      console.log(`Allocated array ${arrays.length}, memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    }
  } else if (crashType === 'exit') {
    // Abrupt exit
    console.log('Calling process.abort()');
    process.abort();
  } else {
    // Default: throw error
    console.error('Throwing unhandled error');
    throw new Error('Simulated crash');
  }
}, delay);

process.on('uncaughtException', (error) => {
  console.error(`UNCAUGHT: ${error.message}`);
  process.exit(1);
});
    
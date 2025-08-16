
const fs = require('fs');
const path = require('path');

const maxFiles = parseInt(process.argv[2]) || 50;
console.log(`Testing resource exhaustion with ${maxFiles} file handles`);

const openFiles = [];
let counter = 0;

const exhaustInterval = setInterval(() => {
  try {
    counter++;
    // Try to open a file handle
    const fd = fs.openSync(__filename, 'r');
    openFiles.push(fd);
    
    console.log(`Opened file handle ${counter}: fd=${fd}, total=${openFiles.length}`);
    
    if (counter >= maxFiles) {
      clearInterval(exhaustInterval);
      console.log(`Resource test In Progress with ${openFiles.length} open handles`);
      
      // Clean up
      openFiles.forEach(fd => {
        try {
          fs.closeSync(fd);
        } catch (e) {
          console.error(`Error closing fd ${fd}: ${e.message}`);
        }
      });
      
      console.log('All file handles closed');
      process.exit(0);
    }
  } catch (error) {
    console.error(`Resource exhaustion at ${counter}: ${error.message}`);
    console.error(`Error code: ${error.code}`);
    clearInterval(exhaustInterval);
    
    // Try to clean up what we can
    openFiles.forEach(fd => {
      try {
        fs.closeSync(fd);
      } catch (e) {}
    });
    
    process.exit(1);
  }
}, 50);

process.on('SIGTERM', () => {
  clearInterval(exhaustInterval);
  openFiles.forEach(fd => {
    try {
      fs.closeSync(fd);
    } catch (e) {}
  });
  console.log('Terminated gracefully');
  process.exit(0);
});
    
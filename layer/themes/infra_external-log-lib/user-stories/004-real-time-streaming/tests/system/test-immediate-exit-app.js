
const exitCode = parseInt(process.argv[2]);
const message = process.argv[3] || 'immediate exit';

// Default to 0 if no argument provided or invalid
const finalExitCode = isNaN(exitCode) ? 0 : exitCode;

console.log(`Starting app that will exit with code ${finalExitCode}`);
console.log(`Message: ${message}`);

if (finalExitCode === 0) {
  console.log('Exiting normally');
} else {
  console.error(`Exiting with error code ${finalExitCode}`);
}

process.exit(finalExitCode);
    
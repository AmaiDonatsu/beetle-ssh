const fs = require('fs');

const stateFile = process.argv[2] || '/tmp/beetle-counter.txt';
let currentSecond = 0;

// Initialize file
fs.writeFileSync(stateFile, currentSecond.toString());

setInterval(() => {
  currentSecond++;
  fs.writeFileSync(stateFile, currentSecond.toString());
}, 1000);

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

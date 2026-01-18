// Generate a PBKDF2 password hash for Tom
// Usage: node hash-tom.js

const crypto = require('crypto');

const password = 'TempPass123!'; // Set Tom's password here
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');

console.log(`${salt}:${hash}`);
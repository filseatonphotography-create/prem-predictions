// Test Tom's login directly against the backend API
// Usage: node test-tom-login.js

const fetch = require('node-fetch');

const API_URL = 'http://localhost:5001/api/login';
const username = 'Tom';
const password = 'TempPass123!'; // The password you set for Tom

async function testLogin() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      console.log('SUCCESS:', data);
    } else {
      console.error('FAIL:', data);
    }
  } catch (err) {
    console.error('ERROR:', err);
  }
}

testLogin();

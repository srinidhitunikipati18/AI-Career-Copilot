// test.js - Automated Verification Test Suite for CareerNova-AI

const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
let serverProcess = null;
let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

async function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json: json
        });
      });
    });

    req.on('error', err => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n=== CareerNova-AI Test Suite ===\n');

  // Test 1: Check security - no hardcoded API keys in frontend files
  console.log('1. Security & File Integrity Check');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const indexHtmlHtml = fs.readFileSync(path.join(rootDir, 'index.html.html'), 'utf8');

  assert(!/const\s+GEMINI_API_KEY\s*=/i.test(indexHtml), 'index.html does not contain hardcoded API key');
  assert(!/const\s+GEMINI_API_KEY\s*=/i.test(indexHtmlHtml), 'index.html.html does not contain hardcoded API key');
  assert(indexHtml.includes("fetch('/api/analyze'"), 'index.html routes requests to secure backend /api/analyze');
  assert(fs.existsSync(path.join(rootDir, '.env')), '.env file exists for environment variables');
  assert(fs.existsSync(path.join(rootDir, '.env.example')), '.env.example exists');
  assert(fs.existsSync(path.join(rootDir, '.gitignore')), '.gitignore exists to protect .env from Git leaks');
  assert(fs.existsSync(path.join(rootDir, 'vercel.json')), 'vercel.json exists for Vercel deployment');
  assert(fs.existsSync(path.join(rootDir, 'api', 'analyze.js')), 'api/analyze.js exists for Vercel serverless function');
  assert(fs.existsSync(path.join(rootDir, 'backend', 'server.js')), 'backend/server.js exists for local development');

  // Test 2: Start server and test endpoints
  console.log('\n2. Starting local server and testing HTTP endpoints');
  const express = require('express');
  const server = require('./backend/server.js');
  // Give server 500ms to bind
  await new Promise(r => setTimeout(r, 600));

  const PORT = process.env.PORT || 3000;

  // Test 3: Health check
  console.log('\n3. Health Check Endpoint');
  const healthRes = await request({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/health',
    method: 'GET'
  });
  assert(healthRes.statusCode === 200, 'GET /api/health returned 200 OK');
  assert(healthRes.json && healthRes.json.status === 'healthy', 'Health check reports status: "healthy"');
  assert(healthRes.json && healthRes.json.project === 'CareerNova-AI', 'Health check reports project: "CareerNova-AI"');

  // Test 4: Frontend Serving
  console.log('\n4. Frontend Static Serving');
  const frontendRes = await request({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/',
    method: 'GET'
  });
  assert(frontendRes.statusCode === 200, 'GET / returned 200 OK');
  assert(frontendRes.body.includes('AI Career Copilot'), 'Root page contains title "AI Career Copilot"');
  assert(frontendRes.body.includes('analyzeResume()'), 'Root page contains analyzeResume function');

  const duplicateRes = await request({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/index.html.html',
    method: 'GET'
  });
  assert(duplicateRes.statusCode === 200, 'GET /index.html.html returned 200 OK');

  // Test 5: CORS Preflight
  console.log('\n5. CORS & Method Validation');
  const optionsRes = await request({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/analyze',
    method: 'OPTIONS', headers: { 'Origin': 'http://localhost:3000' }
  });
  assert(optionsRes.statusCode === 200 || optionsRes.statusCode === 204, 'OPTIONS /api/analyze returned 200 OK for CORS preflight');
  assert(optionsRes.headers['access-control-allow-origin'] === '*', 'CORS Allow-Origin header present');

  const getRes = await request({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/analyze',
    method: 'GET'
  });
  assert(getRes.statusCode === 405, 'GET /api/analyze rejected with 405 Method Not Allowed');

  // Test 6: Input Validation
  console.log('\n6. API Input Validation');
  const emptyRes = await request({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/analyze',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {});
  assert(emptyRes.statusCode === 400, 'Empty POST body rejected with 400 Bad Request');

  const shortRes = await request({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/analyze',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { resume: 'Too short', jobDesc: 'Too short' });
  assert(shortRes.statusCode === 400, 'Short input (< 50 chars) rejected with 400 Bad Request');
  assert(shortRes.json && shortRes.json.error.includes('Content too short'), 'Short input returns descriptive error message');

  // Test 7: Error handling for API key
  console.log('\n7. API Key Error Handling');
  const testPayload = {
    resume: 'John Doe, Senior Software Engineer with 6 years of experience in JavaScript, TypeScript, React, Node.js, and Cloud Architecture.',
    jobDesc: 'Looking for a Senior Full Stack Engineer with 5+ years of experience in JavaScript, React, Node.js, REST APIs, and AWS.'
  };

  const analyzeRes = await request({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/analyze',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, testPayload);

  // Test endpoint behavior with the configured environment key
  assert(analyzeRes.statusCode === 401 || analyzeRes.statusCode === 200, `POST /api/analyze handled properly (status ${analyzeRes.statusCode})`);
  if (analyzeRes.statusCode === 401) {
    assert(analyzeRes.json && analyzeRes.json.error.includes('Invalid Gemini API key'), 'Invalid key caught and returns clear instructions');
  } else if (analyzeRes.statusCode === 200) {
    assert(typeof analyzeRes.json.ats_score === 'number', 'Valid key returned ats_score number');
    assert(Array.isArray(analyzeRes.json.strengths), 'Valid key returned strengths array');
  }

  // Summary
  console.log('\n====================================');
  console.log(`Test Results: ${passedTests} / ${totalTests} passed`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('⚠️ Some tests failed.');
  }
  console.log('====================================\n');

  process.exit(passedTests === totalTests ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});




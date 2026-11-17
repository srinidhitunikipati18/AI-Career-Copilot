// backend/server.js - Local Development & Production Express Server

const path = require('path');
const fs = require('fs');

// Load environment variables from root .env
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const analyzeHandler = require('../api/analyze');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors({ origin: '*', optionsSuccessStatus: 200 }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey !== 'YOUR_API_KEY_HERE' && apiKey !== 'your_actual_gemini_api_key_here');
  res.json({
    status: 'healthy',
    project: 'CareerNova-AI',
    geminiKeyConfigured: isConfigured,
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  });
});

// Resume analysis API route (same handler used by Vercel serverless functions)
app.all('/api/analyze', (req, res) => {
  return analyzeHandler(req, res);
});

// Serve static frontend files from root directory
app.use(express.static(rootDir));

// Route for root
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Support duplicate extension request if accessed
app.get('/index.html.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Fallback to index.html for any unmatched non-API route
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey !== 'YOUR_API_KEY_HERE' && apiKey !== 'your_actual_gemini_api_key_here');

  console.log('====================================================');
  console.log(`🚀 CareerNova-AI is running!`);
  console.log(`📡 Local URL: http://localhost:${PORT}`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔑 Gemini API Key configured: ${isConfigured ? 'YES' : 'NO (add to .env)'}`);
  console.log(`🤖 Model: ${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}`);
  console.log('====================================================');
});


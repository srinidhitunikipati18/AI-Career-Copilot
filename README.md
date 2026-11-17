# CareerNova-AI — AI Career Copilot & Resume Analyzer

CareerNova-AI is an intelligent resume analysis platform that scores resumes against job descriptions, identifies missing keywords, highlights key strengths, and delivers actionable improvement advice using Google Gemini AI.

---

## 🚀 Features

- **🎯 ATS Match Score:** Conic gradient circular match indicator calculating ATS compatibility (0–100%).
- **📝 AI Summary:** Specific, data-backed assessment of candidate fit.
- **✅ Highlighted Strengths:** Pinpoints high-impact achievements and relevant experience.
- **🔍 Missing Keywords:** Identifies crucial skills, tools, and terms from the job description missing from the resume.
- **💡 Actionable Improvements:** Clear, numbered suggestions to optimize the resume.
- **🔒 Secure Architecture:** Gemini API key is strictly kept on the backend via environment variables, never exposed to client browsers.
- **⚡ Vercel Ready:** Includes native Vercel serverless functions (`/api/analyze`) and configuration for instant zero-config deployment.
- **💻 Local Development Support:** Fully functional local server (`backend/server.js`) for running and testing locally.

---

## 📁 Project Structure

```text
CareerNova-AI/
├── api/
│   └── analyze.js       # Vercel Serverless Function (Gemini API integration)
├── backend/
│   └── server.js        # Local development Express server
├── .env                 # Environment variables (private, git-ignored)
├── .env.example         # Template for environment variables
├── .gitignore           # Prevents committing .env and node_modules
├── index.html           # Main frontend (clean UI, design, responsive)
├── index.html.html      # Kept for compatibility with legacy shortcuts
├── package.json         # Dependencies and scripts
├── test.js              # Automated verification test suite
└── vercel.json          # Vercel deployment configuration
```

---

## 🛠️ Setup & Local Development

### 1. Configure Your Gemini API Key
Obtain a free Google Gemini API key from [Google AI Studio](https://aistudio.google.com).

Open the `.env` file in the project root and add your API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
PORT=3000
```

### 2. Start the Local Server
```bash
npm start
```
Or directly:
```bash
node backend/server.js
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🧪 Running Automated Tests

Run the built-in test suite to verify endpoints, CORS, validation, and security:
```bash
npm test
```

---

## ☁️ Deploying to Vercel

### Method 1: Deploy with Git (Recommended)
1. Push this project to your GitHub, GitLab, or Bitbucket repository.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New... > Project** and import the repository.
3. In **Settings > Environment Variables**, add:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** `your_actual_gemini_api_key_here`
4. Click **Deploy**. Vercel will automatically host the static frontend and deploy `api/analyze.js` as a serverless function!

### Method 2: Deploy with Vercel CLI
```bash
npm install -g vercel
vercel
```
When prompted to set environment variables, add `GEMINI_API_KEY`.

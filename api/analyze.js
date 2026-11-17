// api/analyze.js - Vercel Serverless Function for Resume Analysis

// If run outside Vercel (e.g. local Node script), load .env
try {
  require('dotenv').config();
} catch (e) {
  // dotenv is optional in production on Vercel
}

const SYSTEM_PROMPT = `You are an expert career coach and ATS (Applicant Tracking System) specialist with 10+ years of experience helping professionals land their dream jobs at top companies.

Your task: Analyze the provided resume against the job description and provide detailed, actionable feedback.

You MUST return your analysis as a valid JSON object with these exact fields:
{
  "ats_score": <number 0-100, where 100 is perfect match>,
  "summary": "<2-3 sentence overall assessment, specific and data-backed>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>", "<strength 4>"],
  "missing_keywords": ["<keyword 1>", "<keyword 2>", "<keyword 3>", "<keyword 4>", "<keyword 5>"],
  "improvements": ["<specific actionable improvement 1>", "<specific actionable improvement 2>", "<specific actionable improvement 3>"]
}

Rules:
- Be SPECIFIC and DATA-BACKED. Use numbers where possible (e.g., "3 years experience" not "good experience")
- Focus on ACTIONABLE advice, not generic feedback
- missing_keywords must be actual keywords from the job description that are NOT in the resume
- strengths must highlight what the resume does WELL
- improvements must be specific changes the candidate can make
- Keep each item concise (1-2 sentences max)
- If information is missing, note it as a gap
- Do NOT include any markdown code blocks or text outside the JSON object`;

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed. Please send a POST request with resume and jobDesc in the body.'
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (parseErr) {
        return res.status(400).json({ error: 'Invalid JSON request body.' });
      }
    }

    const { resume, jobDesc } = body || {};

    // Validate inputs
    if (!resume || !jobDesc) {
      return res.status(400).json({
        error: 'Please fill in both fields: resume and job description.'
      });
    }

    if (resume.trim().length < 50 || jobDesc.trim().length < 50) {
      return res.status(400).json({
        error: 'Content too short. Please provide at least 50 characters for both resume and job description.'
      });
    }

    // Retrieve API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_API_KEY_HERE' || apiKey === 'your_actual_gemini_api_key_here') {
      return res.status(500).json({
        error: 'GEMINI_API_KEY environment variable is not configured. Please add your Gemini API key to your .env file (for local development) or Vercel Environment Variables (for deployment).'
      });
    }

    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const userPrompt = `Resume:\n${resume.trim()}\n\nJob Description:\n${jobDesc.trim()}\n\nProvide your analysis strictly as a JSON object matching the requested schema.`;

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT + "\n\n" + userPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    };

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || `API error: ${response.status}`;
      if (response.status === 400 || response.status === 401 || (errMsg && errMsg.toLowerCase().includes('api key'))) {
        return res.status(401).json({
          error: 'Invalid Gemini API key. Please check your GEMINI_API_KEY in .env or Vercel Environment Variables. Get a free valid key at https://aistudio.google.com'
        });
      }
      if (response.status === 429 || (errMsg && errMsg.toLowerCase().includes('quota'))) {
        return res.status(429).json({
          error: 'Gemini API rate limit exceeded. Please wait a minute and try again.'
        });
      }
      return res.status(response.status).json({
        error: `Gemini API error: ${errMsg}`
      });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) {
      return res.status(502).json({ error: 'Empty response received from Gemini AI.' });
    }

    // Parse JSON from AI response (strip markdown wrappers if present)
    let analysis;
    try {
      analysis = JSON.parse(aiText);
    } catch (e1) {
      const cleaned = aiText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      try {
        analysis = JSON.parse(cleaned);
      } catch (e2) {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          return res.status(502).json({ error: 'AI did not return a valid JSON format.' });
        }
      }
    }

    const parseList = (val) => {
      if (Array.isArray(val)) return val.map(String).filter(Boolean);
      if (typeof val === 'string' && val.trim()) return [val.trim()];
      return [];
    };

    const parsedScore = Number(analysis.ats_score);
    const atsScore = !isNaN(parsedScore)
      ? Math.min(100, Math.max(0, Math.round(parsedScore)))
      : 70;

    const sanitizedAnalysis = {
      ats_score: atsScore,
      summary: String(analysis.summary || 'Resume analysis completed successfully.'),
      strengths: parseList(analysis.strengths),
      missing_keywords: parseList(analysis.missing_keywords),
      improvements: parseList(analysis.improvements)
    };

    return res.status(200).json(sanitizedAnalysis);

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      error: error.message || 'An unexpected error occurred during resume analysis.'
    });
  }
};

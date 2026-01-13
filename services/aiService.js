const fetch = global.fetch || require('node-fetch');
const pdfParse = require('pdf-parse');
const PDFText = require('../models/PDFText');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const truncate = (s, n = 3000) => (s && s.length > n ? s.slice(0, n) + '... [truncated]' : s || '');

async function tryFetchText(url) {
  if (!url) return null;
  try {
    // quick heuristic: fetch and if content-type is text, return text
    const res = await fetch(url);
    const ct = (res.headers && res.headers.get ? res.headers.get('content-type') : '') || '';

    // text-like content
    if (ct.includes('text') || ct.includes('vtt') || ct.includes('srt') || ct.includes('json')) {
      return await res.text();
    }

    // If PDF, try cache first then extract text server-side
    if (ct.includes('pdf') || url.toLowerCase().endsWith('.pdf')) {
      try {
        // check cache
        try {
          const cached = await PDFText.findOne({ url }).lean();
          if (cached && cached.text) return cached.text;
        } catch (e) {
          console.error('PDF cache lookup failed', e.message || e);
        }

        const arr = await res.arrayBuffer();
        const buffer = Buffer.from(arr);
        const parsed = await pdfParse(buffer);
        const text = parsed.text || null;

        // persist to cache (best-effort)
        if (text) {
          try {
            await PDFText.findOneAndUpdate(
              { url },
              { url, text, extractedAt: new Date() },
              { upsert: true, new: true }
            );
          } catch (e) {
            console.error('Failed to write PDF cache', e.message || e);
          }
        }

        return text;
      } catch (e) {
        console.error('pdf-parse failed for', url, e.message || e);
        return null;
      }
    }

    // otherwise, do not attempt to parse binary other types
    return null;
  } catch (err) {
    console.error('Failed to fetch text from', url, err.message || err);
    return null;
  }
}

async function askLLM({ user, course, progress, question }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured in environment');
  }

  // gather available raw content
  const pdfText = await tryFetchText(course.pdfUrl);
  // attempt common transcript extensions for video
  let videoTranscript = null;
  if (course.videoUrl) {
    const variants = [
      course.videoUrl.replace(/\.mp4$/i, '.vtt'),
      course.videoUrl + '.vtt',
      course.videoUrl + '.srt',
      course.videoUrl + '.txt'
    ];
    for (const v of variants) {
      const t = await tryFetchText(v);
      if (t) {
        videoTranscript = t;
        break;
      }
    }
  }

  const studentSummary = `Student: ${user.name || 'Student'} (${user.email || 'unknown'}). Progress: ${progress?.percentComplete ?? 0}%. Completed videos: ${((progress && progress.completedVideos) || []).join(', ') || 'none'}. Completed PDFs: ${((progress && progress.completedPDFs) || []).join(', ') || 'none'}.`;

  const courseSummary = `Course: ${course.title}\nDescription: ${truncate(course.description, 2000)}\nPDF URL: ${course.pdfUrl || 'none'}\nVideo URL: ${course.videoUrl || 'none'}`;

  const system = `You are an expert, helpful, and concise tutor assistant. Use the provided course materials and the student's progress to answer questions and recommend the next study step. Produce a JSON object with keys: answer (string), recommendation (short string telling what to study next), confidence (number 0-100). Do not add any extra commentary outside the JSON.`;

  const userPromptParts = [studentSummary, courseSummary];
  if (pdfText) userPromptParts.push('PDF Text:\n' + truncate(pdfText, 3000));
  if (videoTranscript) userPromptParts.push('Video Transcript:\n' + truncate(videoTranscript, 3000));
  userPromptParts.push('Question: ' + question);

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: userPromptParts.join('\n\n') }
  ];

  const body = {
    model: 'gpt-3.5-turbo',
    messages,
    max_tokens: 800,
    temperature: 0.2,
  };

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const assistant = data.choices?.[0]?.message?.content || '';

  // Try to parse JSON from assistant
  let parsed = null;
  try {
    parsed = JSON.parse(assistant);
  } catch (err) {
    // attempt to extract JSON substring
    const m = assistant.match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch (e) { parsed = null; }
    }
  }

  if (!parsed) {
    // Fallback: create a simple structure
    return {
      answer: assistant || 'Sorry, I could not generate an answer right now.',
      recommendation: `Continue studying ${course.title}`,
      confidence: 60,
    };
  }

  return {
    answer: parsed.answer || parsed.answer_text || parsed.response || '',
    recommendation: parsed.recommendation || parsed.next || parsed.recommend || '',
    confidence: parsed.confidence || parsed.conf || 80,
  };
}

module.exports = { askLLM };

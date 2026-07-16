// API endpoint that turns a recorded answer (audio) into text using
// OpenAI's Whisper transcription API. Called from QuestionFlow.jsx after
// a recording stops. Follows the same plain-handler pattern as the other
// files in this folder (e.g. send-invite.js) — no new npm dependencies,
// just fetch().
//
// Request body (JSON): { audio: '<base64 string>', mimeType: 'audio/webm' }
// Response: { text: '<transcript>' }  or  { error: '<message>' }
//
// The OpenAI key (OPENAI_API_KEY) lives only in Vercel's environment
// variables and is never sent to the browser.

const EXTENSION_BY_MIME = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};

function extensionForMimeType(mimeType) {
  if (!mimeType) return 'webm';
  const base = mimeType.split(';')[0].trim().toLowerCase();
  return EXTENSION_BY_MIME[base] || 'webm';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('transcribe: OPENAI_API_KEY is not set in this environment');
    return res.status(500).json({ error: 'Transcription is not configured on the server yet.' });
  }

  const { audio, mimeType } = req.body || {};

  if (!audio || typeof audio !== 'string') {
    return res.status(400).json({ error: 'Missing audio data' });
  }

  try {
    const buffer = Buffer.from(audio, 'base64');

    // Vercel Serverless Functions cap request bodies at 4.5MB regardless of
    // any in-code config, so a decoded buffer anywhere near that is already
    // too large to have gotten here reliably. This check exists to fail
    // with a clear message instead of a confusing crash.
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'Received empty audio data' });
    }

    const extension = extensionForMimeType(mimeType);
    const audioBlob = new Blob([buffer], { type: mimeType || 'audio/webm' });

    const openaiForm = new FormData();
    openaiForm.append('file', audioBlob, `answer.${extension}`);
    openaiForm.append('model', 'whisper-1');
    openaiForm.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: openaiForm,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI transcription error:', data);
      return res.status(502).json({ error: data?.error?.message || 'Transcription failed' });
    }

    return res.status(200).json({ text: (data.text || '').trim() });
  } catch (err) {
    console.error('transcribe error:', err);
    return res.status(500).json({ error: 'Server error during transcription' });
  }
}

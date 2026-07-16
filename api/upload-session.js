// API endpoint to handle upload sessions
// Stores image URLs temporarily so phone can send to computer

const sessions = new Map();

// Clean up old sessions after 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of sessions.entries()) {
    if (now - data.timestamp > 600000) { // 10 minutes
      sessions.delete(sessionId);
    }
  }
}, 60000); // Check every minute

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { sessionId } = req.query;

  if (!sessionId) {
    res.status(400).json({ error: 'Session ID required' });
    return;
  }

  if (req.method === 'POST') {
    // Phone uploads image URL
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      res.status(400).json({ error: 'Image URL required' });
      return;
    }

    sessions.set(sessionId, {
      imageUrl,
      timestamp: Date.now()
    });

    res.status(200).json({ success: true });
  } else if (req.method === 'GET') {
    // Computer checks for uploaded image
    const sessionData = sessions.get(sessionId);

    if (sessionData) {
      res.status(200).json({ imageUrl: sessionData.imageUrl });
      // Clean up after retrieval
      sessions.delete(sessionId);
    } else {
      res.status(404).json({ imageUrl: null });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

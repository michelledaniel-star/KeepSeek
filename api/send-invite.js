export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, keeperName, inviteLink, message } = req.body;

  if (!to || !inviteLink) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${keeperName} via KeepSeek <noreply@mykeepseek.com>`,
        to: [to],
        subject: `You're invited to view ${keeperName}'s collection on KeepSeek`,
        text: message,
        html: `
          <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
            <div style="margin-bottom: 32px;">
              <span style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 500; letter-spacing: -0.5px;">keep</span><span style="font-family: Georgia, serif; font-size: 22px; font-style: italic; letter-spacing: 1px;">seek</span>
            </div>
            <div style="white-space: pre-line; font-size: 15px; line-height: 1.7; color: #333; margin-bottom: 32px;">
              ${message.replace(inviteLink, '')}
            </div>
            <a href="${inviteLink}" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 28px; font-family: Arial, sans-serif; font-size: 13px; letter-spacing: 0.05em;">
              Create Account to View KeepSeek Gallery
            </a>
            <p style="margin-top: 40px; font-size: 12px; color: #999; font-family: Arial, sans-serif;">
              This invitation was sent via <a href="https://mykeepseek.com" style="color: #669999;">KeepSeek</a>. If you weren't expecting this, you can ignore it.
            </p>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend error:', data);
      return res.status(500).json({ error: data.message || 'Failed to send email' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Send invite error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

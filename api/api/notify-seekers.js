import Airtable from 'airtable';
import { createClient } from '@supabase/supabase-js';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Find all draft items
    const draftItems = await new Promise((resolve, reject) => {
      const records = [];
      base('Items').select({
        filterByFormula: "{Status} = 'draft'"
      }).eachPage((page, next) => {
        records.push(...page);
        next();
      }, (err) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    if (draftItems.length === 0) {
      return res.status(200).json({ success: true, message: 'No draft items' });
    }

    // 2. Flip all draft items to public
    const chunkSize = 10;
    for (let i = 0; i < draftItems.length; i += chunkSize) {
      const chunk = draftItems.slice(i, i + chunkSize).map(r => ({
        id: r.id,
        fields: { Status: 'public' }
      }));
      await base('Items').update(chunk);
    }

    // 3. Get keeper info
    const keeperRecord = await new Promise((resolve, reject) => {
      base('People').select({
        filterByFormula: "{Relationship} = 'Self'",
        maxRecords: 1
      }).firstPage((err, records) => {
        if (err) reject(err);
        else resolve(records[0]);
      });
    });

    const keeperName = keeperRecord?.fields?.Name || 'Your keeper';

    // 4. Get all seeker emails from Supabase
    const { data: seekers } = await supabase.from('seekers').select('email, name');
    if (!seekers || seekers.length === 0) {
      return res.status(200).json({ success: true, message: 'Items published, no seekers to notify' });
    }

    // 5. Send email to each seeker
    await Promise.all(seekers.map(seeker =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${keeperName} via KeepSeek <noreply@mykeepseek.com>`,
          to: [seeker.email],
          subject: `${keeperName} added new items to their collection`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
              <div style="margin-bottom: 32px;">
                <span style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 500;">keep</span><span style="font-family: Georgia, serif; font-size: 22px; font-style: italic;">seek</span>
              </div>
              <p style="font-size: 15px; line-height: 1.7; color: #333; margin-bottom: 32px;">
                Hi ${seeker.name},<br><br>
                ${keeperName} just added ${draftItems.length} new ${draftItems.length === 1 ? 'item' : 'items'} to their collection on KeepSeek.
              </p>
              <a href="https://mykeepseek.com/s/${req.body.keeperSlug}/gallery" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 28px; font-family: Arial, sans-serif; font-size: 13px; letter-spacing: 0.05em;">
                View Collection
              </a>
              <p style="margin-top: 40px; font-size: 12px; color: #999; font-family: Arial, sans-serif;">
                You received this because you were invited to view this collection on <a href="https://mykeepseek.com" style="color: #669999;">KeepSeek</a>.
              </p>
            </div>
          `,
        }),
      })
    ));

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('notify-seekers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
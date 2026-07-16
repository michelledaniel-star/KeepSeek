import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify the request is from the actual keeper
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get keeper row and verify slug matches
  const { keeperSlug } = req.body;
  if (!keeperSlug) {
    return res.status(400).json({ error: 'keeperSlug is required' });
  }

  const { data: keeper, error: keeperError } = await supabase
    .from('keepers')
    .select('id, name, slug')
    .eq('user_id', user.id)
    .eq('slug', keeperSlug)
    .maybeSingle();

  if (keeperError || !keeper) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // 1. Find all draft items for this keeper
    const { data: draftItems, error: fetchError } = await supabase
      .from('items')
      .select('id')
      .eq('keeper_id', keeper.id)
      .eq('status', 'draft');

    if (fetchError) throw fetchError;

    console.log('Draft items found:', draftItems?.length);
    if (!draftItems || draftItems.length === 0) {
      return res.status(200).json({ success: true, message: 'No draft items' });
    }

    // 2. Flip all draft items to public in one atomic query
    const draftIds = draftItems.map(item => item.id);
    const { error: updateError } = await supabase
      .from('items')
      .update({ status: 'public' })
      .in('id', draftIds);

    if (updateError) throw updateError;

    // 3. Get seekers connected to this keeper with their emails
    const { data: accessRows, error: accessError } = await supabase
      .from('access')
      .select('seeker_id')
      .eq('keeper_slug', keeperSlug);

    if (accessError) throw accessError;
    console.log('Access rows found:', accessRows?.length);
    if (!accessRows || accessRows.length === 0) {
      return res.status(200).json({ success: true, message: 'Items published, no seekers to notify' });
    }

    const seekerIds = accessRows.map(a => a.seeker_id);
    const { data: seekers, error: seekerError } = await supabase
      .from('seekers')
      .select('email, name')
      .in('user_id', seekerIds);

    if (seekerError) throw seekerError;
    console.log('Seekers found:', seekers?.length);
    if (!seekers || seekers.length === 0) {
      return res.status(200).json({ success: true, message: 'Items published, no seekers to notify' });
    }

    // 4. Email each seeker
    const keeperName = keeper.name || 'Your keeper';
    const itemCount = draftItems.length;

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
                ${keeperName} just added ${itemCount} new ${itemCount === 1 ? 'item' : 'items'} to their collection on KeepSeek.
              </p>
              <a href="https://mykeepseek.com/s/${keeperSlug}/gallery" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 28px; font-family: Arial, sans-serif; font-size: 13px; letter-spacing: 0.05em;">
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
    return res.status(500).json({ error: err.message });
  }
}
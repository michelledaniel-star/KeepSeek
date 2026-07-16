import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email, name, keeperSlug, relationship, generation } = req.body;

  if (!userId || !email || !name || !keeperSlug || !relationship) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Only insert seeker row if one doesn't already exist for this user
    const { data: existingSeeker } = await supabase
      .from('seekers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingSeeker) {
      const { error: seekerError } = await supabase
        .from('seekers')
        .insert({ user_id: userId, email, name });
      if (seekerError) throw seekerError;
    }

    // Only insert access row if one doesn't already exist for this seeker+keeper combination
    const { data: existingAccess } = await supabase
      .from('access')
      .select('id')
      .eq('seeker_id', userId)
      .eq('keeper_slug', keeperSlug)
      .maybeSingle();

    if (!existingAccess) {
      const { error: connectionError } = await supabase
        .from('access')
        .insert({
          seeker_id: userId,
          keeper_slug: keeperSlug,
          relationship,
          generation: generation ?? 0,
          status: 'active',
        });
      if (connectionError) throw connectionError;
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('create-seeker error:', err);
    return res.status(500).json({ error: err.message });
  }
}
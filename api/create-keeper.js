import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email, slug, name } = req.body;

  if (!userId || !email || !slug || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Insert keeper row
    const { data: keeper, error: keeperError } = await supabase
      .from('keepers')
      .insert({
        user_id: userId,
        slug,
        email,
        name,
        profile_complete: false,
      })
      .select()
      .single();

    if (keeperError) throw keeperError;

    // 2. Insert Self person row using the new keeper's id
    const { data: selfPerson, error: personError } = await supabase
      .from('people')
      .insert({
        keeper_id: keeper.id,
        name,
        relationship: 'Self',
        side: '',
        generation: 0,
      })
      .select()
      .single();

    if (personError) throw personError;

    // 3. Save self_person_id back to keeper row
    const { error: updateError } = await supabase
      .from('keepers')
      .update({ self_person_id: selfPerson.id })
      .eq('id', keeper.id);

    if (updateError) throw updateError;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('create-keeper error:', err);
    return res.status(500).json({ error: err.message });
  }
}
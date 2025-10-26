// pages/api/quiz/dashboard.js
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req, res) {
  // Create a server client that reads Supabase auth cookies
  const supabase = createPagesServerClient({ req, res });

  // Ensure the user is signed in (session comes from cookies)
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return res.status(500).json({ ok: false, error: sessionError.message });
  }
  if (!session) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  // Optional: take an input (e.g., ?limit=10)
  const limit = Number(req.query.limit || 10);

  // Example query (adjust table/columns to yours)
  const { data, error } = await supabase
    .from('quiz_questions')        // <-- your table
    .select('*')                   // <-- your columns
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }

  return res.status(200).json({ ok: true, data });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.


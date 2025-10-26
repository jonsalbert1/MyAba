import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * 🔐 Example: Secure server-side auth route
 * This checks for a valid user ID or returns an error.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // You can pass a user_id in query or from client session
    const userId = req.query.user_id as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing user_id parameter' });
    }

    // Example: Fetch user data from the 'auth.users' table
    const { data, error } = await supabaseAdmin
      .from('profiles') // 👈 replace with your own table (or use 'auth.users' with PostgREST)
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ ok: true, user: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "Not a route (placeholder)" });
}


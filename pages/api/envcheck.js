export default function handler(req, res) {
  res.status(200).json({
    hasUrl: !!process.env.SUPABASE_URL,
    hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.


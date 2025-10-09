const { pool } = require('../_db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { deck_id, user_id, duration_seconds, correct, incorrect } = body;

    if (!duration_seconds) {
      return res.status(400).json({ ok:false, error:'duration_seconds required' });
    }

    const { rows } = await pool.query(
      `insert into safmeds_sessions (deck_id, user_id, duration_seconds, correct, incorrect)
         values ($1,$2,$3,$4,$5)
       returning id, started_at`,
      [deck_id || null, user_id || null, duration_seconds, correct || 0, incorrect || 0]
    );
    res.status(201).json({ ok:true, id: rows[0].id, started_at: rows[0].started_at });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
};

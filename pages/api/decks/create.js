const { pool } = require('../../_db');

const ALLOWED = new Set(['flash','safmeds','quiz']);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { name, dtype, user_id } = body;

    if (!name || !dtype || !ALLOWED.has(dtype)) {
      return res.status(400).json({ ok:false, error:"name and dtype ('flash'|'safmeds'|'quiz') required" });
    }

    const { rows } = await pool.query(
      `insert into decks (name, dtype, user_id) values ($1,$2,$3) returning id, name, dtype, created_at`,
      [name, dtype, user_id || null]
    );
    res.status(201).json({ ok:true, deck: rows[0] });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
};

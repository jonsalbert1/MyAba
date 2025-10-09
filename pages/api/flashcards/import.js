const { pool } = require('../_db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow','POST');
    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { deck_id, items } = body;
    if (!deck_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok:false, error:'deck_id and items[] required' });
    }

    // items: [{term, def}, ...]
    const j = JSON.stringify(items);
    const q = `
      insert into flashcards (deck_id, term, def)
      select $1, x->>'term', x->>'def'
      from json_array_elements($2::json) as x
    `;
    const result = await pool.query(q, [deck_id, j]);
    res.status(201).json({ ok:true, inserted: result.rowCount });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
};

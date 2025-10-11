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

    // items: [{domain, question, optionA, optionB, optionC, optionD, answer, rationale}]
    const j = JSON.stringify(items);
    const q = `
      insert into quizzes (deck_id, domain, question, option_a, option_b, option_c, option_d, answer, rationale)
      select $1,
             x->>'domain',
             x->>'question',
             x->>'optionA',
             x->>'optionB',
             x->>'optionC',
             x->>'optionD',
             upper(coalesce(x->>'answer','A')),
             x->>'rationale'
      from json_array_elements($2::json) as x
    `;
    const result = await pool.query(q, [deck_id, j]);
    res.status(201).json({ ok:true, inserted: result.rowCount });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
};

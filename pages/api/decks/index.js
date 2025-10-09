const { pool } = require('../../_db');

module.exports = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `select id, name, dtype, created_at from decks order by created_at desc limit 200`
    );
    res.status(200).json({ ok:true, decks: rows });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
};

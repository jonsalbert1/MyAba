// api/db-test.js
const { pool } = require('./_db');

module.exports = async (req, res) => {
  try {
    const { rows } = await pool.query('select now() as now');
    res.status(200).json({ ok: true, now: rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};


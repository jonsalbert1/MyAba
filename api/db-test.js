const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  try {
    const result = await sql`select now() as now`;
    res.status(200).json({ ok: true, now: result.rows[0].now });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
}
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from "react";
export default async function handler(req, res) {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const deck = (process.env.GLOBAL_DECK_ID || '').trim();
  if (!url || !key) { res.status(500).json({ error: 'Missing Supabase env vars' }); return; }

  const db = createClient(url, key);

  async function pull(table) {
    let q = db.from(table).select('*').order('id', { ascending: true });
    if (deck) q = q.eq('deck_id', deck);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  try {
    // Try singular, then plural
    let rows;
    try { rows = await pull('quiz'); }
    catch { rows = await pull('quizzes'); }

    // Normalize to what quiz.html expects
    const out = rows.map(r => {
      const opts = Array.isArray(r.options) ? r.options : [r.a, r.b, r.c, r.d];
      let correctIndex = Number.isInteger(r.correct) ? r.correct : -1;
      if (correctIndex < 0 && typeof r.correct === 'string') {
        const i = ['a','b','c','d'].indexOf(r.correct.toLowerCase());
        if (i >= 0) correctIndex = i;
      }
      return {
        id: r.id,
        domain: r.domain ?? null,
        question: r.question ?? '',
        options: opts,
        correctIndex,
        rationale: r.rationale ?? ''
      };
    });

    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: 'DB error', message: String(e?.message || e) });
  }
}

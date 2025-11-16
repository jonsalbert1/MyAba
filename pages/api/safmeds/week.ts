// pages/api/safmeds/week.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getUserId(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  // 1) Try cookie session (browser)
  try {
    const sb = createPagesServerClient({ req, res });
    const { data: { user } } = await sb.auth.getUser();
    if (user?.id) return user.id;
  } catch {
    /* ignore; try bearer */
  }
  // 2) Try Bearer token (mobile/other clients)
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const userId = await getUserId(req, res);
  if (!userId) return res.status(401).json({ ok: false, error: "Auth session missing!" });

  // Inputs
  const deck = (req.query.deck ? String(req.query.deck) : "").trim();
  let start = String(req.query.start ?? ""); // YYYY-MM-DD (Pacific)
  let end   = String(req.query.end   ?? ""); // YYYY-MM-DD (Pacific)

  // Default to last 7 Pacific days if missing
  if (!start || !end) {
    const nowPST = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const endD = new Date(nowPST);
    const startD = new Date(nowPST); startD.setDate(endD.getDate() - 6);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    start = iso(startD);
    end = iso(endD);
  }

  // Validate YYYY-MM-DD shape (very light)
  const yyyyMmDd = /^\d{4}-\d{2}-\d{2}$/;
  if (!yyyyMmDd.test(start) || !yyyyMmDd.test(end)) {
    return res.status(400).json({ ok: false, error: "start/end must be YYYY-MM-DD (Pacific)" });
  }

  try {
    // Query best-of-day in date range for this user (+ optional deck)
    let q = supabaseAdmin
      .from("v_safmeds_daily_best")
      .select("local_day, deck, correct, incorrect, net_score")
      .eq("user_id", userId)
      .gte("local_day", start)
      .lte("local_day", end)
      .order("local_day", { ascending: true });

    if (deck) q = q.eq("deck", deck);

    const { data, error } = await q;
    if (error) return res.status(400).json({ ok: false, error: error.message });

    // Build full day list (inclusive)
    const days: string[] = [];
    {
      const from = new Date(`${start}T00:00:00-08:00`); // Pacific anchor
      const to   = new Date(`${end}T00:00:00-08:00`);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        days.push(d.toISOString().slice(0, 10));
      }
    }

    // Group by deck
    const byDeck = new Map<string, any[]>();
    for (const r of (data ?? [])) {
      if (!byDeck.has(r.deck)) byDeck.set(r.deck, []);
      byDeck.get(r.deck)!.push(r);
    }
    const decks = deck ? [deck] : (byDeck.size ? Array.from(byDeck.keys()) : []);

    // If no data and no explicit deck, return empty
    if (!deck && decks.length === 0) {
      return res.status(200).json({ ok: true, start, end, rows: [] });
    }

    // Fill missing days with zeros per deck
    const rows = (decks.length ? decks : [deck]).flatMap((dk) => {
      const arr = byDeck.get(dk) ?? [];
      const map = new Map(arr.map((r: any) => [r.local_day, r]));
      return days.map((ld) => {
        const r = map.get(ld);
        return {
          local_day: ld,
          deck: dk,
          correct: r?.correct ?? 0,
          incorrect: r?.incorrect ?? 0,
          net_score: r?.net_score ?? 0,
        };
      });
    });

    return res.status(200).json({ ok: true, start, end, rows });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? "Server error" });
  }
}

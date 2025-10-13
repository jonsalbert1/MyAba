// pages/api/flashcards.ts
import type { NextApiRequest, NextApiResponse } from "next";

const baseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const anon = process.env.SUPABASE_ANON_KEY || "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const GLOBAL_DECK = process.env.GLOBAL_DECK_ID || "GLOBAL";

function ensureEnv(forWrite = false) {
  if (!baseUrl) throw new Error("SUPABASE_URL missing");
  if (!anon) throw new Error("SUPABASE_ANON_KEY missing");
  if (forWrite && !service) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      ensureEnv(false);

      const all = req.query.all === "1";
      const deck = (req.query.deck as string) || GLOBAL_DECK;
      const domain = (req.query.domain as string) || "";
      const includeNull = req.query.includeNull !== "0"; // default true
      const limit = Math.max(1, Math.min(1000, Number(req.query.limit ?? 500)));

      // Build PostgREST query: select the columns we actually use
      const params = new URLSearchParams();
      params.set("select", "id,term,definition,domain,deck,created_at");
      params.set("order", "created_at.asc");
      params.set("limit", String(limit));

      // Filters
      const filters: string[] = [];
      if (!all) {
        if (includeNull) {
          // deck = specified OR deck IS NULL
          filters.push(`or=(deck.eq.${encodeURIComponent(deck)},deck.is.null)`);
        } else {
          filters.push(`deck=eq.${encodeURIComponent(deck)}`);
        }
      }
      if (domain.trim()) {
        filters.push(`domain=eq.${encodeURIComponent(domain.trim())}`);
      }

      const filterQS = filters.length ? "&" + filters.join("&") : "";
      const url = `${baseUrl}/rest/v1/study_cards?${params.toString()}${filterQS}`;

      const r = await fetch(url, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      });

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        return res.status(500).json({ ok: false, error: `Supabase REST ${r.status}: ${t}` });
      }

      const data = await r.json();

      // Also get a total count (diagnostic) without transferring rows
      const headUrl = `${baseUrl}/rest/v1/study_cards?select=id&limit=1`;
      const head = await fetch(headUrl, {
        method: "GET",
        headers: {
          apikey: anon,
          Authorization: `Bearer ${anon}`,
          Prefer: "count=exact",
        },
      });

      const total = head.headers.get("content-range")?.split("/")?.[1] ?? null;

      return res.status(200).json({
        ok: true,
        deck: all ? null : deck,
        domain: domain || null,
        includeNull: all ? null : includeNull,
        total: total ? Number(total) : null,
        matched: Array.isArray(data) ? data.length : 0,
        data,
      });
    }

    if (req.method === "POST") {
      ensureEnv(true);
      const body = req.body || {};
      const term = String(body.term ?? "").trim();
      const definition = String(body.definition ?? "").trim();
      const domain = body.domain ? String(body.domain).trim() : null;
      const deck = (body.deck ? String(body.deck).trim() : "") || GLOBAL_DECK;

      if (!term || !definition) {
        return res.status(400).json({ ok: false, error: "term and definition required" });
      }

      const payload = [{ term, definition, domain, deck }];

      const r = await fetch(`${baseUrl}/rest/v1/study_cards`, {
        method: "POST",
        headers: {
          apikey: service,
          Authorization: `Bearer ${service}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        return res.status(500).json({ ok: false, error: `Supabase REST ${r.status}: ${t}` });
      }

      const inserted = await r.json();
      return res.status(201).json({ ok: true, data: inserted?.[0] ?? null });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type QuizRow = {
  domain?: string;
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  answer: "A" | "B" | "C" | "D";
  rationale?: string;
};

export async function POST(req: Request) {
  try {
    const { deckId = "default", records } = await req.json() as {
      deckId?: string;
      records: QuizRow[];
    };

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "records must be a non-empty array" }, { status: 400 });
    }

    const { error, count } = await supabaseAdmin
      .from("quiz_items")
      .insert(records.map((r) => ({ deck_id: deckId, ...r })), { count: "exact" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, count: count ?? records.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

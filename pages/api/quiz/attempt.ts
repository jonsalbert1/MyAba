// pages/api/quiz/attempt.ts
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { json } from "@/lib/api-helpers";

type AnswerLetterUpper = "A" | "B" | "C" | "D";
type ChoiceLower = "a" | "b" | "c" | "d";

// normalize text for comparison (matches runner intent)
const norm = (s: string | null | undefined) =>
  String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const isAnswerLetterUpper = (x: any): x is AnswerLetterUpper =>
  x === "A" || x === "B" || x === "C" || x === "D";

const choiceLowerToUpper = (c: ChoiceLower): AnswerLetterUpper =>
  c === "a" ? "A" : c === "b" ? "B" : c === "c" ? "C" : "D";

type QuizRow = {
  id: string;
  subdomain?: string | null;
  a?: string | null;
  b?: string | null;
  c?: string | null;
  d?: string | null;

  // v2 (and possibly v1): correct answer as TEXT (or legacy letter)
  correct_answer?: string | null;

  // legacy v1: correct key as a|b|c|d (kept for compatibility if column exists)
  correct?: string | null;
};

const getOptionText = (item: QuizRow, letter: AnswerLetterUpper | null) => {
  if (!letter) return null;
  return letter === "A"
    ? item.a ?? null
    : letter === "B"
    ? item.b ?? null
    : letter === "C"
    ? item.c ?? null
    : item.d ?? null;
};

// Single truth for correctness:
// - v2: correct_answer is already correct option text
// - if correct_answer is "A/B/C/D", map to option text
// - if correct_answer absent but "correct" exists (a/b/c/d), map to option text
const getCorrectText = (item: QuizRow) => {
  const ca = item.correct_answer ?? null;
  if (ca) {
    if (isAnswerLetterUpper(ca)) return getOptionText(item, ca);
    return ca; // text truth
  }

  const legacy = (item.correct ?? "").toLowerCase();
  if (legacy === "a" || legacy === "b" || legacy === "c" || legacy === "d") {
    const up = choiceLowerToUpper(legacy as ChoiceLower);
    return getOptionText(item, up);
  }

  return null;
};

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }

    const { subdomain, question_id, choice, user_id } = req.body || {};
    const choiceNorm = String(choice || "").toLowerCase();

    if (!subdomain || !question_id || !/^[a-d]$/.test(choiceNorm)) {
      return json(res, 400, {
        ok: false,
        error:
          "Missing/invalid fields (need subdomain, question_id, choice in a-d)",
      });
    }

    const choiceLower = choiceNorm as ChoiceLower;
    const selectedLetter = choiceLowerToUpper(choiceLower);

    const selectCols = "id, subdomain, a, b, c, d, correct_answer, correct";

    // ✅ Use v2 only (no fallback)
    const q2 = await supabase
      .from("quiz_questions_v2")
      .select(selectCols)
      .eq("id", question_id)
      .maybeSingle();

    if (q2.error) {
      return json(res, 400, {
        ok: false,
        error: q2.error.message,
        code: (q2.error as any)?.code,
        details: (q2.error as any)?.details,
      });
    }

    const row: QuizRow | null = (q2.data as any) ?? null;

    if (!row) {
      return json(res, 400, { ok: false, error: "Question not found" });
    }

    // Compute correctness by TEXT (same logic as runner)
    const selectedText = getOptionText(row, selectedLetter);
    const correctText = getCorrectText(row);

    const is_correct =
      !!selectedText && !!correctText && norm(selectedText) === norm(correctText);

    // Save attempt (store choice as a|b|c|d; is_correct is text-true)
    const insert: any = {
      user_id: user_id ?? null,
      subdomain,
      question_id,
      choice: choiceLower,
      is_correct,
      // source: "quiz_questions_v2", // enable ONLY if your quiz_attempts table has this column
    };

    const { data, error } = await supabase
      .from("quiz_attempts")
      .insert(insert)
      .select()
      .single();

    if (error) {
      return json(res, 500, {
        ok: false,
        error: error.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
      });
    }

    return json(res, 200, {
      ok: true,
      data: {
        ...data,
        is_correct,
      },
    });
  } catch (e: any) {
    return json(res, 500, { ok: false, error: e.message || "Unexpected error" });
  }
}


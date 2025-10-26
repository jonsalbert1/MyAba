import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  const { data, error } = await supabase
    .from('quiz')
    .select('id, domain, question, a, b, c, d, correct, rationale')
    .order('id', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const out = (data ?? []).map(r => ({
    id: r.id,
    domain: r.domain,
    question: r.question,
    options: [r.a, r.b, r.c, r.d],
    correctIndex: Number(r.correct),
    rationale: r.rationale ?? ''
  }));
  return NextResponse.json(out);
}

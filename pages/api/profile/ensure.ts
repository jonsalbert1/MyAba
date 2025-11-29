// pages/api/profile/ensure.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Data =
  | { ok: true; id: string; email: string }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const { userId, email } = req.body as {
    userId?: string;
    email?: string;
  };

  if (!userId || !email) {
    return res.status(400).json({
      ok: false,
      error: "Missing userId or email in request body",
    });
  }

  try {
    // 🔹 Upsert ensures we never get duplicate-key errors.
    //    onConflict: "id" uses the primary key, which is what we want.
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          first_name: null,
          last_name: null,
          is_admin: false,
        },
        { onConflict: "id" }
      )
      .select("id, email")
      .single();

    if (error) {
      console.error("ensure-profile upsert error:", error);
      return res.status(500).json({
        ok: false,
        error: error.message ?? "Upsert failed",
      });
    }

    if (!data) {
      console.error("ensure-profile: upsert returned no data");
      return res.status(500).json({
        ok: false,
        error: "Upsert returned no data",
      });
    }

    return res.status(200).json({
      ok: true,
      id: data.id,
      email: data.email,
    });
  } catch (err: any) {
    console.error("ensure-profile unexpected error:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message ?? "Unknown error",
    });
  }
}

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type WebhookPayload = {
  record?: any; // new row (INSERT) or updated row (UPDATE)
  old_record?: any; // old row (UPDATE/DELETE)
  type?: string; // "INSERT" | "UPDATE" | ...
  table?: string;
  schema?: string;
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function hasName(firstName: string, lastName: string) {
  return Boolean(firstName.trim() || lastName.trim());
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ ok: false, error: "Use POST" }, 405);

    const RESEND_API_KEY = (Deno.env.get("RESEND_API_KEY") ?? "").trim();

    // ✅ You said you're keeping this as jon@myaba.app via secrets
    const ADMIN_NOTIFY_EMAIL = (
      Deno.env.get("ADMIN_NOTIFY_EMAIL") ?? "jon@myaba.app"
    ).trim();

    const FROM_EMAIL = (
      Deno.env.get("FROM_EMAIL") ?? "myABA <onboarding@resend.dev>"
    ).trim();

    if (!RESEND_API_KEY) return json({ ok: false, error: "Missing RESEND_API_KEY" }, 500);
    if (!ADMIN_NOTIFY_EMAIL) return json({ ok: false, error: "Missing ADMIN_NOTIFY_EMAIL" }, 500);
    if (!FROM_EMAIL) return json({ ok: false, error: "Missing FROM_EMAIL" }, 500);

    const payload = (await req.json()) as WebhookPayload;

    console.log("[notify-new-user] webhook meta", {
      type: payload.type,
      schema: payload.schema,
      table: payload.table,
      hasRecord: !!payload.record,
      hasOld: !!payload.old_record,
      recordKeys: payload.record ? Object.keys(payload.record) : [],
    });

    // ✅ We only want to send after user enters name (UPDATE event)
    if (payload.type !== "UPDATE") {
      return json({
        ok: true,
        skipped: true,
        reason: `Ignore event type ${payload.type ?? "(missing)"}. Send only on UPDATE.`,
      });
    }

    const r = payload.record ?? {};
    const o = payload.old_record ?? {};

    const userId = String(r.id ?? "");
    const email = String(r.email ?? "");
    const firstName = String(r.first_name ?? "");
    const lastName = String(r.last_name ?? "");
    const createdAt = String(r.created_at ?? "");

    if (!userId) return json({ ok: true, skipped: true, reason: "No record.id" });

    const oldFirst = String(o.first_name ?? "");
    const oldLast = String(o.last_name ?? "");

    const nameNowPresent = hasName(firstName, lastName);
    const nameWasEmptyBefore = !hasName(oldFirst, oldLast);

    // ✅ Only send once: when it transitions from "no name" -> "has name"
    if (!nameNowPresent) {
      return json({ ok: true, skipped: true, reason: "Name still not set" });
    }

    if (!nameWasEmptyBefore) {
      return json({ ok: true, skipped: true, reason: "Name already existed (avoid duplicate)" });
    }

    const subject = `New myABA user completed profile${email ? `: ${email}` : ""}`;

    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
        <h2>New user completed profile</h2>
        <p><b>Email:</b> ${esc(email || "(missing)")}</p>
        <p><b>Name:</b> ${esc(`${firstName} ${lastName}`.trim())}</p>
        <p><b>User ID:</b> ${esc(userId)}</p>
        <p><b>Created:</b> ${esc(createdAt || "(missing)")}</p>
        <hr/>
        <p style="color:#666;font-size:12px">
          Triggered by public.profiles UPDATE when first/last name transitioned from empty to set.
        </p>
      </div>
    `;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_NOTIFY_EMAIL],
        subject,
        html,
      }),
    });

    const bodyText = await resp.text();

    if (!resp.ok) {
      console.error("[notify-new-user] Resend error:", resp.status, bodyText);
      return json(
        { ok: false, error: "Resend failed", status: resp.status, details: bodyText },
        500
      );
    }

    let out: any = null;
    try {
      out = JSON.parse(bodyText);
    } catch {
      out = { raw: bodyText };
    }

    console.log("[notify-new-user] sent OK", { to: ADMIN_NOTIFY_EMAIL, email, userId });

    return json({ ok: true, sent: true, resend: out });
  } catch (e: any) {
    console.error("notify-new-user error:", e);
    return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
  }
});

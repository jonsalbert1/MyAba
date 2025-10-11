// after writing localStorage for cards
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    await fetch("/api/cards/bulk-upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items), // items = [{ term, def }]
    });
  } catch {}
}

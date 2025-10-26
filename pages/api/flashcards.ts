export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, route: "flashcards GET" });
  }
  if (req.method === "POST") {
    return res.status(201).json({ ok: true, route: "flashcards POST", body: req.body });
  }
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.



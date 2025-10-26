// lib/api-helpers.ts
import type { NextApiResponse } from "next";

export function json<T>(res: NextApiResponse<T>, status: number, data: T) {
  res.status(status).json(data);
}

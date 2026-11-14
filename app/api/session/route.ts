import { createHash, randomBytes } from "node:crypto";
import { db } from "@/src/lib/db";

import { tokenHash } from "@/src/lib/game-token";

export async function POST() {
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  try {
    await db.query("INSERT INTO app.game_sessions (token_hash, expires_at) VALUES ($1, 'infinity')", [hash]);
    return Response.json({ token }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to create game:", error);
    return Response.json({ error: "GAME_CREATE_FAILED" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const hash = tokenHash(request);
  if (!hash) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const session = await db.query("SELECT id, status FROM app.game_sessions WHERE token_hash = $1", [hash]);
    if (!session.rows[0] || session.rows[0].status === "abandoned") return Response.json({ error: "GAME_NOT_FOUND" }, { status: 404 });
    const rounds = await db.query(`SELECT r.round_number, r.answered_at, r.guessed_timestamp_seconds,
      r.actual_timestamp_seconds, r.score, f.frame_id, f.frame_public_key, f.imdb_tconst, f.title,
      f.year, f.runtime_seconds, f.image_width, f.image_height
      FROM app.session_rounds r LEFT JOIN app.v_frames_ready f ON f.frame_id = r.frame_id
      WHERE r.session_id = $1 ORDER BY r.round_number`, [session.rows[0].id]);
    const current = rounds.rows.at(-1);
    if (current && !current.frame_id) return Response.json({ error: "FRAME_UNAVAILABLE" }, { status: 409 });
    const score = rounds.rows.reduce((sum, row) => sum + (row.score ?? 0), 0);
    return Response.json({ status: session.rows[0].status, totalScore: score, round: current ? {
      roundNumber: current.round_number, guessedTimestampSeconds: current.guessed_timestamp_seconds, frameId: Number(current.frame_id), framePublicKey: current.frame_public_key,
      imdbTconst: current.imdb_tconst, title: current.title, year: current.year, runtimeSeconds: current.runtime_seconds,
      frameImage: `/api/frame-image/${current.frame_public_key}`, imageWidth: current.image_width, imageHeight: current.image_height,
      result: current.answered_at ? { actualTimestampSeconds: current.actual_timestamp_seconds,
        differenceSeconds: Math.abs(current.guessed_timestamp_seconds - current.actual_timestamp_seconds), score: current.score } : null
    } : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to restore game:", error);
    return Response.json({ error: "GAME_LOAD_FAILED" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const hash = tokenHash(request);
  if (!hash) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const result = await db.query("UPDATE app.game_sessions SET status = CASE WHEN status = 'active' THEN 'abandoned' ELSE status END WHERE token_hash = $1 RETURNING id", [hash]);
    return result.rowCount ? new Response(null, { status: 204 }) : Response.json({ error: "GAME_NOT_FOUND" }, { status: 404 });
  } catch (error) {
    console.error("Failed to end game:", error);
    return Response.json({ error: "GAME_END_FAILED" }, { status: 500 });
  }
}


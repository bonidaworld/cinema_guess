import { calculateScore } from "@/lib/scoring";
import { db } from "@/src/lib/db";
import { tokenHash } from "@/src/lib/game-token";

export async function POST(request: Request) {
  const hash = tokenHash(request);
  if (!hash) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  let body: { roundNumber?: number; guessedTimestampSeconds?: number };
  try { body = await request.json(); } catch { return Response.json({ error: "INVALID_JSON" }, { status: 400 }); }
  if (!body || !Number.isInteger(body.roundNumber) || !Number.isSafeInteger(body.guessedTimestampSeconds) || body.guessedTimestampSeconds! < 0) return Response.json({ error: "INVALID_GUESS" }, { status: 400 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const session = await client.query("SELECT id, status FROM app.game_sessions WHERE token_hash = $1 FOR UPDATE", [hash]);
    if (!session.rows[0]) { await client.query("ROLLBACK"); return Response.json({ error: "GAME_NOT_FOUND" }, { status: 404 }); }
    const result = await client.query(`SELECT r.*, f.frame_timestamp_seconds, f.runtime_seconds AS current_runtime
      FROM app.session_rounds r LEFT JOIN app.v_frames_ready f ON f.frame_id = r.frame_id
      WHERE r.session_id = $1 AND r.round_number = $2`, [session.rows[0].id, body.roundNumber]);
    const round = result.rows[0];
    if (!round) { await client.query("ROLLBACK"); return Response.json({ error: "ROUND_NOT_FOUND" }, { status: 404 }); }
    if (round.answered_at) { await client.query("COMMIT"); return Response.json({ actualTimestampSeconds: round.actual_timestamp_seconds, differenceSeconds: Math.abs(round.guessed_timestamp_seconds - round.actual_timestamp_seconds), score: round.score }); }
    if (session.rows[0].status !== "active") { await client.query("ROLLBACK"); return Response.json({ error: "GAME_NOT_ACTIVE" }, { status: 409 }); }
    if (round.frame_timestamp_seconds === null || round.current_runtime === null) { await client.query("ROLLBACK"); return Response.json({ error: "FRAME_UNAVAILABLE" }, { status: 409 }); }
    const guessed = body.guessedTimestampSeconds!;
    const actual = round.frame_timestamp_seconds;
    const runtime = round.current_runtime;
    if (runtime <= 0 || guessed > runtime) { await client.query("ROLLBACK"); return Response.json({ error: "INVALID_GUESS" }, { status: 400 }); }
    const score = calculateScore(guessed / runtime, actual / runtime);
    await client.query("UPDATE app.session_rounds SET guessed_timestamp_seconds=$1, actual_timestamp_seconds=$2, runtime_seconds=$3, score=$4, answered_at=now() WHERE id=$5", [guessed, actual, runtime, score, round.id]);
    if (round.round_number === 5) await client.query("UPDATE app.game_sessions SET status='finished' WHERE id=$1", [session.rows[0].id]);
    await client.query("COMMIT");
    return Response.json({ actualTimestampSeconds: actual, differenceSeconds: Math.abs(guessed - actual), score });
  } catch (error) {
    await client.query("ROLLBACK"); console.error("Failed to check guess:", error);
    return Response.json({ error: "GUESS_FAILED" }, { status: 500 });
  } finally { client.release(); }
}


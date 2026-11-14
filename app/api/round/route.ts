import { db } from "@/src/lib/db";
import { tokenHash } from "@/src/lib/game-token";

export async function POST(request: Request) {
  const hash = tokenHash(request);
  if (!hash) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const session = await client.query("SELECT id, status FROM app.game_sessions WHERE token_hash = $1 FOR UPDATE", [hash]);
    if (!session.rows[0] || session.rows[0].status !== "active") { await client.query("ROLLBACK"); return Response.json({ error: "GAME_NOT_ACTIVE" }, { status: 409 }); }
    const id = session.rows[0].id;
    const previous = await client.query("SELECT round_number, answered_at FROM app.session_rounds WHERE session_id = $1 ORDER BY round_number DESC LIMIT 1", [id]);
    if (previous.rows[0] && (!previous.rows[0].answered_at || previous.rows[0].round_number >= 5)) { await client.query("ROLLBACK"); return Response.json({ error: "ROUND_NOT_AVAILABLE" }, { status: 409 }); }
    const frame = await client.query(`SELECT frame_id, frame_public_key, imdb_tconst, title, year, runtime_seconds, image_width, image_height
      FROM app.v_frames_ready f WHERE f.runtime_seconds > 0 AND NOT EXISTS
      (SELECT 1 FROM app.session_rounds r WHERE r.session_id = $1 AND r.frame_id = f.frame_id) ORDER BY random() LIMIT 1`, [id]);
    const f = frame.rows[0];
    if (!f) { await client.query("ROLLBACK"); return Response.json({ error: "NO_FRAMES_AVAILABLE" }, { status: 409 }); }
    const roundNumber = (previous.rows[0]?.round_number ?? 0) + 1;
    await client.query("INSERT INTO app.session_rounds (session_id, round_number, frame_id) VALUES ($1, $2, $3)", [id, roundNumber, f.frame_id]);
    await client.query("COMMIT");
    return Response.json({ roundNumber, frameId: Number(f.frame_id), framePublicKey: f.frame_public_key, imdbTconst: f.imdb_tconst, title: f.title, year: f.year, runtimeSeconds: f.runtime_seconds, frameImage: `/api/frame-image/${f.frame_public_key}`, imageWidth: f.image_width, imageHeight: f.image_height }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await client.query("ROLLBACK"); console.error("Failed to create round:", error);
    return Response.json({ error: "ROUND_CREATE_FAILED" }, { status: 500 });
  } finally { client.release(); }
}


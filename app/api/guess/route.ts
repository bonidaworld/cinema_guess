import { calculateScore } from "@/lib/scoring";
import { db } from "@/src/lib/db";

type GuessRequest = {
  frameId: number;
  guessedTimestampSeconds: number;
};

type ReadyFrameAnswerRow = {
  frame_timestamp_seconds: number;
  runtime_seconds: number;
};

// This route checks the guess on the server, where the answer stays hidden.
export async function POST(request: Request) {
  let body: Partial<GuessRequest> | null;

  try {
    body = (await request.json()) as Partial<GuessRequest> | null;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !body ||
    !Number.isSafeInteger(body.frameId) ||
    typeof body.guessedTimestampSeconds !== "number" ||
    !Number.isFinite(body.guessedTimestampSeconds) ||
    body.guessedTimestampSeconds < 0
  ) {
    return Response.json(
      {
        error:
          "frameId and a non-negative guessedTimestampSeconds are required",
      },
      { status: 400 },
    );
  }

  try {
    const result = await db.query<ReadyFrameAnswerRow>(
      `
        SELECT
          frame_timestamp_seconds,
          runtime_seconds
        FROM app.v_frames_ready
        WHERE frame_id = $1
        LIMIT 1
      `,
      [body.frameId],
    );

    const frame = result.rows[0];

    if (!frame) {
      return Response.json({ error: "Frame not found" }, { status: 404 });
    }

    if (
      frame.runtime_seconds <= 0 ||
      body.guessedTimestampSeconds > frame.runtime_seconds
    ) {
      return Response.json(
        { error: "Guess must be within the movie runtime" },
        { status: 400 },
      );
    }

    const actualTimestampSeconds = frame.frame_timestamp_seconds;
    const differenceSeconds = Math.abs(
      body.guessedTimestampSeconds - actualTimestampSeconds,
    );
    const guess = body.guessedTimestampSeconds / frame.runtime_seconds;
    const actualPosition =
      actualTimestampSeconds / frame.runtime_seconds;
    const score = calculateScore(guess, actualPosition);

    return Response.json({
      actualTimestampSeconds,
      differenceSeconds,
      score,
    });
  } catch (error) {
    console.error("Failed to check guess:", error);

    return Response.json(
      { error: "Failed to check guess" },
      { status: 500 },
    );
  }
}

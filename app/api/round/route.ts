import { db } from "@/src/lib/db";

export const dynamic = "force-dynamic";

type ReadyFrameRow = {
  frame_id: string;
  frame_public_key: string;
  imdb_tconst: string | null;
  title: string;
  year: number;
  runtime_seconds: number;
  image_width: number;
  image_height: number;
};

// This route runs on the server and never selects the correct timestamp.
export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const excludedFrameIds = searchParams
    .getAll("exclude")
    .filter((frameId) => /^\d+$/.test(frameId));

  try {
    const result = await db.query<ReadyFrameRow>(
      `
        SELECT
          frame_id,
          frame_public_key,
          imdb_tconst,
          title,
          year,
          runtime_seconds,
          image_width,
          image_height
        FROM app.v_frames_ready
        WHERE NOT (frame_id = ANY($1::bigint[]))
        ORDER BY random()
        LIMIT 1
      `,
      [excludedFrameIds],
    );

    const frame = result.rows[0];

    if (!frame) {
      return Response.json(
        { error: "No unused frames available" },
        { status: 409 },
      );
    }

    return Response.json(
      {
        frameId: Number(frame.frame_id),
        framePublicKey: frame.frame_public_key,
        imdbTconst: frame.imdb_tconst,
        title: frame.title,
        year: frame.year,
        runtimeSeconds: frame.runtime_seconds,
        frameImage: `/api/frame-image/${frame.frame_public_key}`,
        imageWidth: frame.image_width,
        imageHeight: frame.image_height,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load a random frame:", error);

    return Response.json(
      { error: "Failed to load a random frame" },
      { status: 500 },
    );
  }
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FrameImageRow = {
  frame_image: string;
  image_mime_type: string | null;
};

// The browser receives image bytes, never the absolute filesystem path.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ framePublicKey: string }> },
) {
  const { framePublicKey } = await params;
  const framesWebpDir = process.env.FRAMES_WEBP_DIR;

  if (!/^cg_[a-f0-9]{16}$/.test(framePublicKey)) {
    return Response.json({ error: "Invalid frame key" }, { status: 400 });
  }

  if (!framesWebpDir) {
    return Response.json(
      { error: "FRAMES_WEBP_DIR is not defined" },
      { status: 500 },
    );
  }

  try {
    const result = await db.query<FrameImageRow>(
      `
        SELECT
          frame_image,
          image_mime_type
        FROM app.v_frames_ready
        WHERE frame_public_key = $1
        LIMIT 1
      `,
      [framePublicKey],
    );

    const frame = result.rows[0];

    if (!frame) {
      return Response.json({ error: "Frame image not found" }, { status: 404 });
    }

    const imagesRoot = path.resolve(framesWebpDir);
    const imagePath = path.isAbsolute(frame.frame_image)
      ? path.resolve(frame.frame_image)
      : path.resolve(imagesRoot, frame.frame_image);
    const relativeImagePath = path.relative(imagesRoot, imagePath);

    if (
      relativeImagePath === ".." ||
      relativeImagePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeImagePath)
    ) {
      return Response.json(
        { error: "Frame image path is outside FRAMES_WEBP_DIR" },
        { status: 500 },
      );
    }

    const image = await readFile(imagePath);

    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": frame.image_mime_type ?? "image/webp",
        "Content-Length": image.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Failed to load frame image:", error);

    return Response.json(
      { error: "Failed to load frame image" },
      { status: 500 },
    );
  }
}

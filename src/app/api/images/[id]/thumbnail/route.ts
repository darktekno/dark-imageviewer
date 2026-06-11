import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const CACHE_DIR = path.join(process.cwd(), "data", "thumbnails");

function getCachePath(id: string, w: number): string {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  return path.join(CACHE_DIR, `${id}_${w}.webp`);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(_req.url);
  const w = Math.min(Math.max(parseInt(url.searchParams.get("w") || "300") || 300, 50), 1200);

  // Try cache
  const cachePath = getCachePath(id, w);
  if (fs.existsSync(cachePath)) {
    const buf = fs.readFileSync(cachePath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const db = getDb();
  const image = db.prepare("SELECT stored_path FROM images WHERE id = ?").get(id) as { stored_path: string } | undefined;
  if (!image) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = image.stored_path;
  if (!fs.existsSync(filePath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  try {
    const buffer = await sharp(filePath)
      .resize(w, undefined, { withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 80 })
      .toBuffer();

    // Write to cache (async, don't wait)
    fs.writeFile(cachePath, buffer, () => {});

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Processing error", { status: 500 });
  }
}

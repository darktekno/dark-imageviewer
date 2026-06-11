import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");
  const sort = searchParams.get("sort") || "name";
  const search = searchParams.get("search") || "";
  const username = searchParams.get("username") || "";
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), 200);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);
  const favoritesOnly = searchParams.get("favorites") === "true";

  if (!folderId) {
    return NextResponse.json({ error: "folderId required" }, { status: 400 });
  }

  const db = getDb();

  let orderClause = "ORDER BY filename";
  if (sort === "date") orderClause = "ORDER BY created_at DESC";
  else if (sort === "date_asc") orderClause = "ORDER BY created_at ASC";
  else if (sort === "size") orderClause = "ORDER BY size DESC";
  else if (sort === "size_asc") orderClause = "ORDER BY size ASC";
  else if (sort === "random") orderClause = "ORDER BY RANDOM()";

  let whereClause = "folder_id = ?";
  const params: (string | number)[] = [folderId];

  if (search) {
    whereClause += " AND filename LIKE ?";
    params.push(`%${search}%`);
  }

  if (favoritesOnly && username) {
    whereClause += " AND id IN (SELECT image_id FROM favorites WHERE username = ?)";
    params.push(username);
  }

  const countRow = db.prepare(
    `SELECT COUNT(*) as count FROM images WHERE ${whereClause}`
  ).get(...params) as { count: number };

  const images = db.prepare(
    `SELECT id, filename, stored_path, size, width, height, created_at FROM images WHERE ${whereClause} ${orderClause} LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as Array<{
    id: string;
    filename: string;
    stored_path: string;
    size: number;
    width: number;
    height: number;
    created_at: string;
  }>;

  let favoriteIds = new Set<string>();
  if (username) {
    const favRows = db.prepare("SELECT image_id FROM favorites WHERE username = ?").all(username) as { image_id: string }[];
    favoriteIds = new Set(favRows.map((r) => r.image_id));
  }

  const result = images.map((img) => ({
    id: img.id,
    filename: img.filename,
    stored_path: img.stored_path,
    size: img.size,
    width: img.width,
    height: img.height,
    created_at: img.created_at,
    favorited: favoriteIds.has(img.id),
  }));

  return NextResponse.json({ images: result, total: countRow.count });
}

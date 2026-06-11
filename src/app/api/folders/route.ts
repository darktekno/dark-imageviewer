import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const db = getDb();
  const folders = db.prepare(
    "SELECT id, name, image_count, created_at FROM folders WHERE username = ? ORDER BY created_at DESC"
  ).all(username);

  return NextResponse.json(folders);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");

  if (!folderId) {
    return NextResponse.json({ error: "folderId required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("DELETE FROM images WHERE folder_id = ?").run(folderId);
  db.prepare("DELETE FROM folders WHERE id = ?").run(folderId);

  return NextResponse.json({ success: true });
}

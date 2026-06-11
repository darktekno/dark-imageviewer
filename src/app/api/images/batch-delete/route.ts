import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { ids, folderId } = await req.json();
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  const db = getDb();
  const deleteStmt = db.prepare("DELETE FROM images WHERE id = ?");

  for (const id of ids) {
    deleteStmt.run(id);
  }

  if (folderId) {
    const count = db.prepare("SELECT COUNT(*) as c FROM images WHERE folder_id = ?").get(folderId) as { c: number };
    db.prepare("UPDATE folders SET image_count = ? WHERE id = ?").run(count.c, folderId);
  }

  return NextResponse.json({ deleted: ids.length });
}
